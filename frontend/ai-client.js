let aiMode = 'rules', aiPending = false, aiEpoch = 0, aiAbort = null;
const baseReset = rulesReset;
const aiReady = (async () => {
  if (window.__PEARL_RULES_TEST__ || !/^https?:$/.test(location.protocol)) return;
  aiMode = 'checking';
  try {
    const r = await fetch('/api/health', {cache:'no-store'});
    const data = await r.json();
    aiMode = r.ok && data.configured ? 'live' : 'unavailable';
  } catch { aiMode = 'unavailable'; }
  updateAIStatus();
})();
function updateAIStatus(){const hint=$('.conversation-hint');hint.textContent=aiPending?'답변 준비 중':aiMode==='live'?'AI와 대화':aiMode==='rules'?'시연 대화':'AI 연결 확인 필요';}
function reset(){aiEpoch++;if(aiAbort)aiAbort.abort();aiPending=false;B.inert=false;baseReset();updateAIStatus();}
function hear(text){const t=text.trim();if(!t)return;if(aiMode==='rules')return rulesHear(t);return liveHear(t);}
async function liveHear(text){
  await aiReady;
  if(aiPending)return;
  if(aiMode!=='live'){appendMessage('user',text);say('AI 서버에 연결하지 못했어요. 서버를 실행한 뒤 다시 열어 주세요.');appendMessage('bot',$('#m').textContent);$('#conversation').open=true;return;}
  const epoch=aiEpoch;
  const conversation=messages.slice(-10);
  const state={stage:S.stage,where:S.where,item_id:S.item?.id||null,cfg:S.cfg?clone(S.cfg):null,paid:S.paid};
  appendMessage('user',text);$('#conversation').open=true;aiPending=true;aiAbort=new AbortController();
  const timeout=setTimeout(()=>aiAbort?.abort(),55000);
  B.inert=true;$('#f button').disabled=true;$('#in').disabled=true;$('#back').disabled=true;updateAIStatus();
  try{
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,state,conversation}),signal:aiAbort.signal});
    const action=await response.json();
    if(epoch!==aiEpoch)return;
    if(!response.ok)throw new Error(action.error||'AI 응답을 받지 못했어요.');
    applyAIAction(action,text);
    say(action.reply,action.warnings||[]);
    appendMessage('bot',[action.reply,...(action.warnings||[])].join('\n'));
  }catch(error){
    if(epoch!==aiEpoch)return;
    const message=error.name==='AbortError'?'응답이 늦어지고 있어요. 잠시 뒤 다시 시도해 주세요.':error.message;
    say(message);appendMessage('bot',message);$('#in').value=text;
  }finally{
    clearTimeout(timeout);
    if(epoch===aiEpoch){aiPending=false;aiAbort=null;B.inert=false;$('#f button').disabled=false;$('#in').disabled=false;memo();updateAIStatus();renderMessages();}
  }
}
function applyAIAction(action,text){
  if(!S.paid&&['매장','포장'].includes(action.fulfillment))S.where=action.fulfillment;
  if(action.intent==='staff'){staff();return;}
  if(action.intent==='recommend'){
    const pool=(action.recommendations||[]).map(id=>byId[id]).filter(i=>i&&!i.sold_out);
    if(!pool.length)return;
    if(!S.where)S.where='포장';S.pool=pool;S.cat=null;S.situ=null;S.less=LESS_RE.test(text);S.page=0;S.rerolls=0;S.stage='picks';show();return;
  }
  if(action.intent==='modify'){
    const record=action.items?.[0];if(!record||record.menu_id!==S.item?.id)return;
    S.cfg=record.cfg;show();return;
  }
  if(action.intent==='order'){
    const records=(action.items||[]).filter(r=>byId[r.menu_id]&&!byId[r.menu_id].sold_out);
    if(!records.length)return;
    if(!S.where)S.where='포장';
    if(records.length===1&&records[0].quantity===1){const r=records[0];choose(byId[r.menu_id],r.cfg);return;}
    for(const r of records){editIndex=null;addLine(byId[r.menu_id],r.cfg,r.quantity,true);}
    S.stage='cart';show();return;
  }
  if(action.intent==='navigate'){
    if(action.target==='back'){goBack();return;}
    if(action.target==='pay'&&!S.cart.length){action.reply='먼저 메뉴를 담아 주세요.';return;}
    if(['taste','full','cart','pay','fork','where'].includes(action.target)){S.stage=action.target;show();}
  }
}
// Replace submit-time chat, including example chips, while retaining local button controls.
window.pearlsewon.hear=hear;
window.pearlsewon.reset=reset;
window.pearlsewon.aiStatus=()=>({mode:aiMode,pending:aiPending});
updateAIStatus();
