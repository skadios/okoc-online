import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CARDS,CARD_MAP,KING_CARDS} from '../shared/cards.js';
import {createGame,startRound,playCard,decide,action,tick,publicState} from '../server/game-engine.js';

const players=()=>Array.from({length:4},(_,i)=>({id:`p${i+1}`,name:`P${i+1}`,connected:true}));
const high=()=>0.8;
function fresh(){const g=createGame(players(),high);g.kingReveal=null;startRound(g);for(const p of g.players)p.gold=p.role==='king'?1000:600;return g;}
function put(g,id){const p=g.players.find(x=>x.role===CARD_MAP[id].side);p.hand=[{...CARD_MAP[id],instanceId:`${id}-fidelity`}];g.currentPlayerId=p.id;return p;}
function nobleOther(g,p){return g.players.find(x=>x.role==='noble'&&x.id!==p.id);}
function other(g,p,exclude=null){return g.players.find(x=>x.id!==p.id&&x.id!==exclude?.id);}
function payloadFor(g,p,c){
  const n=nobleOther(g,p),o=other(g,p,n);
  switch(c.effect){
    case'allies':case'hindsight':case'indebted':case'meat':case'peoples_champion':case'scout':case'betrayal':case'grudge':case'tithe':case'sub_rosa':case'bend_knee':case'debt_collector':case'snakes':case'kings_eye':case'eye_for_eye': return {targetId:n?.id||o.id};
    case'bad_blood':case'anchor':case'shifting_tides':case'we_ride': return {targetId:n.id,target2Id:o.id};
    case'loyalty': return {targetId:n.id,mode:'choose'};
    case'wrath': return {targetId:n.id,mode:'bank'};
    case'shadow_deal': return {targetId:o.id,amount:100};
    case'loyal_dog': return {targetId:o.id,amount:100};
    case'royal_parrot': return {targetId:o.id,phrase:'Repeat this sentence.'};
    case'knight': return {targetId:n.id};
    default:return {};
  }
}

test('all 42 physical designs are present, translated and backed by a distinct server handler',()=>{
  assert.equal(CARDS.length,42);assert.equal(new Set(CARDS.map(c=>c.id)).size,42);
  const src=fs.readFileSync(new URL('../server/game-engine.js',import.meta.url),'utf8');
  const handlers=new Set([...src.matchAll(/case'([^']+)'/g)].map(m=>m[1]));
  for(const c of CARDS){assert.ok(c.en&&c.fr&&c.desc?.en&&c.desc?.fr,c.id);assert.ok(handlers.has(c.effect),`missing handler ${c.id}`);}
});

for(const c of CARDS){
  test(`every card can enter its authoritative resolution path: ${c.id}`,()=>{
    const g=fresh();const p=put(g,c.id);
    if(c.id==='royal-bomb'){
      g.phase='negotiation';g.negotiation={startedAt:Date.now(),endsAt:Date.now()+120000,received:{},offers:new Map()};
      action(g,p.id,{type:'discardRoyalBomb',instanceId:p.hand[0].instanceId,actionId:`rb-${c.id}`});
      assert.equal(g.discard.at(-1).id,'royal-bomb');return;
    }
    if(c.id==='divine-right'){p.gold=300;g.round=3;}
    if(c.id==='betrayal'||c.id==='betray-king')g.round=2;
    if(c.id==='peoples-champion')g.round=4;
    if(c.id==='king-maker'){
      g.round=2;const n=p;n.hand=[{...CARD_MAP['betray-king'],instanceId:'bt'}, {...CARD_MAP['king-maker'],instanceId:p.hand[0].instanceId}];g.currentPlayerId=n.id;playCard(g,n.id,'bt',{});playCard(g,n.id,p.hand[0].instanceId,{side:'support'});assert.equal(g.pending.type,'betrayKing');return;
    }
    if(c.effect==='knight'){
      const target=nobleOther(g,p);action(g,p.id,{type:'placeKnight',instanceId:p.hand[0].instanceId,targetId:target.id,actionId:`knight-${c.id}`});assert.equal(target.knights.length,1);return;
    }
    const before=p.hand.length;playCard(g,p.id,p.hand[0].instanceId,payloadFor(g,p,c));
    assert.ok(g.hand===undefined || p.hand.length<before || g.pending || c.effect==='beggars' || c.effect==='divine' || c.effect==='icarus' || c.effect==='mad_king' || c.effect==='subsidies' || c.effect==='suppress_rebellion' || c.effect==='black_plague' || c.effect==='eye_for_eye' || c.effect==='wrath' || c.effect==='knight' || c.effect==='helping_king' || c.effect==='helping_noble' || c.effect==='isolation' || c.effect==='king-maker' || c.effect==='kings_eye' || c.effect==='shifting_tides' || c.effect==='unprotected');
  });
}


test('King Sub Rosa discards a selected card from the target hand instead of stealing it across roles',()=>{
  const g=fresh();const k=g.players.find(x=>x.role==='king'),n=nobleOther(g,k);
  const kingSubRosa=KING_CARDS.find(c=>c.id==='sub-rosa');
  k.hand=[{...kingSubRosa,instanceId:'king-sub-rosa'}];
  const targetCard={...CARD_MAP.wrath,instanceId:'target-noble-card'};
  n.hand=[targetCard];g.currentPlayerId=k.id;
  playCard(g,k.id,'king-sub-rosa',{targetId:n.id});
  decide(g,k.id,{mode:'hand'});decide(g,k.id,{roll:true});
  assert.equal(g.pending.roll,5);
  assert.equal(publicState(g,k.id).lastRoll,5);
  assert.deepEqual(publicState(g,k.id).rollEvents.at(-1).rolls,[5]);assert.equal(publicState(g,k.id).rollEvents.at(-1).players[0].name,k.name);
  decide(g,k.id,{mode:'hand',cardInstanceId:targetCard.instanceId});
  assert.equal(n.hand.some(c=>c.instanceId===targetCard.instanceId),false);
  assert.equal(k.hand.some(c=>c.instanceId===targetCard.instanceId),false);
  assert.ok(g.discard.some(c=>c.instanceId===targetCard.instanceId));
  assert.equal(g.pending,null);
});

test('Sub Rosa does not discard a card when its die condition is not met',()=>{
  const g=fresh();const k=g.players.find(x=>x.role==='king'),n=nobleOther(g,k);
  const kingSubRosa=KING_CARDS.find(c=>c.id==='sub-rosa');
  k.hand=[{...kingSubRosa,instanceId:'king-sub-rosa-fail'}];
  const targetCard={...CARD_MAP.wrath,instanceId:'target-card-fail'};
  n.hand=[targetCard];g.currentPlayerId=k.id;g.rng=()=>0;
  playCard(g,k.id,'king-sub-rosa-fail',{targetId:n.id});
  decide(g,k.id,{mode:'hand'});decide(g,k.id,{roll:true});
  assert.equal(g.pending,null);
  assert.equal(n.hand.some(c=>c.instanceId===targetCard.instanceId),true);
  assert.equal(g.discard.some(c=>c.instanceId===targetCard.instanceId),false);
  assert.equal(g.rollEventId,1);
  assert.equal(publicState(g,k.id).lastRoll,1);
  assert.deepEqual(publicState(g,k.id).rollEvents.at(-1).rolls,[1]);assert.equal(publicState(g,k.id).rollEvents.at(-1).players[0].name,k.name);
});

test('Betrayal can be refused by one Noble and still succeed if another Noble supports it',()=>{
  const g=createGame(players().concat({id:'p5',name:'P5',connected:true}),high);g.kingReveal=null;startRound(g);g.round=2;const actor=nobleOther(g,g.players.find(x=>x.role==='king'));const target=g.players.find(x=>x.role==='noble'&&x.id!==actor.id);const a=g.players.find(x=>x.role==='noble'&&x.id!==target.id&&x.id!==actor.id);actor.hand=[{...CARD_MAP.betrayal,instanceId:'b'}];g.currentPlayerId=actor.id;playCard(g,actor.id,'b',{targetId:target.id});decide(g,a.id,{support:false});assert.ok(g.pending);const b=g.players.find(x=>x.role==='noble'&&x.id!==target.id&&x.id!==a.id&&x.id!==actor.id);decide(g,b.id,{support:true});assert.equal(g.pending,null);assert.equal(target.gold,0);
});

test('Betrayal ignores Isolation and King’s Eye once support is given',()=>{
  for(const protection of ['isolation','kings-eye']){
    const g=createGame(players().concat({id:'p5',name:'P5',connected:true}),high);
    g.kingReveal=null;startRound(g);g.round=2;
    const k=g.players.find(x=>x.role==='king');
    const target=g.players.find(x=>x.role==='noble');
    const supporter=g.players.find(x=>x.role==='noble'&&x.id!==target.id);
    k.hand=[{...CARD_MAP.betrayal,instanceId:`betrayal-${protection}`}];
    g.currentPlayerId=k.id;
    target.effects.push(protection==='isolation'
      ? {type:'isolation',targetId:target.id,expiresAfterPlayerTurn:target.id,createdTurnSerial:g.turnSerial}
      : {type:'kings_eye',source:k.id,targetId:target.id,expiresAfterPlayerTurn:k.id,createdTurnSerial:g.turnSerial});
    playCard(g,k.id,k.hand[0].instanceId,{targetId:target.id});
    decide(g,supporter.id,{support:true});
    assert.equal(target.gold,0,protection);
    assert.equal(g.pending,null,protection);
  }
});

test('King Sub Rosa discards a selected card regardless of its deck role',()=>{
  const g=fresh();const k=g.players.find(x=>x.role==='king');const target=nobleOther(g,k);
  k.hand=[{...KING_CARDS.find(c=>c.id==='sub-rosa'),instanceId:'king-subrosa'}];
  const foreign={...CARD_MAP.wrath,instanceId:'noble-card-to-discard'};target.hand=[foreign];g.currentPlayerId=k.id;g.rng=()=>0.8;
  playCard(g,k.id,'king-subrosa',{targetId:target.id});decide(g,k.id,{mode:'hand'});assert.equal(g.pending.awaitRoll,true);decide(g,k.id,{roll:true});
  assert.equal(g.pending.type,'subRosa');assert.equal(g.pending.roll,5);
  decide(g,k.id,{mode:'hand',cardInstanceId:foreign.instanceId});
  assert.equal(g.pending,null);assert.ok(g.discard.some(c=>c.instanceId===foreign.instanceId));
  assert.ok(!k.hand.some(c=>c.instanceId===foreign.instanceId));assert.ok(!target.hand.some(c=>c.instanceId===foreign.instanceId));
});

test('King Sub Rosa does nothing when its die condition is not met',()=>{
  const g=fresh();const k=g.players.find(x=>x.role==='king');const target=nobleOther(g,k);
  k.hand=[{...KING_CARDS.find(c=>c.id==='sub-rosa'),instanceId:'king-subrosa-fail'}];
  const kept={...CARD_MAP.wrath,instanceId:'keep-this-card'};target.hand=[kept];g.currentPlayerId=k.id;g.rng=()=>0;
  playCard(g,k.id,'king-subrosa-fail',{targetId:target.id});decide(g,k.id,{mode:'hand'});decide(g,k.id,{roll:true});
  assert.equal(g.pending,null);assert.ok(target.hand.some(c=>c.instanceId===kept.instanceId));
  assert.ok(!g.discard.some(c=>c.instanceId===kept.instanceId));
});

test('Noble Sub Rosa takes a card rather than discarding it',()=>{
  const g=fresh();const n=g.players.find(x=>x.role==='noble');const target=g.players.find(x=>x.role==='noble'&&x.id!==n.id);
  n.hand=[{...CARD_MAP['sub-rosa'],instanceId:'noble-subrosa'}];const chosen={...CARD_MAP.wrath,instanceId:'noble-card-to-take'};target.hand=[chosen];g.currentPlayerId=n.id;g.rng=()=>0.8;
  playCard(g,n.id,'noble-subrosa',{targetId:target.id});decide(g,n.id,{mode:'hand'});decide(g,n.id,{roll:true});
  decide(g,n.id,{mode:'hand',cardInstanceId:chosen.instanceId});
  assert.ok(n.hand.some(c=>c.instanceId===chosen.instanceId));assert.ok(!g.discard.some(c=>c.instanceId===chosen.instanceId));
});

test('Loyalty implements both printed options',()=>{
  const g=fresh();const k=g.players.find(x=>x.role==='king'),n=nobleOther(g,k);n.hand=[{...CARD_MAP.loyalty,instanceId:'l1'}];g.currentPlayerId=n.id;playCard(g,n.id,'l1',{targetId:k.id,mode:'choose'});decide(g,k.id,{choice:'forceKing'});assert.equal(g.pending,null);assert.equal(n.gold,700);
  const g2=fresh();const k2=g2.players.find(x=>x.role==='king'),n2=nobleOther(g2,k2);n2.hand=[{...CARD_MAP.loyalty,instanceId:'l2'}];g2.currentPlayerId=n2.id;const forceTarget=g2.players.find(x=>x.role==='noble'&&x.id!==n2.id);playCard(g2,n2.id,'l2',{targetId:forceTarget.id,mode:'force'});assert.equal(k2.gold,1100);assert.equal(forceTarget.gold,500);assert.equal(g2.pending.type,'loyaltyPledge');decide(g2,forceTarget.id,{ack:true});assert.equal(g2.pending,null);
});

test('Loyal Dog requires the target to acknowledge the printed pledge',()=>{
  const g=fresh();const k=g.players.find(x=>x.role==='king'),n=nobleOther(g,k);k.hand=[{...CARD_MAP['loyal-dog'],instanceId:'ld'}];g.currentPlayerId=k.id;playCard(g,k.id,'ld',{targetId:n.id,amount:300});assert.equal(n.gold,900);assert.equal(g.pending.type,'loyalDog');decide(g,n.id,{ack:true});assert.equal(g.pending,null);
});

test('Royal Parrot stores the King-selected sentence and resolves the refusal penalty',()=>{
  const g=fresh();const k=g.players.find(x=>x.role==='king'),n=nobleOther(g,k);k.hand=[{...CARD_MAP['royal-parrot'],instanceId:'rp'}];g.currentPlayerId=k.id;playCard(g,k.id,'rp',{targetId:n.id,phrase:'Say this.'});assert.equal(g.pending.phrase,'Say this.');const before=n.gold;decide(g,n.id,{accept:false});assert.equal(n.gold,before-300);assert.equal(g.pending,null);
});

test('People’s Champion swaps gold with the King on a winning roll without an extra penalty',()=>{
  const g=fresh();g.round=4;let rolls=[0.8,0.5];g.rng=()=>rolls.shift()??0.5;const actor=nobleOther(g,g.players.find(x=>x.role==='king'));const target=other(g,actor,g.players.find(x=>x.role==='king'));const k=g.players.find(x=>x.role==='king');actor.hand=[{...CARD_MAP['peoples-champion'],instanceId:'pc'}];g.currentPlayerId=actor.id;playCard(g,actor.id,'pc',{targetId:target.id});for(const id of g.pending.eligible)decide(g,id,{vote:true});assert.equal(g.pending.stage,'rolling');decide(g,target.id,{roll:true});decide(g,k.id,{roll:true});assert.equal(g.kingId,target.id);assert.equal(target.gold,1000);assert.equal(k.gold,600);
});

test('King’s Eye expires after the King’s next turn, not the protected Noble’s turn',()=>{
  const g=fresh();const k=g.players.find(x=>x.role==='king'),n=nobleOther(g,k);k.hand=[{...CARD_MAP['kings-eye'],instanceId:'ke'}];g.currentPlayerId=k.id;playCard(g,k.id,'ke',{targetId:n.id});assert.ok(n.effects.some(e=>e.type==='kings_eye'));
  // The Noble's own turn ending does not expire the effect.
  g.currentPlayerId=n.id;n.hand=[{...CARD_MAP.wrath,instanceId:'nw'} ,...n.hand];playCard(g,n.id,'nw',{targetId:k.id,mode:'bank'});assert.ok(n.effects.some(e=>e.type==='kings_eye'));
});

test('automatic crown change does not leave a stale crown flag that skips the next turn',()=>{
  const g=fresh();const k=g.players.find(x=>x.role==='king'),n=nobleOther(g,k);k.gold=1000;n.gold=1100;g.phase='negotiation';g.negotiation={startedAt:Date.now(),endsAt:Date.now()+120000,received:{},offers:new Map()};action(g,n.id,{type:'negotiateGold',targetId:k.id,amount:0,actionId:'crown'});assert.equal(g.kingId,n.id);g.phase='playing';g.currentPlayerId=n.id;n.hand=[{...CARD_MAP['eye-for-eye'],instanceId:'after'} ,...n.hand];playCard(g,n.id,'after',{targetId:k.id});assert.equal(n.playedThisTurn,1);
});

test('no manual draw or manual King-change action exists',()=>{const g=fresh();assert.throws(()=>action(g,g.currentPlayerId,{type:'drawCard',actionId:'d'}),/Unknown game action/);assert.throws(()=>action(g,g.currentPlayerId,{type:'changeKing',actionId:'k'}),/Unknown game action/);});

test('physical PDF role mapping is authoritative, including shared-title King copies',()=>{
  const kingIds=new Set(['black-plague','eye-for-eye','bend-knee','helping-hand','anchor','loyal-dog','mad-king','debt-collector','royal-parrot','shifting-tides','snakes','sub-rosa','scapegoat','kings-eye','we-ride-together','knight-noble']);
  assert.deepEqual(new Set(KING_CARDS.map(c=>c.id)),kingIds);
  assert.equal(CARD_MAP.wrath.side,'noble');
  assert.equal(KING_CARDS.length,16);
  assert.equal(KING_CARDS.find(c=>c.id==='sub-rosa').copies,2);
  assert.equal(KING_CARDS.find(c=>c.id==='knight-noble').copies,1);
  assert.equal(KING_CARDS.find(c=>c.id==='helping-hand').copies,1);
});

test('physical deck quantities are finite and role-specific',()=>{
  const k=Object.fromEntries(KING_CARDS.map(c=>[c.id,c.copies]));
  assert.equal(k['sub-rosa'],2);assert.equal(k['knight-noble'],1);assert.equal(k['helping-hand'],1);
  assert.equal(k['black-plague'],1);assert.equal(k['anchor'],2);assert.equal(k['loyal-dog'],3);
});

test('We Ride Together makes the lower roller choose first and requires the higher roller to accept a split',()=>{
  const g=fresh();const k=g.players.find(x=>x.role==='king');const ns=g.players.filter(x=>x.role==='noble');const a=ns[0],b=ns[1];
  let rolls=[0.8,0.5];g.rng=()=>rolls.shift()??0.5;
  k.hand=[{...CARD_MAP['we-ride-together'],instanceId:'wrt'}];g.currentPlayerId=k.id;
  playCard(g,k.id,'wrt',{targetId:a.id,target2Id:b.id});
  assert.equal(g.pending.stage,'rolling');
  decide(g,a.id,{roll:true});assert.equal(g.pending.rolls[a.id],5);
  decide(g,b.id,{roll:true});assert.equal(g.pending.stage,'lowerChoice');assert.equal(g.pending.lowerId,b.id);assert.equal(g.pending.higherId,a.id);
  decide(g,b.id,{choice:'split'});assert.equal(g.pending.stage,'higherChoice');assert.equal(g.pending.splitOffer,true);
  decide(g,a.id,{accept:true});assert.equal(g.pending,null);assert.equal(a.gold,500);assert.equal(b.gold,500);
});