import crypto from 'node:crypto';
import {createGame, action, publicState, playerById, tick, checkGoldCrown, inspectKnight} from './game-engine.js';

// Isolated DEV state hosted by the normal backend process.
// This is intentionally a separate game instance and separate API namespace;
// it never touches the real multiplayer rooms.
let devGame=null;
const uid=()=>crypto.randomUUID();
const devPlayers=()=>Array.from({length:4},(_,i)=>({id:`dev-${i+1}`,name:`DEV ${i+1}`,connected:true}));
function ensure(){if(!devGame)devGame=createGame(devPlayers(),Math.random);return devGame;}
function incomingOffers(viewerId){
  const g=ensure(); if(!g.negotiation?.offers)return [];
  const out=[];
  for(const offer of g.negotiation.offers.values()){
    if(offer.toId!==viewerId)continue;
    const from=playerById(g,offer.fromId); const card=from?.hand.find(c=>c.instanceId===offer.giveId);
    if(card)out.push({id:offer.id,fromId:offer.fromId,fromName:from.name,card:{id:card.id,en:card.en,fr:card.fr}});
  }
  return out;
}
function response(viewerId){
  const g=ensure();
  return {state:{...publicState(g,viewerId),room:{code:'DEV',name:'DEV COURT',public:false,max:4,lang:'fr'}},players:g.players.map(p=>({id:p.id,name:p.name})),incomingTradeOffers:incomingOffers(viewerId)};
}

export function mountDevApi(app){
  app.get('/api/dev-standalone/health',(_,res)=>res.json({ok:true,service:'okoc-dev',isolated:true,hostedBy:'main-server'}));
  app.get('/api/dev-standalone/debug/fail',(_,res)=>res.status(503).json({error:'Test d’erreur API DEV contrôlé : le serveur a volontairement répondu 503.'}));
  app.get('/api/dev-standalone/state',(req,res)=>{
    try{
      const g=ensure();
      tick(g);
 const id=String(req.query.playerId||g.players[0].id);
      if(!playerById(g,id))return res.status(400).json({error:'Unknown dev player'});
      res.json(response(id));
    }catch(e){res.status(500).json({error:e?.message||'DEV state error'});}
  });
  app.post('/api/dev-standalone/reset',(_,res)=>{
    try{devGame=createGame(devPlayers(),Math.random);res.json({ok:true});}
    catch(e){res.status(500).json({error:e?.message||'DEV reset error'});}
  });
  app.post('/api/dev-standalone/action',(req,res)=>{
    try{
      const g=ensure();
      tick(g);
      const playerId=String(req.body?.playerId||'');
      if(!playerById(g,playerId))throw new Error('Unknown dev player.');
      const msg=req.body?.action||{};
      let privatePeek=null; let privateKnight=null;
      if(msg.type==='decision' && g.pending?.type==='subRosa' && g.pending.actorId===playerId && msg.payload?.mode==='hand'){
        const target=playerById(g,g.pending.targetId);
        if(target) privatePeek=target.hand.map(c=>({instanceId:c.instanceId,id:c.id,en:c.en,fr:c.fr,desc:c.desc}));
      }
      if(msg.type==='decision' && g.pending?.type==='subRosa' && g.pending.actorId===playerId && msg.payload?.mode==='knight'){
        const target=playerById(g,g.pending.targetId); const k=target?.knights?.[0]; if(k) privateKnight={id:k.id,real:!!k.real,cardId:k.card.id,cardName:{en:k.card.en,fr:k.card.fr},protection:k.placerRole||'noble',source:'subRosa'};
      }
      if(msg.type==='chat'){
        const text=String(msg.text||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,500);
        if(text){g.chat=g.chat||[];g.chat.push({id:uid(),playerId,name:playerById(g,playerId).name,text,ts:Date.now()});g.chat=g.chat.slice(-100);}
      }else if(msg.type==='endNegotiation'){
        if(g.phase!=='negotiation')throw new Error('Negotiation is not active.');
        g.negotiation.earlyVotes=g.negotiation.earlyVotes||{};g.negotiation.earlyVotes[playerId]=true;
        const active=g.players.filter(p=>p.connected!==false).map(p=>p.id);
        if(active.every(id=>g.negotiation.earlyVotes[id])){g.negotiation.endsAt=Date.now();tick(g);}
      }else if(msg.type==='devSetGold'){
        const target=playerById(g,String(msg.targetId));if(!target)throw new Error('Unknown target.');
        target.gold=Math.max(0,Math.min(2000,Math.trunc(Number(msg.gold)||0)));checkGoldCrown(g);
      }else if(msg.type==='devAddGold'){
        const target=playerById(g,String(msg.targetId));if(!target)throw new Error('Unknown target.');
        target.gold=Math.max(0,Math.min(2000,target.gold+Math.trunc(Number(msg.amount)||0)));checkGoldCrown(g);
      }else if(msg.type==='devForceCrownCheck')checkGoldCrown(g);
      else if(msg.type==='devDraw')throw new Error('Manual drawing is disabled in DEV.');
      else if(msg.type==='inspectKnight') privateKnight={...inspectKnight(g,playerId,msg.knightId),source:'owner'};
      else action(g,playerId,{...msg,actionId:String(msg.actionId||uid())});
      const out=response(playerId);
      if(privatePeek) out.privatePeek=privatePeek;
      if(privateKnight!==null) out.privateKnight=privateKnight;
      res.json(out);
    }catch(e){res.status(400).json({error:e?.message||'Invalid dev action'});}
  });
}
