import express from 'express';
import {createServer} from 'node:http';
import {WebSocketServer} from 'ws';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGame, action, publicState, playerById, tick, inspectKnight} from './game-engine.js';
import {mountDevApi} from './dev-api.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'32kb'}));
app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https://quickchart.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'self'; object-src 'none'");
  next();
});
const server=createServer(app);
const wss=new WebSocketServer({server,path:'/ws',maxPayload:32*1024});
const rooms=new Map();
const sessions=new Map();
const MAX_ROOMS=200;
const WS_MESSAGES_PER_WINDOW=80;
const WS_RATE_WINDOW_MS=10000;
const roomActivity = new Map();
const letters='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const uid=()=>crypto.randomBytes(32).toString('base64url');
const roomCode=()=>{let c;do{c=Array.from({length:6},()=>letters[Math.floor(Math.random()*letters.length)]).join('')}while(rooms.has(c));return c};
const clientDist=path.join(__dirname,'../client/dist');

app.get('/health',(_,res)=>res.json({ok:true,rooms:rooms.size}));
app.get('/api/rooms',(_,res)=>res.json([...rooms.values()].filter(r=>r.public&&r.game?.phase==='lobby').map(r=>({code:r.code,name:r.name,count:r.game.players.length,max:r.max,lang:r.lang}))));

// DEV is a local/development tool. Never expose its control API on a production deployment
// unless the operator explicitly opts in.
if(process.env.NODE_ENV!=='production' || process.env.OKOC_DEV_MODE==='1')mountDevApi(app);
if(fs.existsSync(clientDist)){app.use(express.static(clientDist));app.get('/dev',(_,res)=>res.sendFile(path.join(clientDist,'dev.html')));app.get('/{*splat}',(_,res)=>res.sendFile(path.join(clientDist,'index.html')))}

function send(ws,msg){if(ws?.readyState===1)ws.send(JSON.stringify(msg));}
function playerSessionToken(){return uid();}
function removePlayerSession(r,playerId){
  const token=r.tokens.get(playerId);
  if(token){sessions.delete(token);r.tokens.delete(playerId);}
}
function markRoomActivity(r){roomActivity.set(r.code,Date.now());}
function closeRoom(r){
  for(const p of r.game?.players||[]){
    removePlayerSession(r,p.id);
    const socket=r.sockets.get(p.id);
    if(socket?.readyState===1)socket.close(1000,'Room closed.');
  }
  r.sockets.clear();rooms.delete(r.code);roomActivity.delete(r.code);
}
function roomState(r,viewerId){const state=publicState(r.game,viewerId);state.players=state.players.map(p=>({...p,host:r.host===p.id}));return {room:{code:r.code,name:r.name,public:r.public,max:r.max,lang:r.lang},...state};}
function broadcast(r){for(const p of r.game.players){send(r.sockets.get(p.id),{type:'state',state:roomState(r,p.id)});}}
function broadcastError(ws,message){send(ws,{type:'error',message});}
function sanitizeName(v){return String(v??'').normalize('NFKC').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g,'').trim().slice(0,24);}
function sanitizeRoomName(v){return String(v??'').normalize('NFKC').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g,'').trim().slice(0,40);}
function findPlayerBySession(token){return sessions.get(token)||null;}
function getRoomPlayer(r,playerId){return playerById(r.game,playerId);}

function createRoom(msg){
  if(rooms.size>=MAX_ROOMS)throw new Error('The server is temporarily full. Try again later.');
  const name=sanitizeRoomName(msg.name)||'Royal Court';
  const max=Math.max(4,Math.min(8,Number(msg.max)||8));
  const lang=['fr','en'].includes(msg.lang)?msg.lang:'fr';
  const r={code:roomCode(),name,public:!!msg.public,max,lang,host:null,game:null,sockets:new Map(),tokens:new Map(),createdAt:Date.now()};
  rooms.set(r.code,r);return r;
}
function addLobbyPlayer(r,name){
  if(r.game && r.game.phase!=='lobby')throw new Error('The game has already started.');
  if(r.game?.players.length>=r.max)throw new Error('Room is full.');
  if(r.game?.players.some(p=>p.name.toLowerCase()===name.toLowerCase()))throw new Error('That name is already used.');
  const p={id:crypto.randomUUID(),name,role:null,gold:0,hand:[],knights:[],effects:[],commitments:[],connected:true};
  if(!r.game){r.game={phase:'lobby',players:[],seatOrder:[],log:[],chat:[],round:0,direction:1,currentPlayerId:null,kingId:null,kingDeck:[],nobleDeck:[],discard:[],pending:null,negotiation:null};}
  r.game.players.push(p);r.game.seatOrder.push(p.id);if(!r.host)r.host=p.id;return p;
}
function startRoom(r,requesterId){
  if(r.host!==requesterId)throw new Error('Only the room admin can start the game.');
  if(r.game.players.length<4)throw new Error('At least 4 players are required.');
  const lobbyPlayers=r.game.players.map(p=>({id:p.id,name:p.name,connected:p.connected}));
  const game=createGame(lobbyPlayers);
  r.game=game;
  // Preserve socket/session mappings.
  for(const p of game.players){if(r.sockets.has(p.id))p.connected=true;}
}
function removeLobbyPlayer(r,pid){
  if(r.game.phase!=='lobby')return;
  r.game.players=r.game.players.filter(p=>p.id!==pid);r.game.seatOrder=r.game.seatOrder.filter(id=>id!==pid);r.sockets.delete(pid);removePlayerSession(r,pid);
  if(r.host===pid)r.host=r.game.players[0]?.id||null;
}
function sendPrivatePeek(ws,cards){send(ws,{type:'privatePeek',cards:cards.map(c=>({instanceId:c.instanceId,id:c.id,en:c.en,fr:c.fr,desc:c.desc}))});}
function publicPendingNeedsPrivatePeek(game,playerId){return game.pending?.type==='subRosa' && game.pending.actorId===playerId;}
function handleGameAction(r,p,msg){
  const beforePending=r.game.pending;
  action(r.game,p.id,{...msg,actionId:String(msg.actionId||uid())});
  // Sub Rosa deliberately reveals private information only to the actor.
  if(msg.type==='decision' && beforePending?.type==='subRosa' && beforePending.actorId===p.id && msg.payload?.mode==='hand'){
    const target=playerById(r.game,beforePending.targetId);if(target){sendPrivatePeek(r.sockets.get(p.id),target.hand);}
  }
  if(msg.type==='decision' && beforePending?.type==='subRosa' && beforePending.actorId===p.id && msg.payload?.mode==='knight'){
    const target=playerById(r.game,beforePending.targetId);const k=target?.knights?.[0];
    if(k)send(r.sockets.get(p.id),{type:'privateKnight',id:k.id,real:!!k.real,cardId:k.card.id,cardName:{en:k.card.en,fr:k.card.fr},protection:k.placerRole||'noble',source:'subRosa'});
  }
  if(msg.type==='inspectKnight'){
    const result=inspectKnight(r.game,p.id,msg.knightId);
    send(r.sockets.get(p.id),{type:'privateKnight',...result,source:'owner'});
  }
}
function adminAction(r,p,msg){
  if(r.host!==p.id)throw new Error('Only the room admin can do that.');
  if(r.game.phase!=='lobby')throw new Error('Room settings can only be changed before the game starts.');
  if(msg.type==='roomSettings'){
    if(msg.name!==undefined){const name=sanitizeRoomName(msg.name);if(!name)throw new Error('Room name cannot be empty.');r.name=name;}
    if(msg.public!==undefined)r.public=!!msg.public;
    if(msg.max!==undefined){const max=Math.max(4,Math.min(8,Number(msg.max)||8));if(max<r.game.players.length)throw new Error('Maximum players cannot be below the current player count.');r.max=max;}
    if(msg.lang!==undefined){if(!['fr','en'].includes(msg.lang))throw new Error('Unsupported room language.');r.lang=msg.lang;}
  } else if(msg.type==='kick'){
    if(msg.playerId===p.id)throw new Error('The admin cannot kick themselves.');const target=getRoomPlayer(r,msg.playerId);if(!target)throw new Error('Player not found.');const ws=r.sockets.get(target.id);removeLobbyPlayer(r,target.id);send(ws,{type:'kicked',message:'You were removed from the room by the admin.'});return;
  } else if(msg.type==='transferHost'){
    const target=getRoomPlayer(r,msg.playerId);if(!target)throw new Error('Player not found.');r.host=target.id;
  } else if(msg.type==='closeRoom'){
    closeRoom(r);return;
  } else if(msg.type==='start'){
    startRoom(r,p.id);
  }
}

wss.on('connection',(ws)=>{
  let bound=null;
  let windowStarted=Date.now();
  let messageCount=0;
  ws.on('message',raw=>{
    const now=Date.now();
    if(now-windowStarted>=WS_RATE_WINDOW_MS){windowStarted=now;messageCount=0;}
    if(++messageCount>WS_MESSAGES_PER_WINDOW){ws.close(1008,'Too many messages.');return;}
    if(raw.length>32*1024){ws.close(1009,'Message too large.');return;}
    try{
      const msg=JSON.parse(raw.toString());if(!msg || typeof msg!=='object')throw new Error('Invalid message.');
      if(msg.type==='create'){
        if(bound)throw new Error('This connection is already attached to a room.');
        const name=sanitizeName(msg.player);if(!name)throw new Error('Enter a player name.');
        const r=createRoom(msg);const p=addLobbyPlayer(r,name);const token=playerSessionToken();r.tokens.set(p.id,token);sessions.set(token,{room:r.code,playerId:p.id});r.sockets.set(p.id,ws);bound={r,p,token};markRoomActivity(r);send(ws,{type:'session',session:token,room:r.code,playerId:p.id});broadcast(r);return;
      }
      if(msg.type==='join'){
        if(bound)throw new Error('This connection is already attached to a room.');
        const code=String(msg.code||'').trim().toUpperCase();const r=rooms.get(code);if(!r)throw new Error('Room not found.');if(r.game.phase!=='lobby')throw new Error('The game has already started.');
        const name=sanitizeName(msg.player);if(!name)throw new Error('Enter a player name.');const p=addLobbyPlayer(r,name);const token=playerSessionToken();r.tokens.set(p.id,token);sessions.set(token,{room:r.code,playerId:p.id});r.sockets.set(p.id,ws);bound={r,p,token};markRoomActivity(r);send(ws,{type:'session',session:token,room:r.code,playerId:p.id});broadcast(r);return;
      }
      if(msg.type==='reconnect'){
        if(bound)throw new Error('This connection is already attached to a room.');
        const oldToken=String(msg.session||'');
        const session=findPlayerBySession(oldToken);if(!session)throw new Error('Session expired.');
        const r=rooms.get(session.room);if(!r)throw new Error('Room no longer exists.');
        const p=getRoomPlayer(r,session.playerId);if(!p)throw new Error('Player no longer exists.');
        const oldSocket=r.sockets.get(p.id);if(oldSocket&&oldSocket!==ws)oldSocket.close(4001,'Session moved to another connection.');
        sessions.delete(oldToken);r.tokens.delete(p.id);
        const token=playerSessionToken();r.tokens.set(p.id,token);sessions.set(token,{room:r.code,playerId:p.id});
        p.connected=true;r.sockets.set(p.id,ws);bound={r,p,token};markRoomActivity(r);
        send(ws,{type:'session',session:token,room:r.code,playerId:p.id});
        broadcast(r);return;
      }
      if(!bound)throw new Error('Join or create a room first.');
      const {r,p}=bound;
      if(r.sockets.get(p.id)!==ws)throw new Error('This connection has been replaced. Reconnect with your current session.');
      markRoomActivity(r);
      if(msg.type==='chat'){
        const text=String(msg.text||'').normalize('NFKC').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g,'').trim().slice(0,500);if(text){r.game.chat=r.game.chat||[];r.game.chat.push({id:crypto.randomUUID(),playerId:p.id,name:p.name,text,ts:Date.now()});r.game.chat=r.game.chat.slice(-100);}broadcast(r);return;
      }
      if(msg.type==='ready'){if(r.game.phase!=='lobby')throw new Error('The lobby is closed.');p.ready=!!msg.value;broadcast(r);return;}
      if(['roomSettings','kick','transferHost','closeRoom','start'].includes(msg.type)){adminAction(r,p,msg);broadcast(r);return;}
      if(msg.type==='endNegotiation'){
        // The physical rules allow the group to move on early by mutual agreement; online, require all connected players to agree.
        if(r.game.phase!=='negotiation')throw new Error('Negotiation is not active.');
        r.game.negotiation.earlyVotes=r.game.negotiation.earlyVotes||{};r.game.negotiation.earlyVotes[p.id]=true;
        const active=r.game.players.filter(x=>x.connected!==false).map(x=>x.id);if(active.every(id=>r.game.negotiation.earlyVotes[id])){r.game.negotiation.endsAt=Date.now();tick(r.game);}
        broadcast(r);return;
      }
      if(msg.type==='offerTrade'){
        const result=action(r.game,p.id,{...msg,actionId:String(msg.actionId||uid())});
        if(result?.id){const target=playerById(r.game,msg.targetId);const offered=playerById(r.game,p.id)?.hand.find(c=>c.instanceId===msg.giveCardId);send(r.sockets.get(msg.targetId),{type:'tradeOffer',offer:{id:result.id,fromId:p.id,fromName:p.name,card:offered?{id:offered.id,en:offered.en,fr:offered.fr}:null}});}
      } else if(msg.type==='respondTrade'){
        const result=action(r.game,p.id,{...msg,actionId:String(msg.actionId||uid())});
        if(result?.accepted){send(r.sockets.get(result.fromId),{type:'tradeCompleted',message:'Trade accepted.'});}
      } else {handleGameAction(r,p,msg);}
      broadcast(r);
    }catch(e){broadcastError(ws,e?.message||'Invalid action.');}
  });
  ws.on('close',()=>{
    if(!bound)return;const {r,p}=bound;if(r.sockets.get(p.id)!==ws)return;p.connected=false;r.sockets.delete(p.id);markRoomActivity(r);if(r.game?.phase==='lobby'&&r.game.players.every(x=>x.connected===false)){closeRoom(r);return;}broadcast(r);
  });
});

setInterval(()=>{
  const now=Date.now();
  for(const r of [...rooms.values()]){
    if(!r.game)continue;
    const before=r.game.phase;tick(r.game);
    if(before!==r.game.phase || r.game.phase==='kingReveal' || r.game.phase==='negotiation')broadcast(r);
    const active=r.game.players.some(p=>p.connected!==false);
    const last=roomActivity.get(r.code)||r.createdAt;
    if(!active && now-last>30*60*1000)closeRoom(r);
    else if(r.game.phase==='gameover' && now-last>60*60*1000)closeRoom(r);
  }
},250);

const PORT=process.env.PORT||10000;
server.listen(PORT,'0.0.0.0',()=>console.log(`OKOC server listening on ${PORT}`));
