const $ = id => document.getElementById(id);
async function run(){
  $('status').textContent='RUNNING SERVER-AUTHORITATIVE CHECKS…';
  try{
    const r=await fetch('/api/dev/smoke',{cache:'no-store'});
    const data=await r.json();
    $('status').textContent=data.ok?'ALL SERVER CHECKS PASSED':'CHECKS FAILED';
    $('status').className=data.ok?'ok':'bad';
    $('checks').innerHTML=data.checks.map(c=>`<div class="check ${c.ok?'ok':'bad'}"><b>${c.ok?'✓':'✕'}</b><span>${c.name}</span><small>${c.detail||''}</small></div>`).join('');
  }catch(e){$('status').textContent='SERVER CHECK UNAVAILABLE';$('status').className='bad';$('checks').innerHTML=`<div class="check bad"><b>✕</b><span>${e.message}</span></div>`}
}
run();
