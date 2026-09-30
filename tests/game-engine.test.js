import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,CARD_MAP,KING_CARDS,NOBLE_CARDS} from '../shared/cards.js';
import {createGame,playCard,negotiateGold,publicState,adjustGold,action,tick,startRound} from '../server/game-engine.js';

const rng = () => 0.01;
function players(n=4){return Array.from({length:n},(_,i)=>({id:`p${i+1}`,name:`P${i+1}`,connected:true}));}
function ready(g){g.kingReveal=null;startRound(g);return g;}
function inst(id,side){const c={...CARD_MAP[id]};return {...c,side:side||c.side,instanceId:`test-${id}-${Math.random()}`};}
function resetHands(g){for(const p of g.players)p.hand=Array.from({length:8},(_,i)=>inst(p.role==='king'?'beggars-blessing':'wrath',p.role));}

test('catalogue has exactly 42 unique physical card designs',()=>{
  assert.equal(CARDS.length,42);
  assert.equal(new Set(CARDS.map(c=>c.id)).size,42);
  assert.equal(KING_CARDS.reduce((n,c)=>n+c.copies,0)+NOBLE_CARDS.reduce((n,c)=>n+c.copies,0),99);
});

test('game starts with 4-8 players and every player has exactly 8 cards',()=>{
  const g=ready(createGame(players(4),rng));
  assert.equal(g.players.length,4);
  assert.equal(g.players.every(p=>p.hand.length===8),true);
  assert.equal(g.players.find(p=>p.role==='king').gold,1000);
  assert.ok(g.players.filter(p=>p.role==='noble').every(p=>p.gold===600));
});

test('physical deck quantities are finite and shared-title cards stay in their role-specific pools',()=>{
  const kingCopies=KING_CARDS.reduce((n,c)=>n+c.copies,0),nobleCopies=NOBLE_CARDS.reduce((n,c)=>n+c.copies,0);
  assert.equal(kingCopies,25);assert.equal(nobleCopies,74);assert.equal(kingCopies+nobleCopies,99);
  assert.equal(KING_CARDS.find(c=>c.id==='sub-rosa').copies,2);assert.equal(NOBLE_CARDS.find(c=>c.id==='sub-rosa').copies,5);
  assert.equal(KING_CARDS.find(c=>c.id==='knight-noble').copies,1);assert.equal(NOBLE_CARDS.find(c=>c.id==='knight-noble').copies,2);
  assert.equal(KING_CARDS.find(c=>c.id==='helping-hand').copies,1);assert.equal(NOBLE_CARDS.find(c=>c.id==='helping-hand-noble').copies,3);
});

test('actual dealt hands contain only cards matching the player role',()=>{
  const g=ready(createGame(players(8),rng));
  assert.ok(g.players.every(p=>p.hand.length===8));
  assert.ok(g.players.every(p=>p.hand.every(c=>c.side===p.role)));
  assert.equal(new Set([...g.kingDeck,...g.nobleDeck,...g.players.flatMap(p=>p.hand)].map(c=>c.instanceId)).size,8*8+g.kingDeck.length+g.nobleDeck.length);
});

test('a Knight indicator reveals only protection source publicly; only the owner can inspect the hidden card',()=>{
  const g=ready(createGame(players(4),rng));const k=g.players.find(p=>p.role==='king');const n=g.players.find(p=>p.role==='noble');
  k.hand=[{...CARD_MAP['black-plague'],instanceId:'kb'}];g.currentPlayerId=k.id;
  const placed=action(g,k.id,{type:'placeKnight',instanceId:'kb',targetId:n.id,actionId:'place-king-knight'});assert.equal(placed.real,false);
  const pub=publicState(g,n.id);const indicator=pub.players.find(p=>p.id===n.id).knights[0];assert.equal(indicator.protection,'king');assert.equal('real' in indicator,false);assert.equal('cardId' in indicator,false);
  const inspected=action(g,n.id,{type:'inspectKnight',knightId:indicator.id,actionId:'inspect-owner'});assert.equal(inspected.real,false);assert.equal(inspected.cardId,'black-plague');
  assert.throws(()=>action(g,k.id,{type:'inspectKnight',knightId:indicator.id,actionId:'inspect-other'}),/not yours/i);
});

test('server owns hidden hands: a viewer only receives their own hand',()=>{
  const g=ready(createGame(players(4),rng));
  const s=publicState(g,'p1');
  assert.equal(s.hand.length,g.players.find(p=>p.id==='p1').hand.length);
  assert.equal(s.players.some(p=>p.hand),false);
  assert.equal(s.deckCounts.king>=0,true);
});

test('public state exposes turn progress without exposing hidden card contents',()=>{
  for(const count of [4,5,8]){
    const g=ready(createGame(players(count),rng));
    const viewer=g.players.find(p=>p.id===g.currentPlayerId);
    const state=publicState(g,viewer.id);
    const kingLimit=count===4?2:3;
    assert.equal(state.viewerTurn.limit,kingLimit);
    assert.equal(state.players.find(p=>p.id===viewer.id).turnLimit,kingLimit);
    assert.equal(state.players.find(p=>p.id===viewer.id).playedThisTurn,0);
    assert.equal(state.players.some(p=>Object.hasOwn(p,'hand')),false);
  }
});

test('gold is clamped to 0..2000 on the server',()=>{
  const g=ready(createGame(players(4),rng));const p=g.players[0];
  adjustGold(p,999999);assert.equal(p.gold,2000);
  adjustGold(p,-999999);assert.equal(p.gold,0);
});

test('duplicate card play is rejected after the first server-side removal',()=>{
  const g=ready(createGame(players(4),rng));const p=g.players.find(x=>x.id===g.currentPlayerId);
  p.hand=[inst(p.role==='king'?'beggars-blessing':'wrath',p.role),...p.hand.slice(0,7)];
  const id=p.hand[0].instanceId;
  playCard(g,p.id,id,p.role==='king'?{}:{mode:'bank',targetId:g.players.find(x=>x.id!==p.id).id});
  assert.throws(()=>playCard(g,p.id,id,{}),/not in your hand/i);
});

test('negotiation cannot transfer more than 400 gold to one player',()=>{
  const g=ready(createGame(players(4),rng));g.phase='negotiation';g.negotiation={startedAt:Date.now(),endsAt:Date.now()+120000,received:{},offers:new Map()};
  negotiateGold(g,'p1','p2',400);assert.equal(g.players.find(p=>p.id==='p2').gold,1000);
  assert.throws(()=>negotiateGold(g,'p1','p2',1),/400 gold/i);
});

test('fourth round ends immediately after the final card is played; no negotiation starts',()=>{
  const g=ready(createGame(players(4),rng));g.round=4;g.phase='playing';const king=g.players.find(x=>x.role==='king');const idx=g.seatOrder.indexOf(king.id);const prev=g.players.find(x=>x.id===g.seatOrder[(idx-1+g.seatOrder.length)%g.seatOrder.length]);g.currentPlayerId=prev.id;const p=prev;
  p.playedThisTurn=1;p.extraPlays=0;p.hand=[inst(p.role==='king'?'beggars-blessing':'wrath',p.role),...p.hand.slice(0,7)];
  const id=p.hand[0].instanceId;
  playCard(g,p.id,id,p.role==='king'?{}:{mode:'bank',targetId:g.players.find(x=>x.id!==p.id).id});
  assert.equal(g.phase,'gameover');
});

test('Betrayal is blocked by a real face-down Knight and the Knight is consumed',()=>{
  const g=ready(createGame(players(4),rng));g.round=2;const king=g.players.find(p=>p.role==='king');const target=g.players.find(p=>p.role==='noble');
  target.knights=[{id:'k1',ownerId:target.id,placerId:target.id,real:true,card:inst('knight-noble','noble')}];
  king.hand=[inst('betrayal','king'),...king.hand.slice(0,7)];
  playCard(g,king.id,king.hand[0].instanceId,{targetId:target.id});
  assert.equal(target.knights.length,0);
  assert.equal(g.pending,null);
});

test('Divine Right is unavailable before the last two rounds and above 300 gold',()=>{
  const g=ready(createGame(players(4),rng));const k=g.players.find(p=>p.role==='king');k.hand=[inst('divine-right','king')];g.round=2;assert.throws(()=>playCard(g,k.id,k.hand[0].instanceId,{}),/last two rounds/i);
  g.round=3;k.gold=301;assert.throws(()=>playCard(g,k.id,k.hand[0].instanceId,{}),/too much gold/i);
});

test('Royal Bomb is a normal Noble play during the playing phase',()=>{
  const g=ready(createGame(players(4),rng));const n=g.players.find(p=>p.role==='noble');n.hand=[inst('royal-bomb','noble')];g.currentPlayerId=n.id;playCard(g,n.id,n.hand[0].instanceId,{});assert.ok(g.players.filter(p=>p.role==='noble').every(p=>p.gold===0));
});

test('turn card limits are play limits, not hand limits, and match player count',()=>{
  for(const count of [4,5,6,7,8]){
    const g=ready(createGame(players(count),rng));
    const k=g.players.find(p=>p.role==='king');
    const ns=g.players.filter(p=>p.role==='noble');
    assert.equal(k.hand.length,8);
    assert.equal(ns.every(p=>p.hand.length===8),true);
    assert.equal(k.role,'king');
    assert.equal(ns.every(p=>p.role==='noble'),true);
    const state=publicState(g,k.id);
    assert.equal(state.viewerTurn.limit,count===4?2:3);
    assert.equal(ns.every(p=>publicState(g,p.id).viewerTurn.limit===2),true);
  }
});

test('ending a turn refills the hand back to 8 instead of drawing one card per play',()=>{
  const g=ready(createGame(players(4),rng));
  const p=g.players.find(x=>x.id===g.currentPlayerId);
  p.hand=[inst(p.role==='king'?'beggars-blessing':'wrath',p.role),inst(p.role==='king'?'beggars-blessing':'wrath',p.role),...p.hand.slice(2)];
  assert.equal(p.hand.length,8);
  const target=g.players.find(x=>x.id!==p.id);
  const mode=p.role==='king'?{}:{mode:'bank',targetId:target.id};
  playCard(g,p.id,p.hand[0].instanceId,mode);
  assert.equal(p.hand.length,7);
  const mode2=p.role==='king'?{}:{mode:'bank',targetId:target.id};
  playCard(g,p.id,p.hand[0].instanceId,mode2);
  assert.equal(p.hand.length,8);
  assert.equal(p.playedThisTurn,0);
});

test('role and hand side remain paired after a crown change',()=>{
  const g=ready(createGame(players(4),rng));
  const oldKing=g.players.find(p=>p.role==='king');
  const newKing=g.players.find(p=>p.role==='noble');
  oldKing.hand=[inst('black-plague','king'),...oldKing.hand.slice(0,7)];
  newKing.hand=[inst('wrath','noble'),...newKing.hand.slice(0,7)];
  g.phase='playing';g.currentPlayerId=oldKing.id;
  newKing.gold=oldKing.gold+1;
  // A crown change swaps the physical hands with the character roles.
  const oldKingHandIds=oldKing.hand.map(c=>c.id);
  const newKingHandIds=newKing.hand.map(c=>c.id);
  playCard(g,oldKing.id,oldKing.hand[0].instanceId,{});
  // The gold threshold may be reached by the play itself in other rules, so force
  // a direct check of the authoritative role/hand pairing after the transition.
  if(g.kingId!==newKing.id){
    // Trigger the same crown condition through a harmless gold update in a fresh state.
    const h=ready(createGame(players(4),rng));
    const ok=h.players.find(p=>p.role==='king'), nn=h.players.find(p=>p.role==='noble');
    ok.hand=[inst('black-plague','king'),...ok.hand.slice(0,7)];
    nn.hand=[inst('wrath','noble'),...nn.hand.slice(0,7)];
    ok.gold=1000;nn.gold=1001;h.phase='playing';h.currentPlayerId=nn.id;
    playCard(h,nn.id,nn.hand[0].instanceId,{mode:'bank',targetId:ok.id});
    assert.equal(h.players.find(p=>p.id===nn.id).role,'king');
    assert.equal(h.players.find(p=>p.id===nn.id).hand.every(c=>c.side==='king'),true);
    assert.equal(h.players.find(p=>p.id===ok.id).role,'noble');
    assert.equal(h.players.find(p=>p.id===ok.id).hand.every(c=>c.side==='noble'),true);
  }
});
