import test from 'node:test';
import assert from 'node:assert/strict';
import {CARD_MAP} from '../shared/cards.js';
import {
  createGame,
  startRound,
  playCard,
  decide,
  action,
  publicState,
  inspectKnight,
  offerTrade
} from '../server/game-engine.js';

const players=(n=4)=>Array.from({length:n},(_,i)=>({id:`p${i+1}`,name:`P${i+1}`,connected:true}));
const fresh=(n=4)=>{
  const g=createGame(players(n),()=>0.8);
  g.kingReveal=null;
  startRound(g);
  for(const p of g.players)p.gold=p.role==='king'?1000:600;
  return g;
};
function put(g,id){
  const card=CARD_MAP[id];
  const p=g.players.find(x=>x.role===card.side);
  if(!p)throw new Error(`No ${card.side} player for ${id}`);
  p.hand=[{...card,instanceId:`${id}-audit`}];
  g.currentPlayerId=p.id;
  return p;
}
function nobleOther(g,p){return g.players.find(x=>x.role==='noble'&&x.id!==p.id);}

test('Council Meeting waits for the bow/praise before resolving and drawing 2',()=>{
  const g=fresh();
  const actor=put(g,'council');
  const before=actor.hand.length;
  playCard(g,actor.id,actor.hand[0].instanceId,{});
  for(const p of g.players)decide(g,p.id,{vote:true});
  assert.equal(g.pending.stage,'praise');
  assert.equal(actor.hand.length,before-1);
  decide(g,actor.id,{ackPraise:true});
  assert.equal(g.pending,null);
  assert.equal(actor.hand.length,before+1); // -1 played, +2 Council draw
});

test('Suppress Rebellion makes the King, not the card player, roll',()=>{
  const g=fresh();
  const actor=put(g,'suppress-rebellion');
  const k=g.players.find(p=>p.role==='king');
  const nobles=g.players.filter(p=>p.role==='noble');
  g.rng=()=>0;
  playCard(g,actor.id,actor.hand[0].instanceId,{});
  assert.equal(g.pending.type,'suppressRebellion');
  assert.equal(g.pending.rollPlayerId,k.id);
  assert.throws(()=>decide(g,actor.id,{roll:true}));
  const before=Object.fromEntries(nobles.map(p=>[p.id,p.gold]));
  decide(g,k.id,{roll:true});
  assert.equal(actor.gold,before[actor.id]+200);
  for(const n of nobles.filter(p=>p.id!==actor.id))assert.equal(n.gold,before[n.id]+100);
  assert.equal(g.pending,null);
});

test('Black Plague Nobles choose their own pair and the lone Noble rolls twice',()=>{
  const g=fresh();
  const king=put(g,'black-plague');
  const ns=g.players.filter(p=>p.role==='noble');
  const [a,b,lone]=ns;
  playCard(g,king.id,king.hand[0].instanceId,{});
  assert.equal(g.pending.stage,'pairing');
  decide(g,a.id,{partnerId:b.id});
  assert.deepEqual(g.pending.pairs[0],[a.id,b.id]);
  assert.equal(g.pending.stage,'loneRolling');
  assert.equal(g.pending.loneId,lone.id);
  const before=lone.gold;
  let rolls=[0,0.5];
  g.rng=()=>rolls.shift();
  decide(g,lone.id,{roll:true});
  assert.equal(g.pending.loneRolls.length,1);
  decide(g,lone.id,{roll:true});
  assert.equal(g.pending,null);
  assert.equal(lone.gold,before-200);
});

test('People’s Champion swaps gold with the King and does not add an extra 100-gold penalty',()=>{
  const g=fresh();
  g.round=4;
  const actor=put(g,'peoples-champion');
  const k=g.players.find(p=>p.role==='king');
  const target=nobleOther(g,actor);
  g.rng=(()=>{const xs=[0.8,0.5];return()=>xs.shift()??0.5;})();
  playCard(g,actor.id,actor.hand[0].instanceId,{targetId:target.id});
  for(const id of g.pending.eligible)decide(g,id,{vote:true});
  decide(g,target.id,{roll:true});
  decide(g,k.id,{roll:true});
  assert.equal(g.kingId,target.id);
  assert.equal(target.gold,1000);
  assert.equal(k.gold,600);
});

test('People’s Champion rerolls a tied crown roll',()=>{
  const g=fresh();
  g.round=4;
  const actor=put(g,'peoples-champion');
  const k=g.players.find(p=>p.role==='king');
  const target=nobleOther(g,actor);
  let rolls=[0.5,0.5,0.8,0.6];
  g.rng=()=>rolls.shift()??0.6;
  playCard(g,actor.id,actor.hand[0].instanceId,{targetId:target.id});
  for(const id of g.pending.eligible)decide(g,id,{vote:true});
  decide(g,target.id,{roll:true});
  decide(g,k.id,{roll:true});
  assert.equal(g.pending.stage,'rolling');
  assert.equal(Object.keys(g.pending.rolls).length,0);
  decide(g,target.id,{roll:true});
  decide(g,k.id,{roll:true});
  assert.equal(g.pending,null);
  assert.equal(g.kingId,target.id);
});

test('Helping Hand first-card limits follow the printed special cases',()=>{
  const g4=fresh(4);
  const king4=put(g4,'helping-hand');
  playCard(g4,king4.id,king4.hand[0].instanceId,{});
  assert.equal(king4.playedThisTurn,0);
  assert.equal(king4.extraPlays,1); // 2 normal +1 extra = 3 follow-up cards

  const g5=fresh(5);
  const king5=put(g5,'helping-hand');
  playCard(g5,king5.id,king5.hand[0].instanceId,{});
  assert.equal(king5.playedThisTurn,0);
  assert.equal(king5.extraPlays,0); // normal 3 cards => 3 more after the first Helping Hand

  const gN=fresh(4);
  const noble=gN.players.find(p=>p.role==='noble');
  noble.hand=[{...CARD_MAP['helping-hand-noble'],instanceId:'hn-audit'}];
  gN.currentPlayerId=noble.id;
  playCard(gN,noble.id,noble.hand[0].instanceId,{});
  assert.equal(noble.playedThisTurn,0);
  assert.equal(noble.extraPlays,1); // 3 nobles: 3 follow-up cards
});

test('Sub Rosa replaces a stolen/discarded hand card and the actor still draws 2 at turn end',()=>{
  const g=fresh();
  const actor=put(g,'sub-rosa');
  const target=nobleOther(g,actor);
  target.hand=[{...CARD_MAP.wrath,instanceId:'target-card'}];
  const targetBefore=target.hand.length;
  playCard(g,actor.id,actor.hand[0].instanceId,{targetId:target.id});
  decide(g,actor.id,{mode:'hand'});
  g.rng=()=>0.8;
  decide(g,actor.id,{roll:true});
  decide(g,actor.id,{mode:'hand',cardInstanceId:'target-card'});
  assert.equal(target.hand.length,8);
  assert.equal(actor.hand.length,1);
  const filler={...CARD_MAP['beggars-blessing'],instanceId:'filler-audit'};
  actor.hand.push(filler);
  assert.equal(actor.playedThisTurn,1);
  playCard(g,actor.id,filler.instanceId,{});
  assert.equal(actor.hand.length,3); // 1 before second card - 1 played + 2 normal end-of-turn draws
});

test('Face-down Knights cannot be inspected by their recipient in the online game',()=>{
  const g=fresh();
  const actor=nobleOther(g,g.players.find(p=>p.role==='king'));
  const target=nobleOther(g,actor);
  actor.hand=[{...CARD_MAP['knight-noble'],instanceId:'knight-audit'}];
  g.currentPlayerId=actor.id;
  action(g,actor.id,{type:'placeKnight',instanceId:actor.hand[0].instanceId,targetId:target.id,actionId:'place-knight-audit'});
  assert.throws(()=>inspectKnight(g,target.id,target.knights[0].id));
});

test('Royal Bomb cannot be offered through a normal card trade',()=>{
  const g=fresh();
  const a=nobleOther(g,g.players.find(p=>p.role==='king'));
  const b=g.players.find(p=>p.id!==a.id&&p.role==='noble');
  a.hand=[{...CARD_MAP['royal-bomb'],instanceId:'rb-audit'}];
  g.phase='negotiation';
  g.negotiation={startedAt:Date.now(),endsAt:Date.now()+120000,received:{},offers:new Map(),offerCountByPlayer:new Map()};
  assert.throws(()=>offerTrade(g,a.id,b.id,a.hand[0].instanceId));
});

test('Debt Collector cannot make its selected player choose themselves',()=>{
  const g=fresh();
  const king=put(g,'debt-collector');
  const target=nobleOther(g,king);
  const initial=target.hand.length;
  playCard(g,king.id,king.hand[0].instanceId,{targetId:target.id});
  assert.throws(()=>decide(g,target.id,{targetId:target.id}));
  assert.equal(target.hand.length,initial);
});

test('Loyalty forced payment cannot create gold when the King has 0',()=>{
  const g=fresh();
  const actor=put(g,'loyalty');
  const target=nobleOther(g,actor);
  const k=g.players.find(p=>p.role==='king');
  k.gold=0;
  const actorBefore=actor.gold;
  playCard(g,actor.id,actor.hand[0].instanceId,{targetId:target.id,mode:'force'});
  assert.equal(actor.gold,actorBefore);
  assert.equal(target.gold,500);
  assert.equal(g.pending.type,'loyaltyPledge');
});

test('Meat for Meat cannot create gold when the losing Noble has less than 200',()=>{
  const g=fresh();
  const actor=put(g,'meat-for-meat');
  const target=nobleOther(g,actor);
  actor.gold=600;target.gold=0;
  let rolls=[0.8,0.1];
  g.rng=()=>rolls.shift();
  playCard(g,actor.id,actor.hand[0].instanceId,{targetId:target.id});
  decide(g,actor.id,{roll:true});
  decide(g,target.id,{roll:true});
  assert.equal(actor.gold,600);
  assert.equal(target.gold,0);
});


test('Scapegoat starts with the physically left Noble, regardless of round direction',()=>{
  const build=(direction)=>{
    const g=fresh();
    const king=put(g,'scapegoat');
    g.direction=direction;
    playCard(g,king.id,king.hand[0].instanceId,{targetId:nobleOther(g,king)?.id});
    return {g,first:g.pending.eligible[0]};
  };
  const a=build(1);
  const b=build(-1);
  assert.equal(a.first,b.first);
  const kingIndex=a.g.seatOrder.indexOf(a.g.kingId);
  const n=a.g.players.find(p=>p.id===a.first);
  const nIndex=a.g.seatOrder.indexOf(n.id);
  assert.equal(nIndex,(kingIndex-1+a.g.seatOrder.length)%a.g.seatOrder.length);
});
