import {writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const baseUrl=process.env.PEARL_BASE_URL||'http://127.0.0.1:8765';
const artifacts=fileURLToPath(new URL('../../artifacts/',import.meta.url));
mkdirSync(artifacts+'screenshots/',{recursive:true});
const target=await(await fetch('http://127.0.0.1:9223/json/new?'+baseUrl,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let next=1;const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
function call(method,params={}){return new Promise((resolve,reject)=>{const id=next++;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:430,height:880,deviceScaleFactor:1,mobile:false});
await new Promise(r=>setTimeout(r,700));
const tests=[];async function check(name,expression){const ok=await evaluate(expression);tests.push({name,ok});if(!ok)throw new Error('Failed: '+name);}
await check('live API is connected',`pearlsewon.aiStatus().mode==='live'`);
await evaluate(`pearlsewon.hear('처음 와서요. 매장에서 마실게요. 블랙 밀크티 한 잔으로 부탁드려요.')`);
await check('natural-language ordering',`pearlsewon.state.item.id==='black_milktea_pearl'&&pearlsewon.state.cfg.size==='중'&&pearlsewon.state.where==='매장'`);
await evaluate(`pearlsewon.hear('지금 고른 음료는 그대로 두고 큰 컵으로 바꾸고 치즈폼도 올려주세요. 당도는 30%로 해주세요.')`);
await check('natural-language changes applied',`pearlsewon.state.item.id==='black_milktea_pearl'&&pearlsewon.state.cfg.size==='대'&&pearlsewon.state.cfg.sugar===30&&pearlsewon.state.cfg.tops.includes('치즈폼')&&pearlsewon.priceOf(pearlsewon.state.item,pearlsewon.state.cfg)===7700`);
const before=await evaluate(`JSON.stringify(pearlsewon.state.cfg)`);
await evaluate(`pearlsewon.hear('펄이랑 화이트펄은 어떻게 다른가요?')`);
await check('RAG explanation',`document.querySelector('#m').textContent.includes('타피오카')&&document.querySelector('#m').textContent.includes('해초')`);
await check('explanation leaves order unchanged',`JSON.stringify(pearlsewon.state.cfg)===${JSON.stringify(before)}`);
await check('messages and controls restored',`document.querySelectorAll('.bubble.user').length===3&&!document.querySelector('#in').disabled&&!document.querySelector('#body').inert`);
const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(artifacts+'screenshots/10-live-ai.png',Buffer.from(shot.data,'base64'));
if(errors.length)throw new Error('Browser errors: '+JSON.stringify(errors));
writeFileSync(artifacts+'ai-verification.json',JSON.stringify({tests,errors,modelCalls:3},null,2));console.log(JSON.stringify({passed:tests.length,modelCalls:3,browserErrors:errors.length}));ws.close();
