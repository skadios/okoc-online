import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startRound,playCard,negotiateGold,action} from '../server/game-engine.js';
import {CARD_MAP} from '../shared/cards.js';

const players=n=>Array.from({length:n},(_,i)=>({id:`p${i+1}`,name:`P${i+1}`,connected:true}));
const fresh=n=>{const g=createGame(players(n),()=>0.2);g.kingReveal=null;startRound(g);return g;};
const give=(g,id,playerId)=>{const p=g.players.find(x=>x.id===playerId)||g.players.find(x=>x.role===CARD_MAP[id].side);p.hand=[{...CARD_MAP[id],instanceId:`${id}-hardening`}];g.currentPlayerId=p.id;return p;};

test('Black Plague includes every Noble and gives the card player the odd-count exemption',()=>{
  const g=fresh(4); const p=g.players.find(x=>x.role==='king');
  p.hand=[{...CARD_MAP['black-plague'],instanceId:'bp'}]; g.currentPlayerId=p.id;
  // Four players => three Nobles, so there must be two dice and one pair containing the actor.
  let calls=0; g.rng=()=>{calls++;return 0;};
  playCard(g,p.id,'bp',{});
  assert.equal(g.lastRolls.length,2);
  assert.equal(calls,2);
  assert.equal(p.gold,1000);
  assert.equal(g.players.filter(x=>x.role==='noble'&&x.id!==p.id).some(x=>x.gold===400),true);
});

test('Shifting Tides blocks outsiders from taking gold from either selected Noble',()=>{
  const g=fresh(4); const king=g.players.find(x=>x.role==='king'); const ns=g.players.filter(x=>x.role==='noble');
  king.hand=[{...CARD_MAP['shifting-tides'],instanceId:'st'}]; g.currentPlayerId=king.id;
  playCard(g,king.id,'st',{targetId:ns[0].id,target2Id:ns[1].id});
  g.phase='negotiation';g.negotiation={received:{},endsAt:Date.now()+10000};
  assert.throws(()=>negotiateGold(g,ns[2].id,ns[0].id,100),/Shifting Tides/);
  assert.doesNotThrow(()=>negotiateGold(g,ns[0].id,ns[1].id,100));
});

test('a crown change resets the old turn counters instead of leaking plays into the new King role',()=>{
  const g=fresh(4); const king=g.players.find(x=>x.role==='king'); const n=g.players.find(x=>x.role==='noble');
  king.gold=1000; n.gold=1001; n.hand=[{...CARD_MAP['wrath'],instanceId:'w'}]; g.currentPlayerId=n.id;
  playCard(g,n.id,'w',{mode:'bank',targetId:king.id});
  assert.equal(g.kingId,n.id);
  assert.equal(n.playedThisTurn,0);
  assert.equal(n.extraPlays,0);
});

test('negotiation rejects non-integer and out-of-range gold amounts instead of silently clamping them',()=>{
  const g=fresh(4); g.phase='negotiation'; g.negotiation={received:{},endsAt:Date.now()+10000};
  const a=g.players[0],b=g.players[1];
  assert.throws(()=>negotiateGold(g,a.id,b.id,99.5),/whole number/);
  assert.throws(()=>negotiateGold(g,a.id,b.id,401),/whole number/);
  assert.throws(()=>negotiateGold(g,a.id,b.id,NaN),/whole number/);
});

test('a rejected card payload never consumes the card from the hand',()=>{
  const g=fresh(4); const k=g.players.find(x=>x.role==='king');
  k.hand=[{...CARD_MAP.anchor,instanceId:'anchor-invalid'}];g.currentPlayerId=k.id;
  const before=k.hand.map(c=>c.instanceId);
  assert.throws(()=>playCard(g,k.id,'anchor-invalid',{targetId:g.players.find(x=>x.id!==k.id).id,target2Id:g.players.find(x=>x.id!==k.id).id}),/Anchor requires two different players/);
  assert.deepEqual(k.hand.map(c=>c.instanceId),before);
  assert.equal(g.pending,null);
});

test('Helping Hand bonus does not consume the normal slot and gives the correct extra slot',()=>{
  const g=fresh(4); const n=g.players.find(x=>x.role==='noble');
  n.hand=[{...CARD_MAP['helping-hand-noble'],instanceId:'hh'}];g.currentPlayerId=n.id;
  playCard(g,n.id,'hh',{});
  assert.equal(n.playedThisTurn,0);
  assert.equal(n.extraPlays,1);
  // Noble normal limit is 2, plus the Helping Hand bonus.
  assert.equal((n.role==='noble'?2:3)+n.extraPlays,3);
});

test('direct tradeCards cannot be used as a silent card theft endpoint',()=>{
  const g=fresh(4);g.phase='negotiation';g.negotiation={received:{},endsAt:Date.now()+10000,offers:new Map()};
  const a=g.players[0],b=g.players[1];
  const give={...CARD_MAP.wrath,instanceId:'give'};const receive={...CARD_MAP.beggars_blessing,instanceId:'receive'};
  a.hand=[give];b.hand=[receive];
  assert.throws(()=>action(g,a.id,{type:'tradeCards',targetId:b.id,giveCardId:give.instanceId,receiveCardId:receive.instanceId,actionId:'silent-trade'}),/Trade offers require|direct/i);
});

test('Betrayal blocked by a real Knight resolves exactly once',()=>{
  const g=fresh(4);g.round=2;const k=g.players.find(x=>x.role==='noble'),target=g.players.find(x=>x.role==='noble'&&x.id!==k.id);
  k.hand=[{...CARD_MAP.betrayal,instanceId:'b'}];target.knights=[{id:'kn',ownerId:target.id,placerId:target.id,real:true,card:{...CARD_MAP['knight-noble'],instanceId:'kn-card'}}];
  g.currentPlayerId=k.id;playCard(g,k.id,'b',{targetId:target.id});
  assert.equal(g.pending,null);assert.equal(k.playedThisTurn,1);assert.equal(g.discard.filter(c=>c.id==='betrayal').length,1);
});

test('out-of-turn crown changes cannot strand an unrelated pending card resolution',()=>{
  const g=fresh(4); const k=g.players.find(x=>x.role==='king'); const ns=g.players.filter(x=>x.role==='noble');
  k.hand=[{...CARD_MAP['loyal-dog'],instanceId:'loyal-dog-pending'}];g.currentPlayerId=k.id;playCard(g,k.id,'loyal-dog-pending',{targetId:ns[1].id,amount:100});assert.equal(g.pending.type,'loyalDog');
  // Create an active Bad Blood obligation and make a Noble settle it out of turn.
  k.effects=[{type:'bad_blood',a:ns[0].id,b:ns[1].id,active:true}];ns[0].gold=1001;g.kingId=k.id;k.gold=1000;
  // The settlement should either be rejected while a decision is pending or resolve cleanly.
  assert.doesNotThrow(()=>action(g,ns[0].id,{type:'settleBadBlood',actionId:'bb-pending'}));
  assert.ok(g.pending===null || g.pending.type==='loyalDog');
});

test('a crown change during a pending card keeps the pending actor in control until resolution',()=>{
  const g=fresh(4); const k=g.players.find(x=>x.role==='king'); const ns=g.players.filter(x=>x.role==='noble');
  k.hand=[{...CARD_MAP['loyal-dog'],instanceId:'loyal-dog-pending-2'}];g.currentPlayerId=k.id;playCard(g,k.id,'loyal-dog-pending-2',{targetId:ns[1].id,amount:100});
  k.effects=[{type:'bad_blood',a:ns[0].id,b:ns[1].id,active:true}];ns[0].gold=1201;k.gold=1000;
  action(g,ns[0].id,{type:'settleBadBlood',actionId:'bb-pending-2'});
  assert.equal(g.kingId,ns[0].id);assert.equal(g.currentPlayerId,k.id);assert.equal(g.pending.type,'loyalDog');
  action(g,ns[1].id,{type:'decision',payload:{ack:true},actionId:'loyal-dog-ack'});
  assert.equal(g.pending,null);
});

test('Bad Blood is removed if one of its two Nobles becomes King, avoiding an impossible obligation',()=>{
  const g=fresh(4);const k=g.players.find(x=>x.role==='king'),n=g.players.find(x=>x.role==='noble');
  k.effects=[{type:'bad_blood',a:n.id,b:g.players.find(x=>x.role==='noble'&&x.id!==n.id).id,active:true}];
  n.gold=1201;k.gold=1000;
  g.phase='negotiation';g.negotiation={received:{},endsAt:Date.now()+10000,offers:new Map()};
  action(g,k.id,{type:'negotiateGold',targetId:n.id,amount:0,actionId:'bb-crown'});
  assert.equal(g.kingId,n.id);
  assert.equal(g.players.some(p=>p.effects.some(e=>e.type==='bad_blood'&&e.active)),false);
});


test('4-player turns require exactly 2 cards for the King and 2 for every Noble',()=>{
  const g=fresh(4); const king=g.players.find(x=>x.role==='king');
  king.hand=[{...CARD_MAP['black-plague'],instanceId:'k1'},{...CARD_MAP['black-plague'],instanceId:'k2'}];
  g.currentPlayerId=king.id;
  playCard(g,king.id,'k1',{}); assert.equal(g.currentPlayerId,king.id); assert.equal(king.playedThisTurn,1); assert.equal(king.turnLimit,undefined);
  playCard(g,king.id,'k2',{}); assert.notEqual(g.currentPlayerId,king.id); assert.equal(king.playedThisTurn,0);
  const noble=g.players.find(x=>x.id===g.currentPlayerId); noble.hand=[{...CARD_MAP['wrath'],instanceId:'n1'},{...CARD_MAP['wrath'],instanceId:'n2'}];
  playCard(g,noble.id,'n1',{mode:'bank',targetId:king.id}); assert.equal(g.currentPlayerId,noble.id); assert.equal(noble.playedThisTurn,1);
  playCard(g,noble.id,'n2',{mode:'bank',targetId:king.id}); assert.notEqual(g.currentPlayerId,noble.id); assert.equal(noble.playedThisTurn,0);
});

test('5-8 player games give the King 3 cards while Nobles remain at 2',()=>{
  for(const count of [5,6,7,8]){
    const g=fresh(count); const king=g.players.find(x=>x.role==='king');
    king.hand=[{...CARD_MAP['black-plague'],instanceId:`k1-${count}`},{...CARD_MAP['black-plague'],instanceId:`k2-${count}`},{...CARD_MAP['black-plague'],instanceId:`k3-${count}`}];
    g.currentPlayerId=king.id;
    playCard(g,king.id,`k1-${count}`,{});assert.equal(g.currentPlayerId,king.id);
    playCard(g,king.id,`k2-${count}`,{});assert.equal(g.currentPlayerId,king.id);
    playCard(g,king.id,`k3-${count}`,{});assert.notEqual(g.currentPlayerId,king.id);assert.equal(king.playedThisTurn,0);
    const noble=g.players.find(x=>x.id===g.currentPlayerId);assert.equal(noble.turnLimit,undefined);
    noble.hand=[{...CARD_MAP['wrath'],instanceId:`n1-${count}`},{...CARD_MAP['wrath'],instanceId:`n2-${count}`}];
    playCard(g,noble.id,`n1-${count}`,{mode:'bank',targetId:king.id});assert.equal(g.currentPlayerId,noble.id);
    playCard(g,noble.id,`n2-${count}`,{mode:'bank',targetId:king.id});assert.notEqual(g.currentPlayerId,noble.id);assert.equal(noble.playedThisTurn,0);
  }
});
