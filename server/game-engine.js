import crypto from 'node:crypto';
import {CARDS, CARD_MAP, KING_CARDS, NOBLE_CARDS} from '../shared/cards.js';

export const MAX_GOLD = 2000;
export const MIN_GOLD = 0;
export const NEGOTIATION_SECONDS = 120;
export const KING_REVEAL_MS = 4200;

const uid = () => crypto.randomUUID();
const clampGold = n => Math.max(MIN_GOLD, Math.min(MAX_GOLD, Math.trunc(n)));
const clampInt = (n,min,max) => Math.max(min, Math.min(max, Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : min));
const shuffle = (arr, rng=Math.random) => { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const roll = rng => 1 + Math.floor(rng()*6);
const recordRoll = (game, value, cardId=null) => {
  game.lastRoll=value; game.lastRolls=null; game.rollEventId=(game.rollEventId||0)+1;
  game.rollEvents=game.rollEvents||[]; game.rollEvents.push({id:game.rollEventId,rolls:[value],cardId});
  if(game.rollEvents.length>30)game.rollEvents.shift(); return value;
};
const recordRolls = (game, values, cardId=null) => {
  game.lastRoll=null; game.lastRolls=[...values]; game.rollEventId=(game.rollEventId||0)+1;
  game.rollEvents=game.rollEvents||[]; game.rollEvents.push({id:game.rollEventId,rolls:[...values],cardId});
  if(game.rollEvents.length>30)game.rollEvents.shift(); return values;
};

export function makeDeck(defs, rng=Math.random){
  const raw=[];
  for(const card of defs){
    for(let i=0;i<card.copies;i++) raw.push({...card,instanceId:`${card.id}-${i}-${uid()}`});
  }
  return shuffle(raw,rng);
}

export function playerById(game,id){return game.players.find(p=>p.id===id) || null;}
export function nobles(game){return game.players.filter(p=>p.role==='noble');}
export function king(game){return playerById(game,game.kingId);}
export function adjustGold(p,delta){p.gold=clampGold(p.gold+delta);return p.gold;}
function changeGold(game,p,delta){const before=p.gold;const after=adjustGold(p,delta);if(after!==before){game.crownSuppressedIds?.delete(p.id)}return after;}

export function log(game,en,fr){game.log.push({id:uid(),en,fr,ts:Date.now()});if(game.log.length>150)game.log.shift();}

function cardSnapshot(game){
  return {
    kingId:game.kingId,
    players:game.players.map(p=>({
      id:p.id,
      name:p.name,
      role:p.role,
      gold:p.gold,
      handCount:p.hand.length,
      knights:p.knights.length,
      effects:p.effects.map(e=>e.type),
      commitments:p.commitments.map(c=>c.type)
    })),
    lastRoll:game.lastRoll ?? null,
    lastRolls:Array.isArray(game.lastRolls)?[...game.lastRolls]:null,
    logLength:game.log.length
  };
}

function cardEffectSummary(game,before,actor,card){
  const enParts=[];
  const frParts=[];
  const effectLabel={
    bad_blood:['Bad Blood','Sang mêlé'],debt:['debt','dette'],isolation:['Isolation','Isolation'],
    kings_eye:["King's Eye","Œil du Roi"],shifting:['Shifting Tides','Marées mouvantes']
  };
  const nowById=new Map(game.players.map(p=>[p.id,p]));
  for(const old of before.players){
    const now=nowById.get(old.id);if(!now)continue;
    const delta=now.gold-old.gold;
    if(delta){
      enParts.push(`${now.name} ${delta>0?`+${delta}`:delta} gold`);
      frParts.push(`${now.name} ${delta>0?`+${delta}`:delta} or`);
    }
    if(now.role!==old.role){
      enParts.push(`${now.name} is now ${now.role==='king'?'King':'Noble'}`);
      frParts.push(`${now.name} devient ${now.role==='king'?'Roi':'Noble'}`);
    }
    if(now.knights!==old.knights){
      const n=Math.abs(now.knights-old.knights);
      enParts.push(`${now.name} ${now.knights>old.knights?`gains ${n} face-down Knight${n>1?'s':''}`:`loses ${n} face-down Knight${n>1?'s':''}`}`);
      frParts.push(`${now.name} ${now.knights>old.knights?`gagne ${n} Chevalier${n>1?'s':''} face cachée`:`perd ${n} Chevalier${n>1?'s':''} face cachée`}`);
    }
    const added=[...new Set(now.effects.filter(type=>!old.effects.includes(type)))];
    const removed=[...new Set(old.effects.filter(type=>!now.effects.includes(type)))];
    if(added.length){
      enParts.push(`${now.name}: ${added.map(type=>effectLabel[type]?.[0]||String(type).replaceAll('_',' ')).join(', ')}`);
      frParts.push(`${now.name} : ${added.map(type=>effectLabel[type]?.[1]||String(type).replaceAll('_',' ')).join(', ')}`);
    }
    if(removed.length){
      enParts.push(`${now.name}: ${removed.map(type=>effectLabel[type]?.[0]||String(type).replaceAll('_',' ')).join(', ')} ended`);
      frParts.push(`${now.name} : ${removed.map(type=>effectLabel[type]?.[1]||String(type).replaceAll('_',' ')).join(', ')} terminé`);
    }
    if(now.commitments.length>old.commitments.length){
      enParts.push(`${now.name} gains a lasting commitment`);frParts.push(`${now.name} reçoit un engagement durable`);
    }
    if(now.commitments.length<old.commitments.length){
      enParts.push(`${now.name}'s lasting commitment is resolved`);frParts.push(`L'engagement de ${now.name} est résolu`);
    }
    const currentHandCount=now.hand.length;
    if(currentHandCount!==old.handCount){
      const d=currentHandCount-old.handCount;
      if(Math.abs(d)>=2){
        enParts.push(`${now.name} ${d>0?`gains ${d}`:`loses ${-d}`} cards`);
        frParts.push(`${now.name} ${d>0?`gagne ${d}`:`perd ${-d}`} cartes`);
      }
    }
  }
  if(before.lastRoll==null && game.lastRoll!=null){enParts.push(`roll: ${game.lastRoll}`);frParts.push(`dé : ${game.lastRoll}`);}
  if(!before.lastRolls && Array.isArray(game.lastRolls)){enParts.push(`rolls: ${game.lastRolls.join(' vs ')}`);frParts.push(`dés : ${game.lastRolls.join(' contre ')}`);}
  if(before.kingId!==game.kingId){
    const newKing=playerById(game,game.kingId);
    if(newKing){enParts.push(`${newKing.name} takes the crown`);frParts.push(`${newKing.name} prend la couronne`);}
  }
  if(!enParts.length){
    const recent=game.log.slice(before.logLength??game.log.length);
    const ignored=/^(Round \d+ begins|Negotiation phase begins|.* is now King after round 4\.)/i;
    const relevant=recent.find(e=>e?.en && !ignored.test(e.en) && (e.en.includes(actor.name)||e.en.includes(card.en)||e.event==='betrayalPlayed')) || recent.find(e=>e?.en && !ignored.test(e.en));
    if(relevant){enParts.push(relevant.en);frParts.push(relevant.fr);}
  }
  return enParts.length?{en:enParts.join(' · '),fr:frParts.join(' · ')}:{en:`${actor.name} resolves ${card.en}.`,fr:`${actor.name} résout ${card.fr}.`};
}

function addCardEvent(game,stage,actor,card,before,extra={}){
  const summary=stage==='played'
    ? {en:`${actor.name} played ${card.en}.`,fr:`${actor.name} joue ${card.fr}.`}
    : cardEffectSummary(game,before||cardSnapshot(game),actor,card);
  game.cardEvents=game.cardEvents||[];
  game.cardEvents.push({
    id:uid(),stage,cardId:card.id,actorId:actor.id,actorName:actor.name,textEn:extra.textEn||summary.en,textFr:extra.textFr||summary.fr,
    ...extra,ts:Date.now()
  });
  if(game.cardEvents.length>30)game.cardEvents.shift();
}

function drawFrom(game, role, count, player){
  const deck = role==='king' ? game.kingDeck : game.nobleDeck;
  for(let i=0;i<count;i++){
    if(!deck.length) refillDeck(game,role);
    if(!deck.length) break;
    player.hand.push(deck.pop());
  }
}
function refillDeck(game,role){
  const pool=game.discard.filter(c=>c.side===role && c.id!=='royal-bomb');
  if(!pool.length)return;
  game.discard=game.discard.filter(c=>!(c.side===role && c.id!=='royal-bomb'));
  const deck=shuffle(pool,game.rng);if(role==='king')game.kingDeck=deck;else game.nobleDeck=deck;
}
export function drawToMinimum(game,p){const needed=Math.max(0,8-p.hand.length);if(needed)drawFrom(game,p.role,needed,p);}
function drawExact(game,p,n){drawFrom(game,p.role,n,p);}

function seatIndex(game,id){return game.seatOrder.indexOf(id);}
function nextSeat(game,id){
  const n=game.seatOrder.length;if(!n)return null;
  let i=seatIndex(game,id);if(i<0)i=0;
  for(let step=1;step<=n;step++){
    const idx=(i + step*game.direction + n*10)%n;
    const candidate=playerById(game,game.seatOrder[idx]);
    if(candidate && candidate.connected!==false)return candidate;
  }
  return null;
}

function expireAfterTurn(game,endedPlayerId){
  for(const p of game.players){
    p.effects=p.effects.filter(e=>{
      if((e.type==='isolation'||e.type==='kings_eye') && e.expiresAfterPlayerTurn===endedPlayerId && e.createdTurnSerial < game.turnSerial)return false;
      return true;
    });
  }
  game.effects=game.effects.filter(e=>!(e.type==='shifting' && e.expiresAfterPlayerTurn===endedPlayerId && e.createdTurnSerial < game.turnSerial));
}

function clearExpiredEffects(game){
  // Kept for round transitions; per-turn protections are removed by expireAfterTurn.
  for(const p of game.players){
    p.effects=p.effects.filter(e=>e.type!=='isolation' || !e.expired);
  }
}

function applyRoundStart(game){
  // Bad Blood pays the King 200 at the beginning of every round until either
  // of the two marked nobles pays the other 200 out of turn. It stops if the
  // King changes before the next round.
  const currentKing=king(game);
  for(const p of game.players){
    for(const e of p.effects){
      if(e.type==='bad_blood' && e.active && currentKing?.id===p.id){
        const a=playerById(game,e.a), b=playerById(game,e.b);
        if(a?.role==='noble' && b?.role==='noble') changeGold(game,p,200);
      }
      if(e.type==='debt' && e.active){
        const debtor=playerById(game,e.targetId);
        if(debtor?.role==='noble'){ changeGold(game,debtor,-100); changeGold(game,p,100); }
      }
    }
  }
}

export function startRound(game){
  game.phase='playing';
  game.kingReveal=null;
  game.direction=game.round%2===1?1:-1;
  game.currentPlayerId=game.kingId;
  game.turnSerial=(game.turnSerial||0)+1;
  game.turnPlayed=0;
  game.turnExtra=0;
  game.pending=null;
  game.negotiation=null;
  clearExpiredEffects(game);
  applyRoundStart(game);
  log(game,`Round ${game.round} begins.`,`Le round ${game.round} commence.`);
}

export function createGame(players,rng=Math.random){
  if(players.length<4 || players.length>8)throw new Error('The game requires 4 to 8 players.');
  const ps=players.map(p=>({
    id:p.id,name:p.name,role:null,gold:0,hand:[],knights:[],effects:[],commitments:[],connected:p.connected!==false,playedThisTurn:0,extraPlays:0,receivedNegotiation:0,seen:[]
  }));
  const kingIndex=Math.floor(rng()*ps.length);
  const game={
    players:ps,seatOrder:ps.map(p=>p.id),phase:'kingReveal',round:1,direction:1,currentPlayerId:null,kingId:ps[kingIndex].id,
    kingReveal:{startedAt:Date.now(),endsAt:Date.now()+KING_REVEAL_MS},
    kingDeck:[],nobleDeck:[],discard:[],pending:null,negotiation:null,log:[],chat:[],cardEvents:[],rng,actionHistory:new Map(),effects:[],crownSuppressedIds:new Set(),crownJustDemotedId:null
  };
  for(const p of ps){p.role=p.id===game.kingId?'king':'noble';p.gold=p.role==='king'?1000:600;}
  game.kingDeck=makeDeck(KING_CARDS,rng);game.nobleDeck=makeDeck(NOBLE_CARDS,rng);
  for(const p of ps)drawFrom(game,p.role,8,p);
  // The first King is chosen server-side before the reveal animation.
  // No player can act until the authoritative reveal finishes.
  return game;
}

function hasIsolation(game,targetId){
  const p=playerById(game,targetId);
  return !!p?.effects.some(e=>e.type==='isolation');
}
function hasKingsEye(game,targetId){
  const p=playerById(game,targetId);
  return !!p?.effects.some(e=>e.type==='kings_eye');
}
function enforceCardLookProtection(game,actor,target){
  if(hasIsolation(game,target.id))throw new Error('Isolation prevents looking at this player’s cards.');
  if(actor.role==='noble' && hasKingsEye(game,target.id))changeGold(game,actor,-100);
}
function enforceGoldTakeProtection(game,actor,target){
  if(actor.role!=='noble')return;
  if(hasIsolation(game,target.id))throw new Error('Isolation prevents taking gold from this player.');
  if(hasKingsEye(game,target.id))changeGold(game,actor,-100);
  const blocks=game.effects.filter(e=>e.type==='shifting' && e.a && e.b);
  for(const e of blocks){
    const actorInPair=actor.id===e.a||actor.id===e.b;
    const targetInPair=target.id===e.a||target.id===e.b;
    if(actorInPair){
      const other=actor.id===e.a?e.b:e.a;
      if(target.id!==other)throw new Error('Shifting Tides only allows you to take gold from the other selected Noble.');
    } else if(targetInPair){
      throw new Error('Shifting Tides protects the selected Nobles from gold being taken by outsiders.');
    }
  }
}
function shiftingBlocks(game,a,b,isBetrayal=false){
  if(isBetrayal)return false;
  return game.effects.some(e=>e.type==='shifting' && ((e.a===a&&e.b===b)||(e.a===b&&e.b===a)));
}

function enforceShiftingTransfer(game,fromId,toId){
  const active=game.effects.find(e=>e.type==='shifting' && e.a && e.b);
  if(!active)return;
  const touchesPair=fromId===active.a||fromId===active.b||toId===active.a||toId===active.b;
  if(touchesPair){
    const isPair=(fromId===active.a&&toId===active.b)||(fromId===active.b&&toId===active.a);
    if(!isPair)throw new Error('Shifting Tides only allows the two selected Nobles to transfer gold to each other.');
  }
}

function consumeBetrayalKnight(game,target){
  if(!target.knights.length)return false;
  const k=target.knights.shift();
  game.discard.push(k.card);
  if(k.real){
    log(game,`${target.name} revealed ${k.card.en}: the real Knight blocked Betrayal.`,`${target.name} révèle ${k.card.fr} : le vrai Chevalier bloque la Trahison.`);
    return true;
  }
  log(game,`${target.name} revealed ${k.card.en}: it was a bluff, so Betrayal continues.`,`${target.name} révèle ${k.card.fr} : c’était un bluff, donc la Trahison continue.`);
  return false;
}

function validateTarget(game,id,opts={}){
  const p=playerById(game,id);if(!p)throw new Error('Player not found.');
  if(opts.noble && p.role!=='noble')throw new Error('Choose a Noble.');
  if(opts.notSelf && p.id===opts.actor)throw new Error('Choose another player.');
  if(opts.notKing && p.role==='king')throw new Error('The King cannot be selected here.');
  return p;
}

function pendingCard(game){return game.pending ? CARD_MAP[game.pending.cardId] : null;}
function takePendingCard(game){
  if(!game.pending)return null;
  const c=game.pending.card;
  game.pending=null;
  game.discard.push(c);
  return c;
}
function turnLimit(game,actor){
  return (actor.role==='king' ? (game.players.length===4?2:3) : 2) + actor.extraPlays;
}

export function checkGoldCrown(game){
  if(game.phase==='lobby' || game.phase==='gameover')return false;
  const current=king(game); if(!current)return false;
  const candidates=nobles(game).filter(p=>p.gold>current.gold && !game.crownSuppressedIds?.has(p.id));
  if(!candidates.length)return false;
  let winner=candidates[0];
  if(candidates.length===1){
    winner=candidates[0];
  } else if(candidates.length===2){
    let a=roll(game.rng),b=roll(game.rng),guard=0;
    while(a===b && guard++<12){a=roll(game.rng);b=roll(game.rng);}
    recordRolls(game,[a,b]);
    if(a===b){
      // The official guide defines the two-player simultaneous case as a roll;
      // if a deterministic test RNG produces the same value forever, fall back
      // to seat order rather than looping indefinitely.
      winner=game.seatOrder.indexOf(candidates[0].id)<game.seatOrder.indexOf(candidates[1].id)?candidates[0]:candidates[1];
    } else winner=a>b?candidates[0]:candidates[1];
    const loser=winner.id===candidates[0].id?candidates[1]:candidates[0];
    changeGold(game,loser,-100);
    log(game,`${candidates[0].name} and ${candidates[1].name} contested the crown (${a} vs ${b}); ${winner.name} won.`,`${candidates[0].name} et ${candidates[1].name} ont disputé la couronne (${a} contre ${b}) ; ${winner.name} gagne.`);
  } else {
    // The source only specifies the simultaneous two-player case. For an
    // impossible-to-stage larger tie, use one server roll per contender and
    // deterministic seat-order tie breaking; never loop.
    const rolls=candidates.map(p=>({p,roll:roll(game.rng)}));
    recordRolls(game,rolls.map(x=>x.roll));
    const highest=Math.max(...rolls.map(x=>x.roll));
    winner=rolls.filter(x=>x.roll===highest).map(x=>x.p).sort((a,b)=>seatIndex(game,a.id)-seatIndex(game,b.id))[0];
    for(const c of candidates)if(c.id!==winner.id)changeGold(game,c,-100);
    log(game,`${candidates.length} Nobles crossed the crown threshold; ${winner.name} won the server contest.`,`${candidates.length} Nobles ont dépassé le seuil de la couronne ; ${winner.name} gagne le concours serveur.`);
  }
  // A normal gold-threshold crown is a physical seat/card-character swap: the
  // new King takes the old King's seat/cards, and the two character-card gold
  // trackers travel with those physical player positions.
  swapKing(game,winner.id,{reason:'gold',swapGold:true});
  return true;
}

function finishPlayedCard(game,actor,card,{discard=true,count=true}={}){
  if(discard)game.discard.push(card);
  if(count)actor.playedThisTurn++;
  // The physical rules say a player becomes King as soon as they have more
  // gold than the current King. Check this after every resolved card, before
  // the turn can continue.
  const crownChanged=checkGoldCrown(game);
  if(crownChanged){actor.playedThisTurn=0;actor.extraPlays=0;game.kingChangedThisAction=false;return;}
  const limit=turnLimit(game,actor);
  if(actor.playedThisTurn>=limit){
    // End-of-turn refill: the hand is restored to the standard 8-card hand.
    // Card effects may already have drawn cards during the turn, so drawing
    // by the number of plays would overdraw in those cases.
    drawToMinimum(game,actor);
    actor.playedThisTurn=0; actor.extraPlays=0;
    const endedTurnSerial=game.turnSerial;
    expireAfterTurn(game,actor.id);
    game.turnSerial=(game.turnSerial||0)+1;
    const next=nextSeat(game,actor.id);
    if(next && next.id===game.kingId){
      if(game.round===4){
        game.phase='gameover';
        for(const cp of game.players)cp.commitments=cp.commitments.filter(c=>c.untilRound>game.round ? true : resolveCommitment(game,cp,c));
        log(game,`${king(game)?.name||'The King'} is King after round 4.`,`${king(game)?.name||'Le Roi'} est Roi après le round 4.`);
      } else beginNegotiation(game);
    } else if(next){
      game.currentPlayerId=next.id;
    }
  }
}

function beginNegotiation(game){
  game.phase='negotiation';game.currentPlayerId=null;game.pending=null;
  game.negotiation={startedAt:Date.now(),endsAt:Date.now()+NEGOTIATION_SECONDS*1000,received:{},offers:new Map(),offerCountByPlayer:new Map()};
  for(const p of game.players)p.receivedNegotiation=0;
  log(game,`Negotiation phase begins. Two minutes.`,`La phase de négociation commence. Deux minutes.`);
}
function endNegotiation(game){
  if(game.phase!=='negotiation')return;
  if(game.round>=4){
    game.phase='gameover';
    log(game,`${king(game)?.name||'The King'} is King after round 4.`,` ${king(game)?.name||'Le Roi'} est Roi après le round 4.`);
    return;
  }
  // The negotiation follows the completed round. Resolve commitments whose promised
  // deadline is this completed round, then advance to the next round.
  for(const p of game.players){
    p.playedThisTurn=0;p.extraPlays=0;
    p.commitments=p.commitments.filter(c=>c.untilRound>game.round ? true : resolveCommitment(game,p,c));
  }
  game.round++;
  startRound(game);
}
function resolveCommitment(game,owner,c){
  if(c.type==='hindsight' || c.type==='scout'){
    const target=playerById(game,c.targetId);const succeeded=c.type==='hindsight'
      ? game.log.some(e=>e.event==='betrayalPlayed' && e.actorId===c.targetId && e.round<=c.untilRound)
      : target?.role==='king' && game.round<=c.untilRound;
    changeGold(game,owner,succeeded?300:-100);
    return false;
  }
  return true;
}

export function tick(game,now=Date.now()){
  if(game.phase==='kingReveal' && game.kingReveal && now>=game.kingReveal.endsAt){
    game.kingReveal=null;
    startRound(game);
  }
  if(game.phase==='negotiation' && now>=game.negotiation.endsAt)endNegotiation(game);
}

function chooseSupporterIds(game,actorId,count){
  return game.players.filter(p=>p.id!==actorId && p.role==='noble').map(p=>p.id).slice(0,count);
}

function immediate(game,p,c,payload){
  const targetId=payload.targetId;
  switch(c.effect){
    case'actors':
      game.pending={type:'actorsThank',actorId:p.id,card:c,acks:{},targetId:null};return;
    case'allies':{
      const t=validateTarget(game,targetId,{noble:true,actor:p.id});
      game.pending={type:'allies',actorId:p.id,card:c,targetId:t.id};return;
    }
    case'bad_blood':{
      const a=validateTarget(game,targetId,{noble:true,notSelf:false}), b=validateTarget(game,payload.target2Id,{noble:true,notSelf:false});
      if(a.id===b.id)throw new Error('Choose two different Nobles.');
      p.effects.push({type:'bad_blood',a:a.id,b:b.id,active:true});return;
    }
    case'beggars': nobles(game).forEach(n=>{if(n.gold<=300)changeGold(game,n,200)});return;
    case'betrayal':{
      if(game.round===1)throw new Error('Betrayal cannot be played in the first round.');
      const t=validateTarget(game,targetId,{noble:true,notSelf:true,actor:p.id});
      // Betrayal explicitly ignores Isolation and King's Eye protections.
      const blocked=consumeBetrayalKnight(game,t);
      if(blocked){return;}
      game.pending={type:'betrayalSupport',actorId:p.id,card:c,targetId:t.id,eligible:chooseSupporterIds(game,p.id,game.players.filter(x=>x.id!==p.id&&x.role==='noble').length),supports:[]};return;
    }
    case'betray_king':{
      if(game.round===1)throw new Error('Betray the King cannot be played in the first round.');
      game.pending={type:'betrayKing',actorId:p.id,card:c,eligible:game.players.filter(x=>x.id!==p.id).map(x=>x.id),supports:[],kingRoll:null,mods:[]};return;
    }
    case'council': game.pending={type:'council',kind:'council',actorId:p.id,card:c,eligible:game.players.map(x=>x.id),votes:{}};return;
    case'divine':{
      if(game.round<3)throw new Error('Divine Right can only be played in the last two rounds.');
      if(p.gold>300)throw new Error('You need 300 gold or less to play Divine Right.');
      const d=roll(game.rng);recordRoll(game,d,c.id);log(game,`${p.name} rolled ${d}.`,`${p.name} a obtenu ${d}.`);if(d>=5)changeGold(game,p,1200);return;
    }
    case'grudge':{
      const t=validateTarget(game,targetId,{notSelf:true,actor:p.id});
      game.pending={type:'grudge',actorId:p.id,card:c,targetId:t.id,accepted:null,payerId:null};return;
    }
    case'helping_king': drawFrom(game,p.role,2,p);p.extraPlays++;return;
    case'hindsight':{
      const t=validateTarget(game,targetId,{noble:true,notSelf:true,actor:p.id});
      p.commitments.push({type:'hindsight',targetId:t.id,untilRound:game.round+1,cardId:c.id});return;
    }
    case'icarus':{
      const total=game.players.filter(x=>x.role==='noble'&&x.id!==p.id).length*100;
      if(p.gold<total)throw new Error('You cannot afford the payment if the roll fails.');
      const d=roll(game.rng);recordRoll(game,d,c.id);log(game,`${p.name} rolled ${d}.`,`${p.name} a obtenu ${d}.`);
      if(d>=4)nobles(game).forEach(n=>{if(n.id!==p.id){enforceGoldTakeProtection(game,p,n);changeGold(game,n,-100);changeGold(game,p,100)}});
      else nobles(game).forEach(n=>{if(n.id!==p.id)changeGold(game,p,-100),changeGold(game,n,100)});
      return;
    }
    case'indebted':{
      const t=validateTarget(game,targetId,{noble:true,notSelf:true,actor:p.id});
      const d=roll(game.rng);recordRoll(game,d,c.id);log(game,`${p.name} rolled ${d}.`,`${p.name} a obtenu ${d}.`);
      if(d>=3)p.effects.push({type:'debt',targetId:t.id,active:true});return;
    }
    case'isolation': p.effects.push({type:'isolation',targetId:p.id,expiresAfterPlayerTurn:p.id,createdTurnSerial:game.turnSerial||0});return;
    case'king_maker':{
      if(game.pending?.type!=='betrayKing')throw new Error('King Maker can only be played while Betray the King is resolving.');
      const side=payload.side==='oppose'?'oppose':'support';
      if(game.pending.mods.some(m=>m.playerId===p.id))throw new Error('You already played King Maker for this Betray the King.');
      game.pending.mods.push({playerId:p.id,side});
      log(game,`${p.name} ${side==='support'?'supports':'opposes'} Betray the King with King Maker.`,`${p.name} ${side==='support'?'soutient':'s’oppose à'} Trahir le Roi avec Faiseur de Roi.`);
      return;
    }
    case'knight': throw new Error('Knight cards must be placed face-down using the Knight action.');
    case'loyalty':{
      if(!['choose','force'].includes(payload.mode))throw new Error('Choose one Loyalty option.');
      const t=validateTarget(game,targetId,{notSelf:true,actor:p.id});
      if(payload.mode==='force' && t.id===game.kingId)throw new Error('Choose a player other than the King for this Loyalty option.');
      if(payload.mode==='force'){
        changeGold(game,t,-100);
        changeGold(game,king(game),100);
        game.pending={type:'loyaltyPledge',actorId:p.id,card:c,targetId:t.id};
      }else{
        game.pending={type:'loyalty',actorId:p.id,card:c,targetId:t.id};
      }
      return;
    }
    case'meat':{
      const t=validateTarget(game,targetId,{noble:true,notSelf:true,actor:p.id});
      let a=roll(game.rng),b=roll(game.rng);recordRolls(game,[a,b],c.id);log(game,`${p.name} rolled ${a}; ${t.name} rolled ${b}.`,`${p.name} a obtenu ${a} ; ${t.name} a obtenu ${b}.`);if(a>b){enforceGoldTakeProtection(game,p,t);changeGold(game,t,-200);changeGold(game,p,200);}return;
    }
    case'peoples_champion':{
      if(game.round!==4)throw new Error('People’s Champion can only be played in the last round.');
      const t=validateTarget(game,targetId,{noble:true});
      game.pending={type:'champion',actorId:p.id,card:c,targetId:t.id,votes:{},eligible:nobles(game).filter(x=>x.id!==t.id).map(x=>x.id)};return;
    }
    case'royal_bomb':{
      nobles(game).forEach(n=>changeGold(game,n,-800));
      log(game,`${p.name} played Royal Bomb: every player except the King loses 800 gold.`,`${p.name} joue Bombe royale : tous les joueurs sauf le Roi perdent 800 pièces.`);
      return;
    }
    case'scout':{
      const t=validateTarget(game,targetId,{noble:true,notSelf:true,actor:p.id});
      p.commitments.push({type:'scout',targetId:t.id,untilRound:game.round+1,cardId:c.id});return;
    }
    case'shadow_deal':{
      const t=validateTarget(game,targetId,{notSelf:true,actor:p.id});const amount=payload.amount===200?200:100;changeGold(game,t,amount);return;
    }
    case'sub_rosa':{
      const t=validateTarget(game,targetId,{notSelf:true,actor:p.id});
      game.pending={type:'subRosa',actorId:p.id,card:c,targetId:t.id,mode:null};return;
    }
    case'subsidies': nobles(game).forEach(n=>{if(n.gold===0)changeGold(game,n,300);else if(n.gold>=100&&n.gold<=300)changeGold(game,n,200);else if(n.gold>=400&&n.gold<=500)changeGold(game,n,100);});return;
    case'tithe':{
      const t=validateTarget(game,targetId,{notSelf:true,actor:p.id});game.pending={type:'tithe',actorId:p.id,card:c,targetId:t.id};return;
    }
    case'unprotected':{
      const d=roll(game.rng);recordRoll(game,d,c.id);
      if(d>=5){
        for(const x of game.players){
          const removed=x.knights.filter(k=>k.placerId!==p.id);
          if(removed.length)game.discard.push(...removed.map(k=>k.card));
          x.knights=x.knights.filter(k=>k.placerId===p.id);
        }
      }
      return;
    }
    case'suppress_rebellion':{
      const d=roll(game.rng);recordRoll(game,d,c.id);if(d<=3){changeGold(game,p,200);nobles(game).filter(n=>n.id!==p.id).forEach(n=>changeGold(game,n,100));}return;
    }
    case'wrath':{
      if(payload.mode==='bank'){const t=validateTarget(game,targetId,{notSelf:false});changeGold(game,t,-100);return;}
      const t=validateTarget(game,targetId,{noble:true,notSelf:true,actor:p.id});enforceGoldTakeProtection(game,p,t);changeGold(game,p,-100);changeGold(game,t,-300);return;
    }
    case'black_plague':{
      const pool=[...nobles(game)];
      // Every Noble participates. If the Noble count is odd, the card player
      // is the leftover player and rolls with the last Noble; the card player
      // is exempt from the 200-gold loss in that pairing.
      if(pool.length%2===1){
        const actorIndex=pool.findIndex(n=>n.id===p.id);
        if(actorIndex>=0) pool.push(pool.splice(actorIndex,1)[0]);
      }
      const rolls=[];
      for(let i=0;i<pool.length;i+=2){
        const a=pool[i],b=pool[i+1];
        if(!b)continue;
        const da=roll(game.rng),db=roll(game.rng);
        rolls.push(da,db);
        if(da===1||db===1){
          if(a.id!==p.id)changeGold(game,a,-200);
          if(b.id!==p.id)changeGold(game,b,-200);
        }
      }
      recordRolls(game,rolls,c.id);
      log(game,`${p.name} resolved Black Plague. Rolls: ${rolls.join(', ')}.`,`Peste noire résolue par ${p.name}. Dés : ${rolls.join(', ')}.`);
      return;
    }
    case'eye_for_eye':{const t=validateTarget(game,targetId,{notSelf:false});enforceGoldTakeProtection(game,p,t);changeGold(game,p,-100);changeGold(game,t,-300);return;}
    case'bend_knee':{const t=validateTarget(game,targetId,{notSelf:true,actor:p.id});game.pending={type:'bendKnee',actorId:p.id,card:c,targetId:t.id};return;}
    case'helping_noble':{
      drawFrom(game,p.role,2,p);
      // The Noble variant explicitly grants enough extra plays to reach the
      // printed 4-more (or 3-more with only 3 Nobles) when used first.
      // Because Helping Hand itself is not a normal play slot, the bonus is
      // one additional slot over the normal Noble limit.
      p.extraPlays++;
      return;
    }
    case'anchor':{const t=validateTarget(game,targetId,{notSelf:true,actor:p.id}), t2=validateTarget(game,payload.target2Id,{notSelf:true,actor:p.id});if(t.id===t2.id)throw new Error('Anchor requires two different players.');game.pending={type:'anchor',actorId:p.id,card:c,targetId:t.id,target2Id:t2.id};return;}
    case'loyal_dog':{
      const t=validateTarget(game,targetId,{notSelf:false});
      const amount=clampInt(payload.amount,100,300);
      changeGold(game,t,amount);
      game.pending={type:'loyalDog',actorId:p.id,card:c,targetId:t.id,amount,phrase:'Thank you my King, I pledge my loyalty to you my King.'};
      return;
    }
    case'debt_collector':{const chooser=validateTarget(game,targetId,{notSelf:true,actor:p.id});game.pending={type:'debtCollector',actorId:p.id,card:c,targetId:chooser.id};return;}
    case'mad_king':{
      const rolls=[];
      for(const x of game.players){const d=roll(game.rng);rolls.push(d);if(d===1)changeGold(game,x,x.id===p.id?-500:-300);}
      recordRolls(game,rolls,c.id);
      log(game,`${p.name} resolved Mad King. Rolls: ${rolls.join(', ')}.`,`${p.name} résout Roi fou. Dés : ${rolls.join(', ')}.`);
      return;
    }
    case'royal_parrot':{
      const t=validateTarget(game,targetId,{notSelf:true,actor:p.id});
      const phrase=String(payload.phrase||'').trim().slice(0,180);
      if(!phrase)throw new Error('Give the chosen player a sentence to repeat.');
      game.pending={type:'royalParrot',actorId:p.id,card:c,targetId:t.id,phrase};
      return;
    }
    case'shifting_tides':{const a=validateTarget(game,targetId,{noble:true}),b=validateTarget(game,payload.target2Id,{noble:true});if(a.id===b.id)throw new Error('Choose two different Nobles.');game.effects.push({type:'shifting',a:a.id,b:b.id,expiresAfterPlayerTurn:p.id,createdTurnSerial:game.turnSerial||0});log(game,`${a.name} and ${b.name} may only take gold from each other until ${p.name}’s next turn.`,`${a.name} et ${b.name} ne peuvent prendre de l’or que l’un à l’autre jusqu’au prochain tour de ${p.name}.`);return;}
    case'snakes':{const t=validateTarget(game,targetId,{notSelf:false});game.pending={type:'snakes',actorId:p.id,card:c,targetId:t.id,eligible:nobles(game).map(n=>n.id),votes:{}};return;}
    case'scapegoat':{const ns=nobles(game);const kingIndex=game.seatOrder.indexOf(game.kingId);const ordered=ns.sort((a,b)=>{const ia=game.seatOrder.indexOf(a.id),ib=game.seatOrder.indexOf(b.id);const da=(ia-kingIndex+game.seatOrder.length)%game.seatOrder.length;const db=(ib-kingIndex+game.seatOrder.length)%game.seatOrder.length;return da-db;});game.pending={type:'scapegoat',actorId:p.id,card:c,votes:{},eligible:ordered.map(n=>n.id),currentVoterId:ordered[0]?.id||null};return;}
    case'kings_eye':{const t=validateTarget(game,targetId,{notSelf:false});t.effects.push({type:'kings_eye',source:p.id,targetId:t.id,expiresAfterPlayerTurn:p.id,createdTurnSerial:game.turnSerial||0});return;}
    case'we_ride':{
      const a=validateTarget(game,targetId,{noble:true}),b=validateTarget(game,payload.target2Id,{noble:true});if(a.id===b.id)throw new Error('Choose two different Nobles.');
      let da=roll(game.rng),db=roll(game.rng),guard=0;while(da===db && guard++<20)db=roll(game.rng);if(da===db)db=(db%6)+1;recordRolls(game,[da,db],c.id);game.pending={type:'weRide',actorId:p.id,card:c,aId:a.id,bId:b.id,aRoll:da,bRoll:db};return;
    }
    default: throw new Error('This card effect is not implemented.');
  }
}

export function canPlayCard(game,p,card,payload={}){
  if(!card)throw new Error('Card not found.');
  if(card.side!==p.role)throw new Error('You cannot use a card from the other deck.');
  if(game.phase!=='playing')throw new Error('Cards can only be played during the playing phase.');
  const outOfTurn=card.outOfTurn && game.pending?.type==='betrayKing';
  if(!outOfTurn && game.phase==='playing' && game.currentPlayerId!==p.id)throw new Error('It is not your turn.');
  if(card.lastRounds && game.round<3)throw new Error('This card can only be played in the last two rounds.');
  if(card.minRound && game.round<card.minRound)throw new Error('This card cannot be played yet.');
  if(card.lastRoundOnly && game.round!==4)throw new Error('This card can only be played in the last round.');
  if(card.requiresGoldAtMost && p.gold>card.requiresGoldAtMost)throw new Error('You have too much gold to play this card.');
  if(card.negotiationOnly && game.phase!=='negotiation')throw new Error('This card can only be handled during negotiation.');
  if(card.id==='king-maker' && game.pending?.type!=='betrayKing')throw new Error('There is no Betray the King action to respond to.');
  return {outOfTurn};
}

export function playCard(game,playerId,instanceId,payload={}){
  const p=playerById(game,playerId);if(!p)throw new Error('Player not found.');
  const card=p.hand.find(c=>c.instanceId===instanceId);if(!card)throw new Error('That card is not in your hand.');
  const {outOfTurn}=canPlayCard(game,p,card,payload);
  if(game.pending && !outOfTurn)throw new Error('Resolve the current decision first.');
  game.lastRoll=null;game.lastRolls=null;
  const before=cardSnapshot(game);
  if(card.id==='king-maker' && game.pending?.type==='betrayKing'){
    p.hand=p.hand.filter(c=>c.instanceId!==instanceId);
    immediate(game,p,card,payload);game.discard.push(card);addCardEvent(game,'resolved',p,card,before);return;
  }
  const originalHand=p.hand;
  p.hand=originalHand.filter(c=>c.instanceId!==instanceId);
  try{
    immediate(game,p,card,payload);
  }catch(error){
    // Failed client input must be side-effect free: never consume a card just
    // because the server rejected its target/options.
    p.hand=originalHand;
    throw error;
  }
  if(game.pending && game.pending.card===card){game.pending.pendingCard=card;game.pending.actorId=p.id;game.pending.cardBefore=before;addCardEvent(game,'played',p,card,before,{pendingType:game.pending.type});return;}
  finishPlayedCard(game,p,card,{count:card.effect!=='helping_king'&&card.effect!=='helping_noble'});
  addCardEvent(game,'resolved',p,card,before);
}

function finishPending(game,actor,pending){
  const card=pending.card;const before=pending.cardBefore||cardSnapshot(game);game.pending=null;game.discard.push(card);
  const crownChanged=game.kingChangedThisAction || checkGoldCrown(game);
  if(crownChanged){
    game.kingChangedThisAction=false;
    actor.playedThisTurn=0;actor.extraPlays=0;
    const next=nextSeat(game,game.kingId);game.currentPlayerId=next?.id||null;
    addCardEvent(game,'resolved',actor,card,before);
    return;
  }
  actor.playedThisTurn++;
  const limit=(actor.role==='king'?(game.players.length===4?2:3):2)+actor.extraPlays;
  if(actor.playedThisTurn>=limit){drawToMinimum(game,actor);actor.playedThisTurn=0;actor.extraPlays=0;expireAfterTurn(game,actor.id);game.turnSerial=(game.turnSerial||0)+1;const next=nextSeat(game,actor.id);if(next&&next.id===game.kingId){if(game.round===4){game.phase='gameover';log(game,`${king(game)?.name||'The King'} is King after round 4.`,`${king(game)?.name||'Le Roi'} est Roi après le round 4.`);}else beginNegotiation(game);}else if(next){game.currentPlayerId=next.id;}}
  addCardEvent(game,'resolved',actor,card,before);
}

export function decide(game,playerId,payload={}){
  const p=playerById(game,playerId);if(!p)throw new Error('Player not found.');const q=game.pending;if(!q)throw new Error('No decision is pending.');
  const actor=playerById(game,q.actorId);
  const voteEligible=q.eligible?.includes(p.id);
  if(q.type==='actorsThank'){
    if(Object.keys(q.acks||{}).length < game.players.length){
      if(p.id in (q.acks||{}))throw new Error('You already acknowledged this action.');
      q.acks[p.id]=true;return;
    }
    if(p.id!==q.actorId)throw new Error('Only the player who played Actors chooses the laugh target.');
    const target=validateTarget(game,payload.targetId,{notSelf:false});q.targetId=target.id;
    log(game,`${target.name} is the target of the court’s laughter.`,`${target.name} devient la cible des rires de la cour.`);
    finishPending(game,actor,q);return;
  }
  if(q.type==='allies'){
    if(p.id!==q.targetId)throw new Error('Only the chosen Noble can decide.');
    if(!['gain100','lose200'].includes(payload.choice))throw new Error('Choose one of the two options.');
    if(payload.choice==='gain100')changeGold(game,actor,100);else changeGold(game,actor,-200);
    finishPending(game,actor,q);return;
  }
  if(q.type==='betrayalSupport'){
    if(!q.eligible.includes(p.id))throw new Error('Choose another Noble to support this action.');
    if(q.supports.some(x=>x.playerId===p.id))throw new Error('You already responded.');
    q.supports.push({playerId:p.id,support:!!payload.support});
    if(q.supports.some(x=>x.support)){
      const target=playerById(game,q.targetId);
      if(target){enforceGoldTakeProtection(game,actor,target);changeGold(game,actor,target.gold);target.gold=0;}
      game.log.push({event:'betrayalPlayed',actorId:actor.id,round:game.round,id:uid(),en:`${actor.name} played Betrayal.`,fr:`${actor.name} joue Trahison.`,ts:Date.now()});
      finishPending(game,actor,q);return;
    }
    if(q.supports.length>=q.eligible.length){finishPending(game,actor,q);}return;
  }
  if(q.type==='betrayKing'){
    if(!q.eligible.includes(p.id))throw new Error('You cannot support this action.');
    if(q.supports.some(x=>x.playerId===p.id))throw new Error('You already responded.');
    q.supports.push({playerId:p.id,support:!!payload.support});
    if(q.supports.length>=2){
      const k=king(game);const d=roll(game.rng);const mod=q.mods.reduce((s,m)=>s+(m.side==='support'?1:-1),0);const total=d+mod;recordRoll(game,d,q.card.id);log(game,`${k.name} rolled ${d}${mod?` (${mod>0?'+':''}${mod})`:''}.`,`Le Roi a obtenu ${d}${mod?` (${mod>0?'+':''}${mod})`:''}.`);
      if(total<=3){swapKing(game,actor.id);} else changeGold(game,k,200);
      for(const m of q.mods){const kp=playerById(game,m.playerId);if((m.side==='support') !== (total<=3))changeGold(game,kp,-300);}
      finishPending(game,actor,q);return;
    }
    return;
  }
  if(q.type==='council'){
    if(!voteEligible)throw new Error('You cannot vote on this.');q.votes[p.id]=!!payload.vote;
    if(q.eligible.every(id=>id in q.votes)){
      const yes=q.eligible.every(id=>q.votes[id]);if(yes){changeGold(game,king(game),-100);changeGold(game,actor,100);}else changeGold(game,actor,-100);drawExact(game,actor,2);finishPending(game,actor,q);
    }return;
  }
  if(q.type==='grudge'){
    if(p.id!==q.targetId)throw new Error('Only the chosen player can decide.');
    if(payload.accept===true){const source=validateTarget(game,payload.payerId,{noble:true,notSelf:false});enforceGoldTakeProtection(game,actor,source);changeGold(game,source,-200);changeGold(game,actor,200);}
    else changeGold(game,actor,-100);
    finishPending(game,actor,q);return;
  }
  if(q.type==='loyalty'){
    if(p.id!==q.targetId)throw new Error('Only the chosen player can decide.');
    if(payload.choice==='payActor'){
      enforceGoldTakeProtection(game,p,actor);
      changeGold(game,p,-100);changeGold(game,actor,100);
    }else if(payload.choice==='forceKing'){
      const k=king(game);
      enforceGoldTakeProtection(game,p,actor);
      changeGold(game,k,-100);changeGold(game,actor,100);
    }else throw new Error('Choose an option.');
    finishPending(game,actor,q);return;
  }
  if(q.type==='loyaltyPledge'){
    if(p.id!==q.targetId)throw new Error('Only the chosen player can pledge loyalty.');
    if(payload.ack!==true)throw new Error('The chosen player must acknowledge the loyalty pledge.');
    log(game,`${p.name} pledges loyalty to ${actor.name}.`,`${p.name} prête allégeance à ${actor.name}.`);
    finishPending(game,actor,q);return;
  }
  if(q.type==='subRosa'){
    if(p.id!==q.actorId)throw new Error('Only the player who played the card can resolve it.');
    const target=playerById(game,q.targetId);if(!target)throw new Error('Target unavailable.');
    if(!q.mode){
      if(payload.mode==='hand')enforceCardLookProtection(game,actor,target);
      if(payload.mode==='knight' && actor.role==='king')throw new Error('The King’s Sub Rosa only allows looking at a player’s hand.');
      if(payload.mode==='knight' && hasIsolation(game,target.id))throw new Error('Isolation prevents looking at this player’s Knight.');
      if(!['hand','knight'].includes(payload.mode))throw new Error('Choose hand or face-down Knight.');
      if(payload.mode==='knight' && !target.knights.length)throw new Error('That player has no face-down Knight.');
      q.mode=payload.mode;
      q.roll=roll(game.rng);recordRoll(game,q.roll,q.card.id);
      log(game,`${actor.name} rolled ${q.roll} for Sub Rosa.`,`${actor.name} a obtenu ${q.roll} pour Catimini.`);
      if(q.roll<4){finishPending(game,actor,q);return;}
      return;
    }
    if(q.roll==null)throw new Error('Sub Rosa must roll before resolving its effect.');
    if(q.roll<4){finishPending(game,actor,q);return;}
    if(q.mode==='hand'){
      if(!payload.cardInstanceId)throw new Error('Choose a card to discard from the revealed hand.');
      const chosen=target.hand.find(c=>c.instanceId===payload.cardInstanceId);if(!chosen)throw new Error('That card is no longer available.');
      if(actor.role!=='king' && chosen.side!==actor.role)throw new Error('You cannot take a card from the other role’s deck.');
      if(actor.role!=='king' && chosen.id==='royal-bomb')throw new Error('Royal Bomb cannot be stolen.');
      target.hand=target.hand.filter(c=>c.instanceId!==chosen.instanceId);
      if(actor.role==='king'){
        game.discard.push(chosen);
        log(game,`${actor.name} discarded a card from ${target.name}’s hand.`,`${actor.name} défausse une carte de la main de ${target.name}.`);
      }else{
        actor.hand.push(chosen);
        log(game,`${actor.name} took a card from ${target.name}’s hand.`,`${actor.name} prend une carte de la main de ${target.name}.`);
      }
    } else if(q.mode==='knight'){
      if(actor.role==='king')throw new Error('The King’s Sub Rosa cannot inspect a Knight.');
      if(target.hand.length){
        const stealable=target.hand.filter(c=>c.side===actor.role && c.id!=='royal-bomb');
        if(!stealable.length){finishPending(game,actor,q);return;}
        const stolen=stealable[Math.floor(game.rng()*stealable.length)];
        target.hand=target.hand.filter(c=>c.instanceId!==stolen.instanceId);
        actor.hand.push(stolen);
        log(game,`${actor.name} took a random card from ${target.name}’s hand after inspecting a Knight.`,`${actor.name} prend une carte au hasard de la main de ${target.name} après avoir inspecté un Chevalier.`);
      }
    }
    finishPending(game,actor,q);return;
  }
  if(q.type==='tithe'){
    if(p.id!==q.targetId)throw new Error('Only the chosen player can decide.');
    const payer=validateTarget(game,payload.payerId,{noble:true});if(payer.id===actor.id)throw new Error('Choose another Noble.');enforceGoldTakeProtection(game,actor,payer);changeGold(game,payer,-100);changeGold(game,actor,100);finishPending(game,actor,q);return;
  }
  if(q.type==='bendKnee'){
    if(p.id!==q.targetId)throw new Error('Only the chosen player can decide.');
    const accepted=payload.accept===true || p.gold<300;
    if(!accepted)changeGold(game,p,-300);
    log(game,accepted?`${p.name} thanks ${actor.name} and does not pay.`:`${p.name} refuses to thank ${actor.name} and pays 300 gold.`,accepted?`${p.name} remercie ${actor.name} et ne paie rien.`:`${p.name} refuse de remercier ${actor.name} et paie 300 pièces.`);
    finishPending(game,actor,q);return;
  }
  if(q.type==='anchor'){
    if(p.id!==q.targetId)throw new Error('Only Player A can resolve Anchor.');
    const a=playerById(game,q.targetId), b=playerById(game,q.target2Id);
    if(payload.choice==='lose200'){changeGold(game,a,-200);log(game,`${a.name} chooses to lose 200 gold.`,`${a.name} choisit de perdre 200 pièces.`);} else if(payload.choice==='lose100ToOther'){changeGold(game,b,-100);changeGold(game,actor,100);log(game,`${a.name} chooses to make ${b.name} lose 100 gold and takes 100.`,`${a.name} choisit de faire perdre 100 pièces à ${b.name} et prend 100 pièces.`);} else throw new Error('Choose an option.');
    finishPending(game,actor,q);return;
  }
  if(q.type==='debtCollector'){
    if(p.id!==q.targetId)throw new Error('Only the chosen player can choose.');
    const target=validateTarget(game,payload.targetId,{noble:true,notSelf:true,actor:p.id});if(target.id===q.targetId)throw new Error('Choose another Noble.');changeGold(game,target,-200);log(game,`${p.name} makes ${target.name} lose 200 gold.`,`${p.name} fait perdre 200 pièces à ${target.name}.`);finishPending(game,actor,q);return;
  }
  if(q.type==='loyalDog'){
    if(p.id!==q.targetId)throw new Error('Only the chosen player can acknowledge the loyalty pledge.');
    if(payload.ack!==true)throw new Error('The chosen player must acknowledge the loyalty pledge.');
    log(game,`${p.name} acknowledges the loyalty pledge and receives ${q.amount} gold.`,`${p.name} reconnaît le serment de loyauté et reçoit ${q.amount} pièces.`);
    finishPending(game,actor,q);return;
  }
  if(q.type==='royalParrot'){
    if(p.id!==q.targetId)throw new Error('Only the chosen player can respond.');
    const accepted=payload.accept===true;if(accepted)changeGold(game,p,-100);else changeGold(game,p,-300);
    log(game,accepted?`${p.name} repeats the sentence and pays 100 gold.`:`${p.name} refuses the sentence and pays 300 gold.`,accepted?`${p.name} répète la phrase et paie 100 pièces.`:`${p.name} refuse de répéter la phrase et paie 300 pièces.`);
    finishPending(game,actor,q);return;
  }
  if(q.type==='snakes'){
    if(!voteEligible)throw new Error('You cannot vote on this.');q.votes[p.id]=!!payload.vote;
    if(q.eligible.every(id=>id in q.votes)){const triggered=Object.values(q.votes).some(Boolean);if(triggered)changeGold(game,playerById(game,q.targetId),-300);log(game,triggered?`Snakes triggered: ${playerById(game,q.targetId)?.name||'the target'} loses 300 gold.`:`Snakes did not trigger: no Noble voted yes.`,triggered?`Serpents déclenchés : ${playerById(game,q.targetId)?.name||'la cible'} perd 300 pièces.`:`Serpents ne se déclenchent pas : aucun Noble n’a voté oui.`);finishPending(game,actor,q);}return;
  }
  if(q.type==='scapegoat'){
    if(p.id!==q.currentVoterId)throw new Error('Wait for the Noble whose turn it is to vote.');
    const target=validateTarget(game,payload.targetId,{noble:true,notSelf:true,actor:p.id});q.votes[p.id]=target.id;
    const nextIndex=q.eligible.findIndex(id=>id===p.id)+1;
    if(nextIndex<q.eligible.length){q.currentVoterId=q.eligible[nextIndex];return;}
    const counts={};Object.values(q.votes).forEach(id=>counts[id]=(counts[id]||0)+1);const max=Math.max(...Object.values(counts));const tied=Object.entries(counts).filter(([,v])=>v===max).map(([id])=>id);let victim=playerById(game,tied[0]);if(tied.length>1){const d=roll(game.rng);victim=playerById(game,tied[(d-1)%tied.length]);recordRoll(game,d,q.card.id);log(game,`Scapegoat tie resolved with a ${d}.`,`Égalité du Bouc émissaire résolue avec un ${d}.`);}changeGold(game,victim,-300);finishPending(game,actor,q);return;
  }
  if(q.type==='champion'){
    if(!voteEligible)throw new Error('You cannot vote on this.');q.votes[p.id]=!!payload.vote;if(q.eligible.every(id=>id in q.votes)){
      if(q.eligible.every(id=>q.votes[id])){
        const target=playerById(game,q.targetId);
        const k=king(game);
        if(target && k && target.id!==k.id){
          let a=roll(game.rng),b=roll(game.rng),guard=0;
          while(a===b && guard++<12){a=roll(game.rng);b=roll(game.rng);}
          if(a===b){b=(b%6)+1;}
          recordRolls(game,[a,b],q.card.id);
          const targetWins=a>b;
          const loser=targetWins?k:target;
          changeGold(game,loser,-100);
          log(game,`${target.name} and ${k.name} contested the crown (${a} vs ${b}).`,`${target.name} et ${k.name} disputent la couronne (${a} contre ${b}).`);
          if(targetWins)swapKing(game,target.id);
        }
        if(target && k && target.id===k.id)log(game,`${target.name} was nominated as People’s Champion but is already King.`,`${target.name} a été nommé Champion du peuple mais est déjà Roi.`);
      } else {
        log(game,`People’s Champion was not unanimous, so nothing happens.`,`Champion du peuple non unanime : aucun effet.`);
      }
      finishPending(game,actor,q);
    }return;
  }
  if(q.type==='weRide'){
    if(p.id!==q.actorId)throw new Error('Only the player who played the card resolves this.');
    const a=playerById(game,q.aId),b=playerById(game,q.bId);if(payload.split){changeGold(game,a,-100);changeGold(game,b,-100);}else changeGold(game,q.aRoll<q.bRoll?a:b,-200);finishPending(game,actor,q);return;
  }
  if(q.type==='actorsThank'){
    // handled above
    return;
  }
  throw new Error('Unsupported decision.');
}

function swapKing(game,newKingId,meta={}){
  const oldKing=king(game),newKing=playerById(game,newKingId);if(!oldKing||!newKing||oldKing.id===newKing.id)return;
  // If the Noble becoming King holds the Royal Bomb, it is discarded before
  // the physical hand swap, then a replacement Noble card is drawn immediately.
  // This prevents the Bomb from being transferred to the former King.
  const bombIndex=newKing.hand.findIndex(c=>c.id==='royal-bomb');
  if(bombIndex>=0){game.discard.push(newKing.hand.splice(bombIndex,1)[0]);drawToMinimum(game,newKing);}
  // Official guide: the new King physically swaps seats with the former King
  // and they swap cards. The shared King/Noble draw piles stay where they are.
  // In this online adaptation, the normal automatic gold-crown change also
  // swaps the two numeric gold amounts, as required by the project specification.
  const a=seatIndex(game,oldKing.id),b=seatIndex(game,newKing.id);[game.seatOrder[a],game.seatOrder[b]]=[game.seatOrder[b],game.seatOrder[a]];
  [oldKing.hand,newKing.hand]=[newKing.hand,oldKing.hand];
  if(meta.swapGold!==false)[oldKing.gold,newKing.gold]=[newKing.gold,oldKing.gold];
  oldKing.role='noble';newKing.role='king';game.kingId=newKing.id;game.kingChangedThisAction=true;
  // Existing face-down Knights and active commitments stay with their owners.
  // A crown change alone does not cancel Hindsight/Scout; those cards resolve at
  // their printed deadline. An Indebted effect is removed separately below only
  // when its debtor becomes King.
  for(const owner of game.players){
    owner.effects=owner.effects.filter(e=>!(e.type==='debt' && e.active && e.targetId===newKing.id));
    owner.effects=owner.effects.filter(e=>!(e.type==='bad_blood' && e.active && (e.a===newKing.id||e.b===newKing.id)));
  }
  log(game,`${newKing.name} became King.`,` ${newKing.name} devient Roi.`);
  game.crownJustDemotedId=oldKing.id;
  game.crownSuppressedIds?.add(oldKing.id);
  // If a crown change happens while a card decision is already pending, keep
  // the active resolution anchored to that card's actor. Otherwise the crown
  // change would silently interrupt the pending interaction.
  if(!game.pending)game.currentPlayerId=nextSeat(game,newKing.id)?.id || newKing.id;
}

export function negotiateGold(game,fromId,toId,amount){
  if(game.phase!=='negotiation')throw new Error('Negotiation is not active.');
  const from=playerById(game,fromId),to=playerById(game,toId);if(!from||!to||from.id===to.id)throw new Error('Invalid negotiation target.');
  const raw=Number(amount);if(!Number.isFinite(raw)||!Number.isInteger(raw)||raw<0||raw>400)throw new Error('Gold amount must be a whole number from 0 to 400.');const n=raw;if(n>from.gold)throw new Error('Not enough gold.');
  if((game.negotiation.received[to.id]||0)+n>400)throw new Error('A player cannot receive more than 400 gold in one negotiation phase.');
  if(game.effects.some(e=>e.type==='shifting'))enforceShiftingTransfer(game,from.id,to.id);
  if(n>0)enforceGoldTakeProtection(game,from,to);
  changeGold(game,from,-n);changeGold(game,to,n);game.negotiation.received[to.id]=(game.negotiation.received[to.id]||0)+n;
  log(game,`${from.name} gave ${n} gold to ${to.name}.`,`${from.name} donne ${n} pièces à ${to.name}.`);
}

export function giveCard(game,fromId,toId,instanceId){
  if(game.phase!=='negotiation')throw new Error('Cards may only be given during negotiation.');
  const from=playerById(game,fromId),to=playerById(game,toId);if(!from||!to||from.id===to.id)throw new Error('Invalid gift target.');
  const card=from.hand.find(c=>c.instanceId===instanceId);if(!card)throw new Error('Card not found.');
  if(card.id!=='royal-bomb')throw new Error('Only Royal Bomb may be given away directly.');
  if(to.role!==from.role)throw new Error('Cards cannot be given across roles.');
  const before=cardSnapshot(game);from.hand=from.hand.filter(c=>c.instanceId!==instanceId);to.hand.push(card);drawToMinimum(game,from);
  log(game,`${from.name} gave Royal Bomb to ${to.name}.`,`${from.name} donne la Bombe royale à ${to.name}.`);
  addCardEvent(game,'resolved',from,card,before,{textEn:`${from.name} gives the Royal Bomb to ${to.name}.`,textFr:`${from.name} donne la Bombe royale à ${to.name}.`});
  return {given:true,fromId:from.id,toId:to.id};
}

export function tradeCards(){
  throw new Error('Direct card swaps are disabled; use an explicit trade offer and acceptance.');
}

export function offerTrade(game,fromId,toId,giveId){
  if(game.phase!=='negotiation')throw new Error('Negotiation is not active.');
  const from=playerById(game,fromId),to=playerById(game,toId);if(!from||!to||from.id===to.id)throw new Error('Invalid trade target.');
  const card=from.hand.find(c=>c.instanceId===giveId);if(!card)throw new Error('Card not found.');
  if(card.side!==from.role || from.role!==to.role)throw new Error('Card offers cannot cross role decks.');
  const offers=game.negotiation.offers||new Map();game.negotiation.offers=offers;
  const counts=game.negotiation.offerCountByPlayer||new Map();game.negotiation.offerCountByPlayer=counts;
  const count=counts.get(fromId)||0;
  if(count>=20)throw new Error('You have too many open card offers.');
  if(offers.size>=200)throw new Error('Too many open card offers in this negotiation.');
  const offer={id:uid(),fromId,toId,giveId,createdAt:Date.now()};
  offers.set(offer.id,offer);counts.set(fromId,count+1);return offer;
}
export function respondTrade(game,targetId,offerId,receiveId,accept=true){
  if(game.phase!=='negotiation')throw new Error('Negotiation is not active.');
  const offer=game.negotiation.offers.get(offerId);if(!offer||offer.toId!==targetId)throw new Error('Trade offer not found.');
  game.negotiation.offers.delete(offerId);
  const counts=game.negotiation.offerCountByPlayer;if(counts){const next=Math.max(0,(counts.get(offer.fromId)||1)-1);if(next)counts.set(offer.fromId,next);else counts.delete(offer.fromId);}
  if(!accept)return {accepted:false};
  const from=playerById(game,offer.fromId),to=playerById(game,offer.toId);if(!from||!to)throw new Error('Player unavailable.');
  const give=from.hand.find(c=>c.instanceId===offer.giveId),receive=to.hand.find(c=>c.instanceId===receiveId);if(!give||!receive)throw new Error('Both cards must still be in the players’ hands.');
  if(from.role!==to.role || give.side!==from.role || receive.side!==to.role)throw new Error('Card trades cannot cross role decks.');
  from.hand=from.hand.filter(c=>c.instanceId!==give.instanceId);to.hand=to.hand.filter(c=>c.instanceId!==receive.instanceId);from.hand.push(receive);to.hand.push(give);
  log(game,`${from.name} and ${to.name} exchanged cards.`,`${from.name} et ${to.name} ont échangé des cartes.`);return {accepted:true,fromId:from.id,toId:to.id,give,receive};
}

export function discardByDeal(game,fromId,targetId,instanceId){
  if(game.phase!=='negotiation')throw new Error('Negotiation is not active.');
  const a=playerById(game,fromId),t=playerById(game,targetId);if(!a||!t||a.id===t.id)throw new Error('A deal needs another player.');
  const c=a.hand.find(x=>x.instanceId===instanceId);if(!c)throw new Error('Card not found.');
  if(c.id!=='royal-bomb')throw new Error('Only Royal Bomb may be discarded during negotiation.');
  const before=cardSnapshot(game);
  a.hand=a.hand.filter(x=>x.instanceId!==instanceId);game.discard.push(c);drawToMinimum(game,a);log(game,`${a.name} discarded Royal Bomb as part of a negotiation.`,`${a.name} défausse la Bombe royale pendant une négociation.`);
  addCardEvent(game,'resolved',a,c,before,{textEn:`${a.name} discards Royal Bomb as part of a deal.`,textFr:`${a.name} défausse la Bombe royale dans le cadre d’un accord.`});
}

export function placeKnight(game,playerId,instanceId,targetId){
  if(game.phase!=='playing')throw new Error('Knights can only be placed during the playing phase.');
  const p=playerById(game,playerId);
  if(!p||game.currentPlayerId!==p.id)throw new Error('It is not your turn.');
  const t=validateTarget(game,targetId,{noble:true});
  const c=p.hand.find(x=>x.instanceId===instanceId);
  if(!c)throw new Error('Card not found.');
  if(c.side!==p.role)throw new Error('You cannot place a card from the other deck.');
  const before=cardSnapshot(game);
  p.hand=p.hand.filter(x=>x.instanceId!==instanceId);
  const real=c.effect==='knight';
  t.knights.push({id:uid(),ownerId:t.id,placerId:p.id,placerRole:p.role,real,card:c});
  finishPlayedCard(game,p,c,{discard:false,count:true});
  addCardEvent(game,'resolved',p,c,before,{
    hidden:true,
    textEn:`${p.name} places a face-down card on ${t.name}. Its true identity remains hidden.`,
    textFr:`${p.name} pose une carte face cachée chez ${t.name}. Sa véritable identité reste cachée.`
  });
  return {placed:true,knightId:t.knights.at(-1)?.id||null,real,protection:p.role};
}

// Backward-compatible export for older clients/tests; the action now applies to
// every card and every player, not only to the Noble Knight card.
export const placeBluffKnight=placeKnight;

export function inspectKnight(game,playerId,knightId){
  const p=playerById(game,playerId);
  if(!p)throw new Error('Player not found.');
  const k=p.knights.find(x=>x.id===knightId);
  if(!k)throw new Error('That face-down card is not yours.');
  return {id:k.id,real:k.real,cardId:k.card.id,cardName:{en:k.card.en,fr:k.card.fr},protection:k.placerRole||'noble'};
}

export function markTurnDone(game,playerId){
  const p=playerById(game,playerId);if(!p||game.currentPlayerId!==p.id)throw new Error('It is not your turn.');
  const limit=(p.role==='king'?(game.players.length===4?2:3):2)+p.extraPlays;
  if(p.playedThisTurn<limit)throw new Error('You must play all required cards before ending your turn.');
}

export function settleBadBlood(game,playerId){
  if(game.phase!=='playing' && game.phase!=='negotiation')throw new Error('This action is not available now.');
  const p=playerById(game,playerId);if(!p || p.role!=='noble')throw new Error('Only a Noble can settle Bad Blood.');
  const owner=game.players.find(x=>x.effects.some(e=>e.type==='bad_blood'&&e.active&&(e.a===p.id||e.b===p.id)));
  const effect=owner?.effects.find(e=>e.type==='bad_blood'&&e.active&&(e.a===p.id||e.b===p.id));
  if(!effect)throw new Error('You have no active Bad Blood obligation.');
  const otherId=effect.a===p.id?effect.b:effect.a;
  const other=playerById(game,otherId);if(!other||other.role!=='noble')throw new Error('The other Noble is unavailable.');
  if(p.gold<200)throw new Error('You need 200 gold to settle Bad Blood.');
  changeGold(game,p,-200);changeGold(game,other,200);
  for(const x of game.players)x.effects=x.effects.filter(e=>!(e.type==='bad_blood'&&e.active&&e.a===effect.a&&e.b===effect.b));
  log(game,`${p.name} paid ${other.name} 200 gold and ended Bad Blood.`,`${p.name} paie 200 pièces à ${other.name} et met fin au Sang mêlé.`);
}

export function settleDebt(game,playerId,debtOwnerId){
  if(game.phase!=='playing' && game.phase!=='negotiation')throw new Error('This action is not available now.');
  const payer=playerById(game,playerId), owner=playerById(game,debtOwnerId);
  if(!payer||!owner)throw new Error('Player not found.');
  if(payer.id===owner.id)throw new Error('The debt owner cannot free their own debtor.');
  const debt=owner.effects.find(e=>e.type==='debt'&&e.active&&e.targetId!==payer.id);
  if(!debt)throw new Error('No debt can be settled for that player.');
  const debtor=playerById(game,debt.targetId);
  if(!debtor||debtor.role!=='noble')throw new Error('The debtor is unavailable.');
  if(payer.gold<200)throw new Error('You need 200 gold to settle the debt.');
  changeGold(game,payer,-200);changeGold(game,owner,200);
  owner.effects=owner.effects.filter(e=>e!==debt);
  log(game,`${payer.name} paid ${owner.name} 200 gold to free ${debtor.name}.`,`${payer.name} paie 200 pièces à ${owner.name} pour libérer ${debtor.name}.`);
}

export function discardRoyalBomb(game,playerId,instanceId){
  if(game.phase!=='negotiation')throw new Error('Royal Bomb can only be discarded during negotiation.');
  const p=playerById(game,playerId);if(!p)throw new Error('Player not found.');
  const c=p.hand.find(x=>x.instanceId===instanceId);if(!c||c.id!=='royal-bomb')throw new Error('That card is not a Royal Bomb.');
  const before=cardSnapshot(game);
  p.hand=p.hand.filter(x=>x.instanceId!==instanceId);game.discard.push(c);drawToMinimum(game,p);
  log(game,`${p.name} discarded Royal Bomb during negotiation.`,`${p.name} défausse la Bombe royale pendant les négociations.`);
  addCardEvent(game,'resolved',p,c,before,{textEn:`${p.name} discards the Royal Bomb during negotiation.`,textFr:`${p.name} défausse la Bombe royale pendant les négociations.`});
}

export function action(game,playerId,msg){
  game.crownJustDemotedId=null;
  game.kingChangedThisAction=false;
  const actionId=String(msg.actionId||'');
  const seen=actionId?(game.actionHistory.get(playerId)||new Set()):null;
  if(seen&&seen.has(actionId))return {duplicate:true};
  tick(game);
  if(game.phase==='kingReveal')throw new Error('The King reveal is still in progress.');
  let result;
  switch(msg.type){
    case'playCard': result=playCard(game,playerId,msg.instanceId,msg.payload||{});break;
    case'decision': result=decide(game,playerId,msg.payload||{});break;
    case'negotiateGold': result=negotiateGold(game,playerId,msg.targetId,msg.amount);break;
    case'tradeCards': result=tradeCards(game,playerId,msg.targetId,msg.giveCardId,msg.receiveCardId);break;
    case'giveCard': result=giveCard(game,playerId,msg.targetId,msg.instanceId);break;
    case'offerTrade': result=offerTrade(game,playerId,msg.targetId,msg.giveCardId);break;
    case'respondTrade': result=respondTrade(game,playerId,msg.offerId,msg.receiveCardId,msg.accept!==false);break;
    case'discardByDeal': result=discardByDeal(game,playerId,msg.targetId,msg.instanceId);break;
    case'placeBluffKnight':
    case'placeKnight': result=placeKnight(game,playerId,msg.instanceId,msg.targetId);break;
    case'inspectKnight': result=inspectKnight(game,playerId,msg.knightId);break;
    case'settleBadBlood': result=settleBadBlood(game,playerId);break;
    case'settleDebt': result=settleDebt(game,playerId,msg.debtOwnerId);break;
    case'discardRoyalBomb': result=discardRoyalBomb(game,playerId,msg.instanceId);break;
    default: throw new Error('Unknown game action.');
  }
  // Gold can change through cards, negotiations or out-of-turn settlements.
  // The physical rules make the crown contest automatic whenever a Noble has
  // more gold than the current King, so check after every authoritative action.
  checkGoldCrown(game);
  if(seen&&actionId){
    seen.add(actionId);
    while(seen.size>100)seen.delete(seen.values().next().value);
    game.actionHistory.set(playerId,seen);
  }
  return result;
}

function publicPending(game,viewerId){
  const q=game.pending;if(!q)return null;
  const base={type:q.type,actorId:q.actorId,cardId:q.card?.id,targetId:q.targetId,eligible:q.eligible?.slice(),answered:q.votes?Object.keys(q.votes):q.supports?.map(x=>x.playerId)};
  if(q.type==='subRosa' && viewerId===q.actorId){base.mode=q.mode||null;base.roll=q.roll??null;}
  if(q.type==='scapegoat') base.currentVoterId=q.currentVoterId;
  if(q.type==='weRide')Object.assign(base,{aId:q.aId,bId:q.bId,aRoll:q.aRoll,bRoll:q.bRoll});
  if(q.type==='actorsThank')base.acked=Object.keys(q.acks||{});
  if(q.type==='loyalDog' || q.type==='royalParrot')base.phrase=q.phrase;
  return base;
}

export function publicState(game,viewerId){
  tick(game);
  const viewer=playerById(game,viewerId);if(!viewer)throw new Error('Viewer not found.');
  return {
    phase:game.phase,round:game.round,direction:game.direction,currentPlayerId:game.currentPlayerId,kingId:game.kingId,
    lastRoll:game.lastRoll??null,lastRolls:Array.isArray(game.lastRolls)?[...game.lastRolls]:null,rollEventId:game.rollEventId||0,rollEvents:(game.rollEvents||[]).slice(-20).map(e=>({id:e.id,rolls:[...e.rolls],cardId:e.cardId||null})),
    kingReveal:game.kingReveal?{startedAt:game.kingReveal.startedAt,endsAt:game.kingReveal.endsAt}:null,
    negotiation:game.negotiation?{startedAt:game.negotiation.startedAt,endsAt:game.negotiation.endsAt,received:game.negotiation.received[viewerId]||0}:null,
    players:game.players.map(p=>({id:p.id,name:p.name,role:p.role,gold:p.gold,connected:p.connected,handCount:p.hand.length,playedThisTurn:p.playedThisTurn||0,turnLimit:turnLimit(game,p),knights:p.knights.map(k=>({id:k.id,ownerId:k.ownerId,protection:k.placerRole==='king'?'king':'noble'})),commitments:p.commitments.map(c=>({type:c.type,targetId:c.targetId,untilRound:c.untilRound})),effects:p.effects.map(e=>({type:e.type,targetId:e.targetId,a:e.a,b:e.b,expiresAtTurnSerial:e.expiresAtTurnSerial}))})),
    hand:viewer.hand.map(c=>({instanceId:c.instanceId,id:c.id,side:c.side,en:c.en,fr:c.fr,desc:c.desc,effect:c.effect})),viewerTurn:{played:viewer.playedThisTurn||0,limit:turnLimit(game,viewer)},
    discard:game.discard.map(c=>({id:c.id,en:c.en,fr:c.fr})).slice(-30),
    deckCounts:{king:game.kingDeck.length,noble:game.nobleDeck.length},
    log:game.log.slice(-100),cardEvents:(game.cardEvents||[]).slice(-15),chat:(game.chat||[]).slice(-100),pending:publicPending(game,viewerId),
    rules:{handSize:8,negotiationSeconds:NEGOTIATION_SECONDS,maxGold:MAX_GOLD,minGold:MIN_GOLD}
  };
}
