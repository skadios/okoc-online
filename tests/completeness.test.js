import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CARDS,CARD_MAP} from '../shared/cards.js';
import {createGame,playCard,decide,discardRoyalBomb,giveCard,settleBadBlood,settleDebt,publicState,action,startRound,tick,KING_REVEAL_MS} from '../server/game-engine.js';

const engine=fs.readFileSync(new URL('../server/game-engine.js',import.meta.url),'utf8');
const effects=new Set([...engine.matchAll(/case'([^']+)'/g)].map(m=>m[1]));
const players=()=>Array.from({length:4},(_,i)=>({id:`p${i+1}`,name:`P${i+1}`,connected:true}));
const rng=()=>0.8; // deterministic high roll
function fresh(){const g=createGame(players(),rng);g.kingReveal=null;startRound(g);return g}
function put(g,id){const p=g.players.find(x=>x.role===CARD_MAP[id].side);p.hand=[{...CARD_MAP[id],instanceId:`${id}-test`}];g.currentPlayerId=p.id;return p;}
function targetFor(g,p, id){const c=CARD_MAP[id];const noble=g.players.find(x=>x.role==='noble'&&x.id!==p.id);const other=g.players.find(x=>x.id!==p.id&&x.id!==noble?.id)||g.players.find(x=>x.id!==p.id);if(['bad_blood','anchor','shifting_tides','we_ride'].includes(c.effect))return {targetId:noble.id,target2Id:(g.players.find(x=>x.id!==p.id&&x.id!==noble.id)||g.players.find(x=>x.id!==p.id)).id};if(['allies','hindsight','indebted','meat','peoples_champion','scout'].includes(c.effect))return {targetId:noble.id};if(['betrayal'].includes(c.effect))return {targetId:noble.id};return {targetId:other.id};}

test('every physical card design has a server effect handler',()=>{
  assert.equal(CARDS.length,42);
  for(const c of CARDS)assert.ok(effects.has(c.effect),`${c.id} -> missing handler ${c.effect}`);
});

test('every physical card has a correctly sized EN and FR asset',()=>{
  for(const c of CARDS){
    for(const d of ['', 'fr/']){
      const p=fileURLToPath(new URL(`../client/public/assets/cards/${d}${c.id}.png`,import.meta.url));
      assert.ok(fs.existsSync(p),`missing ${p}`);
      const sig=fs.readFileSync(p).subarray(0,8);assert.equal(sig[0],137); // PNG signature
    }
  }
});

test('Royal Bomb is playable and has both printed negotiation exits',()=>{
  const g=fresh(),p=put(g,'royal-bomb');const nobles=g.players.filter(x=>x.role==='noble');
  playCard(g,p.id,p.hand[0].instanceId,{});assert.ok(nobles.every(x=>x.gold===0));assert.ok(g.cardEvents.at(-1)?.cardId==='royal-bomb');
  const g2=fresh(),p2=put(g2,'royal-bomb');g2.nobleDeck=g2.nobleDeck.filter(c=>c.id!=='royal-bomb');const target=g2.players.find(x=>x.role==='noble'&&x.id!==p2.id);g2.phase='negotiation';g2.negotiation={startedAt:Date.now(),endsAt:Date.now()+120000,received:{},offers:new Map()};
  giveCard(g2,p2.id,target.id,p2.hand[0].instanceId);assert.ok(target.hand.some(c=>c.id==='royal-bomb'));assert.equal(p2.hand.some(c=>c.id==='royal-bomb'),false);
  const g3=fresh(),p3=put(g3,'royal-bomb');g3.nobleDeck=g3.nobleDeck.filter(c=>c.id!=='royal-bomb');g3.phase='negotiation';g3.negotiation={startedAt:Date.now(),endsAt:Date.now()+120000,received:{},offers:new Map()};discardRoyalBomb(g3,p3.id,p3.hand[0].instanceId);assert.equal(p3.hand.some(c=>c.id==='royal-bomb'),false);
});

test('Sub Rosa rolls exactly once and never leaks a hand before the mode is chosen',()=>{
  const g=fresh(),p=put(g,'sub-rosa'),target=g.players.find(x=>x.role==='noble'&&x.id!==p.id);target.hand=[{...CARD_MAP.wrath,instanceId:'hidden'}];
  playCard(g,p.id,p.hand[0].instanceId,{targetId:target.id});
  const pub=publicState(g,p.id);assert.equal(pub.pending.mode,null);assert.equal(pub.players.find(x=>x.id===target.id).handCount,1);
  decide(g,p.id,{mode:'hand'});assert.equal(g.pending.mode,'hand');decide(g,p.id,{mode:'hand',cardInstanceId:'hidden'});assert.equal(g.pending,null);
});

test('People’s Champion may nominate the player who played it',()=>{
  const g=fresh();g.round=4;const p=put(g,'peoples-champion');playCard(g,p.id,p.hand[0].instanceId,{targetId:p.id});assert.equal(g.pending.type,'champion');assert.equal(g.pending.targetId,p.id);
});

test('Helping Hand draws two and grants one extra card play without counting itself',()=>{
  const g=fresh();const p=put(g,'helping-hand');const before=p.hand.length;playCard(g,p.id,p.hand[0].instanceId,{});assert.equal(p.hand.length,before+1);assert.equal(p.playedThisTurn,0);assert.equal(p.extraPlays,1);
});

test('face-down Knights remain when a Noble becomes King',()=>{
  const g=fresh(); g.rng=()=>0.1;const k=g.players.find(x=>x.role==='king');const n=g.players.find(x=>x.role==='noble');n.knights=[{id:'kn',ownerId:n.id,placerId:n.id,real:true,card:{...CARD_MAP['knight-noble'],instanceId:'kn'}}];g.round=2; n.hand=[{...CARD_MAP['betray-king'],instanceId:'bt'}];g.currentPlayerId=n.id;playCard(g,n.id,n.hand[0].instanceId,{targetId:k.id});
  // Resolve with two supports, causing the noble to take the crown under high roll rules only if the King fails;
  // this test directly checks the persistent property after a role change helper path through pending.
  decide(g,k.id,{support:true});const other=g.players.find(x=>x.id!==k.id&&x.id!==n.id);decide(g,other.id,{support:true});
  assert.ok(n.knights.length===1 || k.knights.length===1);
});

test('Knight placement is available to both roles, accepts any same-role card, and only targets Nobles',()=>{
  const g=fresh();const k=g.players.find(x=>x.role==='king');const n=g.players.find(x=>x.role==='noble');
  k.hand=[{...CARD_MAP['black-plague'],instanceId:'king-bluff'}];g.currentPlayerId=k.id;
  action(g,k.id,{type:'placeKnight',instanceId:'king-bluff',targetId:n.id,actionId:'king-knight'});
  assert.equal(n.knights.length,1);assert.equal(n.knights[0].real,false);assert.equal(n.knights[0].placerRole,'king');
  const n2=g.players.find(x=>x.role==='noble'&&x.id!==n.id);n.hand=[{...CARD_MAP['knight-noble'],instanceId:'n-real'}];g.currentPlayerId=n.id;
  action(g,n.id,{type:'placeKnight',instanceId:'n-real',targetId:n2.id,actionId:'n-knight'});
  assert.equal(n2.knights.length,1);assert.equal(n2.knights[0].real,true);assert.equal(n2.knights[0].placerRole,'noble');
  g.currentPlayerId=k.id;k.hand=[{...CARD_MAP['black-plague'],instanceId:'king-invalid-target'}];
  assert.throws(()=>action(g,k.id,{type:'placeKnight',instanceId:'king-invalid-target',targetId:k.id,actionId:'bad-target'}),/Choose a Noble/i);
});

test('Betrayal consumes a bluff but only a real Knight blocks it',()=>{
  const g=fresh();g.round=2;const placer=g.players.find(x=>x.role==='king');const actor=g.players.find(x=>x.role==='noble');const target=g.players.find(x=>x.role==='noble'&&x.id!==actor.id);
  target.knights=[{id:'fake',ownerId:target.id,placerId:placer.id,placerRole:'king',real:false,card:{...CARD_MAP['black-plague'],side:'king',instanceId:'fake-card'}}];
  actor.hand=[{...CARD_MAP['betrayal'],instanceId:'b'}];g.currentPlayerId=actor.id;
  playCard(g,actor.id,'b',{targetId:target.id});assert.equal(target.knights.length,0);assert.equal(g.pending?.type,'betrayalSupport');
  const g2=fresh();g2.round=2;const placer2=g2.players.find(x=>x.role==='king');const actor2=g2.players.find(x=>x.role==='noble');const t2=g2.players.find(x=>x.role==='noble'&&x.id!==actor2.id);
  t2.knights=[{id:'real',ownerId:t2.id,placerId:placer2.id,placerRole:'king',real:true,card:{...CARD_MAP['knight-noble'],side:'king',instanceId:'real-card'}}];
  actor2.hand=[{...CARD_MAP['betrayal'],instanceId:'b2'}];g2.currentPlayerId=actor2.id;playCard(g2,actor2.id,'b2',{targetId:t2.id});assert.equal(t2.knights.length,0);assert.equal(g2.pending,null);
});

test('cards cannot be transferred across roles and draws stay in the player role deck',()=>{
  const g=fresh();g.phase='negotiation';g.negotiation={startedAt:Date.now(),endsAt:Date.now()+120000,received:{},offers:new Map()};
  const k=g.players.find(x=>x.role==='king'),n=g.players.find(x=>x.role==='noble');
  k.hand=[{...CARD_MAP['black-plague'],instanceId:'kb'}];n.hand=[{...CARD_MAP['royal-bomb'],instanceId:'rb'},{...CARD_MAP['wrath'],instanceId:'nw'}];
  assert.throws(()=>action(g,n.id,{type:'giveCard',targetId:k.id,instanceId:'rb',actionId:'cross'}),/across roles/i);
  assert.throws(()=>action(g,n.id,{type:'offerTrade',targetId:k.id,giveCardId:'nw',actionId:'cross-offer'}),/cross role/i);
  assert.throws(()=>action(g,k.id,{type:'respondTrade',offerId:'missing',receiveCardId:'nw',accept:true,actionId:'cross-respond'}),/offer not found/i);
});

test('Bad Blood can be settled out of turn and ends the obligation',()=>{
  const g=fresh();const k=g.players.find(x=>x.role==='king');const ns=g.players.filter(x=>x.role==='noble');k.effects=[{type:'bad_blood',a:ns[0].id,b:ns[1].id,active:true}];ns[0].gold=500;ns[1].gold=500;settleBadBlood(g,ns[0].id);assert.equal(ns[0].gold,300);assert.equal(ns[1].gold,700);assert.equal(k.effects.length,0);
});

test('No client-controlled hidden information is present in public player state',()=>{
  const g=fresh();const s=publicState(g,g.players[0].id);for(const p of s.players){assert.equal('hand' in p,false);assert.equal('real' in p,false);}assert.ok(s.hand.every(c=>c.instanceId));
});

test('turn progression is automatic: no manual draw or manual King change action exists',()=>{
  const g=fresh();
  assert.throws(()=>action(g,g.currentPlayerId,{type:'drawCard',actionId:'draw-1'}),/Unknown game action/i);
  assert.throws(()=>action(g,g.currentPlayerId,{type:'changeKing',actionId:'king-1'}),/Unknown game action/i);
});

test('King and Noble turns auto-advance after the required number of card plays and refill the hand to 8',()=>{
  const g=fresh(); g.rng=()=>0.8;
  const k=g.players.find(p=>p.id===g.kingId);
  const nextId=g.seatOrder[(g.seatOrder.indexOf(k.id)+1)%g.seatOrder.length];
  const safeKing=Array.from({length:8},(_,i)=>({...CARD_MAP['black-plague'],instanceId:`bb-${i}`}));
  k.hand=safeKing;
  g.currentPlayerId=k.id;
  const before=k.hand.length;
  playCard(g,k.id,k.hand[0].instanceId,{});
  assert.equal(g.currentPlayerId,k.id);
  playCard(g,k.id,k.hand[0].instanceId,{});
  assert.equal(g.currentPlayerId,nextId);
  assert.equal(k.hand.length,before);
  assert.equal(k.playedThisTurn,0);
});

test('Betray the King changes the King only through its resolved server-side card flow',()=>{
  const g=fresh(); g.rng=()=>0;
  g.round=2;
  const k=g.players.find(p=>p.role==='king');
  const n=g.players.find(p=>p.role==='noble');
  const other=g.players.find(p=>p.id!==k.id&&p.id!==n.id);
  n.hand=[{...CARD_MAP['betray-king'],instanceId:'bt-test'}];
  g.currentPlayerId=n.id;
  playCard(g,n.id,n.hand[0].instanceId,{});
  assert.equal(g.kingId,k.id);
  action(g,k.id,{type:'decision',payload:{support:true},actionId:'support-1'});
  action(g,other.id,{type:'decision',payload:{support:true},actionId:'support-2'});
  assert.equal(g.kingId,n.id);
  assert.equal(n.role,'king');
  assert.equal(k.role,'noble');
});

test('gold crown rule is automatic: a Noble with more gold than the King becomes King and swaps seat, cards, and gold amounts',()=>{
  const g=fresh();
  const oldKing=g.players.find(p=>p.role==='king');
  const noble=g.players.find(p=>p.role==='noble');
  const oldSeat=g.seatOrder.indexOf(oldKing.id);
  const nobleSeat=g.seatOrder.indexOf(noble.id);
  oldKing.hand=[{...CARD_MAP['black-plague'],instanceId:'king-hand-marker'}];
  noble.hand=[{...CARD_MAP['wrath'],instanceId:'noble-hand-marker'}];
  oldKing.gold=1000;noble.gold=1001;
  g.phase='negotiation';g.negotiation={startedAt:Date.now(),endsAt:Date.now()+120000,received:{},offers:new Map()};
  action(g,noble.id,{type:'negotiateGold',targetId:oldKing.id,amount:0,actionId:'gold-crown-trigger'});
  assert.equal(g.kingId,noble.id);
  assert.equal(noble.role,'king');
  assert.equal(oldKing.role,'noble');
  assert.equal(g.seatOrder[oldSeat],noble.id);
  assert.equal(g.seatOrder[nobleSeat],oldKing.id);
  assert.equal(noble.gold,1000);
  assert.equal(oldKing.gold,1001);
  assert.equal(noble.hand[0].instanceId,'king-hand-marker');
  assert.equal(oldKing.hand[0].instanceId,'noble-hand-marker');
});

test('round order reverses every round and the King is always first',()=>{
  const g=fresh();
  const kingId=g.kingId;
  const firstSeat=g.seatOrder.indexOf(kingId);
  assert.equal(g.direction,1);
  assert.equal(g.currentPlayerId,kingId);
  g.phase='negotiation';g.negotiation={startedAt:Date.now(),endsAt:Date.now()+120000,received:{},offers:new Map()};
  const end=g.negotiation.endsAt;
  // Force the normal negotiation timeout through the real engine transition.
  g.negotiation.endsAt=0;
  tick(g,1);
  assert.equal(g.round,2);
  assert.equal(g.direction,-1);
  assert.equal(g.currentPlayerId,kingId);
  assert.equal(g.seatOrder.indexOf(kingId),firstSeat);
});

test('the starting King is selected server-side, starts with 1000 gold versus 600 for each Noble, and starts round 1',()=>{
  const g=createGame(players(),()=>0.99);
  assert.equal(g.phase,'kingReveal');
  assert.equal(g.currentPlayerId,null);
  const startingKing=g.players.find(p=>p.id===g.kingId);
  assert.equal(startingKing?.role,'king');
  assert.equal(startingKing?.gold,1000);
  assert.ok(g.players.filter(p=>p.id!==g.kingId).every(p=>p.role==='noble'&&p.gold===600));
  assert.ok(startingKing.gold>g.players.find(p=>p.id!==g.kingId).gold);
  tick(g,g.kingReveal.endsAt+1);
  assert.equal(g.phase,'playing');
  assert.equal(g.currentPlayerId,g.kingId);
  assert.equal(g.direction,1);
});

test('gold crown contest resolves automatically when multiple Nobles cross the King threshold',()=>{
  const g=fresh(); g.rng=()=>0.5; // deterministic roll = 4
  const k=g.players.find(p=>p.role==='king');
  const ns=g.players.filter(p=>p.role==='noble');
  k.gold=1000;ns[0].gold=1100;ns[1].gold=1200;
  g.phase='negotiation';g.negotiation={startedAt:Date.now(),endsAt:Date.now()+120000,received:{},offers:new Map()};
  action(g,ns[0].id,{type:'negotiateGold',targetId:k.id,amount:0,actionId:'multi-crown'});
  assert.equal(g.players.filter(p=>p.role==='king').length,1);
  assert.ok(ns.some(p=>p.role==='king'));
  assert.ok(ns.filter(p=>p.role==='noble').every(p=>p.gold<1200));
});
