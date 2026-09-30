import React,{useCallback,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Game,I18N} from './main.jsx';
import './style.css';

const PLAYERS=['dev-1','dev-2','dev-3','dev-4'];
const DEV_API_BASE='/api/dev-standalone';
const API=DEV_API_BASE;
const STATE_API='/api/dev-standalone/state';
const ACTION_API='/api/dev-standalone/action';

class DevErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={error:null}}
  static getDerivedStateFromError(error){return {error}}
  componentDidCatch(error,info){console.error('[OKOC DEV]',error,info)}
  render(){
    if(!this.state.error)return this.props.children;
    return <main className="dev-fatal"><section className="dev-fatal-card"><span className="eyebrow">OKOC ONLINE · DEV</span><h1>ERREUR DEV</h1><p>Le mode DEV a rencontré une erreur JavaScript. Le jeu normal reste indépendant.</p><pre>{this.state.error?.stack||this.state.error?.message||String(this.state.error)}</pre><button onClick={()=>this.setState({error:null})}>RÉESSAYER</button></section></main>
  }
}

function DevApp(){
  const [playerId,setPlayerId]=useState(()=>localStorage.getItem('okocDevPlayer')||PLAYERS[0]);
  const [state,setState]=useState(null);
  const [selected,setSelected]=useState(null);
  const [chat,setChat]=useState('');
  const [peek,setPeek]=useState(null);
  const [privateKnight,setPrivateKnight]=useState(null);
  const [tradeOffer,setTradeOffer]=useState(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [panelOpen,setPanelOpen]=useState(true);
  const [gold,setGold]=useState('1000');
  const [lastAction,setLastAction]=useState('Initialisation');

  const request=useCallback(async(path,options={})=>{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),5000);
    try{
      const r=await fetch(API+path,{...options,signal:controller.signal,headers:{Accept:'application/json','Content-Type':'application/json',...(options.headers||{})}});
      const raw=await r.text();let data={};
      try{data=raw?JSON.parse(raw):{}}catch{throw new Error(`Réponse DEV invalide (${r.status}) depuis ${r.url||API+path}.`)}
      if(!r.ok)throw new Error(data.error||`Erreur DEV HTTP ${r.status}.`);
      return data;
    }catch(e){
      if(e.name==='AbortError')throw new Error('Le serveur DEV ne répond pas dans le délai prévu.');
      throw e;
    }finally{clearTimeout(timeout)}
  },[]);

  const apply=useCallback((data)=>{
    if(!data?.state)throw new Error('Le serveur DEV a répondu sans état de partie.');
    setState(data.state);
    const me=data.state.players?.find(p=>p.id===playerId);
    setGold(String(me?.gold??1000));
    if(data.privatePeek) setPeek(data.privatePeek);
    if(data.privateKnight!==undefined) setPrivateKnight(data.privateKnight);
    if(data.incomingTradeOffers?.length) setTradeOffer(data.incomingTradeOffers[0]);
    setError('');
  },[playerId]);

  const load=useCallback(async(id=playerId)=>{
    setLoading(true);setError('');
    try{localStorage.setItem('okocDevPlayer',id);localStorage.setItem('playerId',id);apply(await request(`${STATE_API.replace(API,'')}/?playerId=${encodeURIComponent(id)}`));}
    catch(e){setError(e.message)}finally{setLoading(false)}
  },[apply,playerId,request]);

  useEffect(()=>{localStorage.setItem('okocDevPlayer',playerId);localStorage.setItem('playerId',playerId);setSelected(null);setPeek(null);setPrivateKnight(null);load(playerId)},[playerId]); // intentional player switch sync
  useEffect(()=>{
    if(state?.phase!=='kingReveal') return;
    const id=setInterval(async()=>{
      try{apply(await request(`${STATE_API.replace(API,'')}/?playerId=${encodeURIComponent(playerId)}`));}
      catch(e){setError(e.message);}
    },250);
    return()=>clearInterval(id);
  },[state?.phase,playerId,apply,request]);

  const send=useCallback(async(message)=>{
    setBusy(true);setError('');
    try{
      const msg={...message,actionId:message.actionId||crypto.randomUUID()};
      const data=await request(ACTION_API.replace(API,''),{method:'POST',body:JSON.stringify({playerId,action:msg})});
      apply(data);
    }catch(e){setError(e.message)}finally{setBusy(false)}
  },[apply,playerId,request]);

  const reset=async()=>{
    setBusy(true);setError('');
    try{await request('/reset',{method:'POST',body:'{}'});setLastAction('RESET DEV · partie réinitialisée');await load(playerId)}
    catch(e){setError(e.message)}finally{setBusy(false)}
  };

  const setDevGold=()=>send({type:'devSetGold',targetId:playerId,gold:Number(gold)});
  const crownCheck=()=>send({type:'devForceCrownCheck'});
  const testApi=async()=>{try{await request('/debug/fail')}catch(e){setError(e.message);setLastAction('Erreur API contrôlée : test réussi')}};

  const me=state?.players?.find(p=>p.id===playerId);
  const king=state?.players?.find(p=>p.role==='king');
  const t=I18N[state?.room?.lang||'fr'];

  return <main className={`dev-app ${panelOpen?'dev-panel-open':'dev-panel-closed'}`}>
    <header className="dev-toolbar"><span className="eyebrow">OKOC ONLINE · MODE DEV</span><button className="dev-fab" onClick={()=>setPanelOpen(v=>!v)}>DEV · {panelOpen?'FERMER':'CONTRÔLE'}</button></header>
    <div className={`dev-body ${panelOpen?'with-panel':'full-width'}`}>
      <section className="dev-game-host">{!loading&&state?<Game t={t} lang={state.room?.lang||'fr'} state={state} me={me} selected={selected} setSelected={setSelected} send={send} chat={chat} setChat={setChat} peek={peek} setPeek={setPeek} privateKnight={privateKnight} setPrivateKnight={setPrivateKnight} tradeOffer={tradeOffer} setTradeOffer={setTradeOffer}/>:<div className="dev-loading"><section className="dev-loading-card"><span className="eyebrow">OKOC ONLINE · DEV</span><h1>{error?'DEV NON DISPONIBLE':'CHARGEMENT DU DEV'}</h1><p>{error||'Initialisation de la partie DEV isolée avec le même moteur de règles que le jeu normal…'}</p>{error&&<button onClick={()=>load(playerId)}>RÉESSAYER</button>}</section></div>}</section>
    {panelOpen&&<aside className="dev-drawer">
      <span className="eyebrow">MODE DEV INDÉPENDANT</span><h2>CONTRÔLE</h2>
      <a href="/">← RETOUR AU JEU NORMAL</a>
      <div className="dev-status-line"><span>SERVEUR</span><b className={state?'ok':'bad'}>{state?'● CONNECTÉ':'● HORS LIGNE'}</b><span>PHASE</span><b>{state?.phase||'—'}</b></div>
      <label><span>JOUEUR CONTRÔLÉ</span><select value={playerId} disabled={busy} onChange={e=>setPlayerId(e.target.value)}>{PLAYERS.map((id,i)=><option key={id} value={id}>DEV {i+1}</option>)}</select></label>
      <div className="dev-mini-grid"><div><span>ROLE</span><b>{me?.role||'—'}</b></div><div><span>OR</span><b>{me?.gold??'—'}</b></div><div><span>ROUND</span><b>{state?.round??'—'}/4</b></div><div><span>TOUR</span><b>{state?.currentPlayerId===playerId?'À MOI':'AUTRE'}</b></div></div>
      <div className="dev-row"><button className="dev-primary" disabled={busy} onClick={reset}>RESET PARTIE</button><button disabled={busy||loading} onClick={()=>load(playerId)}>SYNCHRONISER</button></div>
      <div className="dev-row"><button disabled={busy||!state} onClick={crownCheck}>VÉRIFIER COURONNE</button><button disabled={busy} onClick={testApi}>TEST API</button></div>
      <label><span>OR DU JOUEUR CONTRÔLÉ</span><input type="number" min="0" max="2000" step="50" value={gold} onChange={e=>setGold(e.target.value)}/></label>
      <button disabled={busy||!state} onClick={setDevGold}>APPLIQUER L’OR</button>
      <div className="dev-now"><span>ROI</span><b>{king?.name||'—'}</b><span>DERNIÈRE ACTION</span><b>{lastAction}</b></div>
      {error&&<div className="dev-error-inline"><strong>ERREUR RÉCUPÉRABLE</strong><span>{error}</span><button onClick={()=>load(playerId)}>RÉESSAYER</button></div>}
      <p className="dev-note">Le DEV utilise le même moteur serveur que la partie normale. Les mains, rôles, or, dés, couronne, tours et effets sont validés côté serveur. Le DEV possède seulement sa propre partie isolée.</p>
    </aside>}
    </div>
  </main>
}

createRoot(document.getElementById('root')).render(<DevErrorBoundary><DevApp/></DevErrorBoundary>);
