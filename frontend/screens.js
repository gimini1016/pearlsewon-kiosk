const LABELS = {'달달':'달게','상큼':'상큼하게','진한':'진하게','부드러운':'순하게'};
/* 메뉴별 그림 정의: 층은 컵 바닥부터 위로 [색, 비율]. foam=기본 폼층, blended=갈아 만든 음료(얼음 안 보임), garnish=메뉴 특징 */
const DRINK_STYLE = {
  americano:{layers:[['#3d2517',1]],straw:'thin'},
  cafe_latte:{layers:[['#efe4d2',.56],['#86532f',.44]],straw:'thin'},
  vanilla_latte:{layers:[['#f4e8cc',.56],['#93613a',.44]],straw:'thin',garnish:'vanilla'},
  cappuccino:{layers:[['#e8dac4',.45],['#74472a',.55]],foam:'milk',straw:'thin'},
  cafe_mocha:{layers:[['#4f2d1c',.55],['#7d5236',.45]],foam:'milk',straw:'thin',garnish:'choco'},
  earlgrey_spanner:{layers:[['#5e3a22',1]],foam:'cream',straw:'thin'},
  black_milktea_pearl:{layers:[['#b88b61',1]]},
  taro_milktea_pearl:{layers:[['#b89ad6',1]]},
  brownsugar_milktea_pearl:{layers:[['#efe2cd',1]],garnish:'tiger'},
  green_milktea:{layers:[['#a3b874',1]]},
  choco_milktea_cheesefoam:{layers:[['#6b4636',1]]},
  lowsugar_black_milktea:{layers:[['#c7a37d',1]]},
  earlgrey_tea:{layers:[['#a2581f',1]],clear:true},
  oolong_coconut_milkfoam:{layers:[['#b47b38',1]],clear:true},
  grapefruit_jasmine:{layers:[['#f0a073',1]],clear:true,garnish:'grapefruit'},
  passionfruit_hibiscus:{layers:[['#c23d47',1]],clear:true,garnish:'passion'},
  lemon_yogurt:{layers:[['#f3e6a6',1]],blended:true,garnish:'lemon'},
  mango_yogurt_whitepearl:{layers:[['#f4c04c',1]],blended:true,garnish:'mango'},
  strawberry_cookie_smoothie:{layers:[['#e99aa3',1]],blended:true,garnish:'cookie'},
  mango_smoothie:{layers:[['#f2ad38',1]],blended:true},
  greengrape_smoothie:{layers:[['#b5d07a',1]],blended:true,garnish:'aloe'},
  signature_scone:{dessert:'scone'},chocochip_cookie:{dessert:'cookie'},salted_cheese_bar:{dessert:'bar'},cheesecake_stick:{dessert:'stick'},milktea_crepe:{dessert:'crepe'}
};
const TOP_STYLE = {'펄':['#2a1912','circle'],'화이트펄':['#f1ede1','circle'],'코코넛':['#f8eed2','square'],'알로에':['#cfe2ad','square'],'밀크폼':['#fbf4e6','foam'],'치즈폼':['#f2d78f','foam']};
const EXTRA_STYLE = {shot:'#3b2214',decaf:'#986643',syrup_vanilla:'#ead2a0',syrup_hazelnut:'#b7884e',syrup_caramel:'#c58336',oat_milk:'#e6d4ad'};
const ICON={minus:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>',plus:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>',bag:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 8h13l-1.2 12H6.7z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',chat:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H10l-6 4z"/></svg>',mark:'<svg class="ic mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l10 7-10 7z" fill="currentColor" stroke="none"/></svg>',check:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>',close:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',back:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H7m5-6l-6 6 6 6"/></svg>',moon:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',sun:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',arrow:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-5-6l6 6-6 6"/></svg>'};
let fx = {}, cupScale = 1, flying = false, seatsShown = null, cartCount = 0, OPT = null, svgSerial = 0, messages = [], historyStack = [], lastSnapshot = null, currentStage = null, editIndex = null, draftCache = new Map();
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
/* 컵 몸통: 위 y=64(x 38~142), 아래 y=206(x 54~126). 그 사이 폭을 y로 구한다 */
const CUP_TOP=64,CUP_BOT=206,cupL=y=>38+16*(y-CUP_TOP)/(CUP_BOT-CUP_TOP),cupR=y=>142-16*(y-CUP_TOP)/(CUP_BOT-CUP_TOP);
const rnd=(n,k)=>((Math.sin(n*12.9898+k*78.233)*43758.5453)%1+1)%1;
function dessertSvg(i,kind){
  const label=`<svg viewBox="0 0 180 230" role="img" aria-label="${esc(i.name)}">`;
  const plate='<ellipse cx="90" cy="194" rx="72" ry="11" fill="var(--plate)"/>';
  if(kind==='scone')return label+plate+'<path d="M40 188C38 146 58 112 92 110C126 110 146 146 142 188Z" fill="#d7a35d"/><path d="M40 188C40 178 142 178 142 188Z" fill="#b9813e"/><path d="M62 128Q90 116 118 128" stroke="#f0c98a" stroke-width="7" fill="none" stroke-linecap="round"/></svg>';
  if(kind==='cookie')return label+plate+'<ellipse cx="90" cy="172" rx="58" ry="20" fill="#d39b55"/>'+[[66,166],[92,160],[116,168],[80,178],[104,180]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="5" fill="#3a2214"/>`).join('')+'</svg>';
  if(kind==='bar')return label+plate+'<rect x="44" y="134" width="92" height="52" rx="6" fill="#e7b04a"/><rect x="44" y="172" width="92" height="14" rx="4" fill="#b8791f"/>'+[[60,148],[84,156],[108,146],[122,160]].map(([x,y])=>`<rect x="${x}" y="${y}" width="5" height="5" fill="#fffaf0"/>`).join('')+'</svg>';
  if(kind==='stick')return label+plate+'<rect x="34" y="150" width="112" height="30" rx="5" fill="#f6e7bb"/><rect x="34" y="176" width="112" height="10" rx="4" fill="#b98845"/></svg>';
  return label+plate+'<path d="M40 182C40 136 140 136 140 182Z" fill="#e9d2a8"/><ellipse cx="90" cy="150" rx="34" ry="14" fill="#f5e9d2"/><ellipse cx="90" cy="150" rx="14" ry="6" fill="#c9a074"/></svg>';
}
/* 납작한 그림: 뚜껑 막대 + 빨대 + 컵(윗부분은 빈칸) + 음료 + 펄. 선·광택·그림자 없이 면으로만.
   fx: 방금 바뀐 것({drop:'펄'} 등) — 그 재료만 떨어지거나 부어지는 움직임을 단다 */
const PEARL={'펄':'#3a2a22','화이트펄':'#f6f1e6'};
function drinkSvg(i,c=null,small=false,fx={}) {
  const st = DRINK_STYLE[i.id];
  if(!st) throw new Error('음료 표시 정보 누락: '+i.id);
  if(st.dessert) return dessertSvg(i,st.dessert);
  const id='cup-'+(++svgSerial), d=DEF[i.id]||{};
  const tops=c?c.tops:(d.toppings||[]), temp=c?.temp||d.temp||'ICE', hot=temp==='HOT';
  const foams=[...(st.foam&&!(c&&c.tops&&tops.includes('밀크폼'))?[st.foam]:[]),...tops.filter(t=>t.includes('폼'))];
  const solids=tops.filter(t=>!t.includes('폼'));
  const seal=c?.seal||null, ice=c?.ice??(hot?null:'보통');
  const label=esc(i.name+(tops.length?' · '+tops.join(' · '):'')+(hot?' · 따뜻하게':''));
  // 따뜻한 음료는 손잡이 달린 머그, 차가운 음료는 위가 넓은 컵
  const G=hot?{top:84,bot:206,l:()=>44,r:()=>136,path:'M44 84H136V188Q136 206 118 206H62Q44 206 44 188Z'}
             :{top:64,bot:206,l:y=>38+15*(y-64)/142,r:y=>142-15*(y-64)/142,path:'M38 64H142L127 206H53Z'};
  const top=G.top+(hot?16:34), H=G.bot-top;
  // 층 (오트밀크면 우유층 색을 바꾸고, 샷이면 위에 진한 커피층을 더한다)
  let layers=st.layers.map(([col,f])=>[c?.oat&&/^#(e|f)/i.test(col)?EXTRA_STYLE.oat_milk:col,f]);
  if(c?.shot) layers=[...layers.map(([col,f])=>[col,f*(1-.14*c.shot)]),[EXTRA_STYLE.shot,.14*c.shot]];
  let y=G.bot, body='', over='';
  layers.forEach(([col,f])=>{const h=H*f;body+=`<rect x="20" y="${(y-h).toFixed(1)}" width="140" height="${(h+.6).toFixed(1)}" fill="${col}"/>`;y-=h;});
  if(c?.syrup) body+=`<path class="${fx.drop==='시럽'?'swirl':''}" d="M52 ${G.bot-30}q19 -9 38 0t38 0" fill="none" stroke="${EXTRA_STYLE[c.syrup]}" stroke-width="6" stroke-linecap="round"/>`;
  const g=st.garnish,inside=(yy,pad)=>[G.l(yy)+pad,G.r(yy)-pad];
  if(g==='tiger') for(let k=0;k<4;k++){const x=56+k*22;body+=`<path d="M${x} ${top+8}l12 ${H-30}" stroke="#9a5420" stroke-width="7" stroke-linecap="round" opacity=".35"/>`;}
  if(g==='choco') body+=`<path d="M50 ${top+18}q20 10 40 0t40 0" fill="none" stroke="#2e170c" stroke-width="5" stroke-linecap="round" opacity=".45"/>`;
  if(g==='vanilla') for(let k=0;k<5;k++) body+=`<circle cx="${62+k*13}" cy="${top+56+rnd(k,2)*40}" r="1.8" fill="#3a2516" opacity=".45"/>`;
  if(g==='grapefruit'||g==='lemon'){const fill=g==='lemon'?'#f7dc55':'#f4876a',pulp=g==='lemon'?'#fbe98e':'#f9a98f';[[72,top+40,16],[110,top+70,13]].forEach(([x,yy,r])=>{body+=`<circle cx="${x}" cy="${yy}" r="${r}" fill="${fill}"/><circle cx="${x}" cy="${yy}" r="${r-4}" fill="${pulp}"/>`;});}
  if(g==='passion') for(let k=0;k<9;k++){const yy=top+16+rnd(k,3)*(H-40),[a,b]=inside(yy,12);body+=`<circle cx="${(a+rnd(k,4)*(b-a)).toFixed(1)}" cy="${yy.toFixed(1)}" r="2.6" fill="#2b130f" opacity=".6"/>`;}
  if(g==='mango') for(let k=0;k<4;k++){const yy=top+30+k*16,[a,b]=inside(yy,14);body+=`<rect x="${(a+rnd(k,6)*(b-a-12)).toFixed(1)}" y="${yy}" width="12" height="12" rx="2" fill="#f29a1c"/>`;}
  if(g==='cookie') for(let k=0;k<10;k++){const yy=top+12+rnd(k,8)*(H-30),[a,b]=inside(yy,10);body+=`<circle cx="${(a+rnd(k,9)*(b-a)).toFixed(1)}" cy="${yy.toFixed(1)}" r="2.6" fill="#4a2d1e" opacity=".7"/>`;}
  if(g==='aloe') for(let k=0;k<5;k++){const yy=top+30+rnd(k,11)*(H-60),[a,b]=inside(yy,12);body+=`<rect x="${(a+rnd(k,12)*(b-a-10)).toFixed(1)}" y="${yy.toFixed(1)}" width="10" height="10" rx="2" fill="#eef5dc" opacity=".9"/>`;}
  // 얼음: 차가운 음료이면서 갈지 않은 음료만. 얼음 양을 바꾸면 하나씩 떨어진다
  if(!st.blended&&ice){const n=ice==='적게'?2:ice==='많이'?5:3;for(let k=0;k<n;k++){const x=54+(k%3)*25+rnd(k,13)*4,yy=top+6+foams.length*17+Math.floor(k/3)*20;body+=`<rect class="ice${fx.drop==='얼음'?' drop':''}" style="--d:${k*60}ms" x="${x.toFixed(1)}" y="${yy}" width="20" height="17" rx="4" fill="#fff" opacity=".5" transform="rotate(${(rnd(k,15)*16-8).toFixed(0)} ${(x+10).toFixed(1)} ${yy+8})"/>`;}}
  // 토핑: 펄은 바닥에 한 줄, 젤리는 그 위로. 방금 넣은 토핑은 컵 위에서 쏟아져 들어온다
  let bedTop=G.bot-4;
  solids.forEach((t,ti)=>{const [fill,shape]=TOP_STYLE[t],drop=fx.drop===t;
    if(shape==='circle'){const r=9.5,y0=bedTop-r,L=G.l(y0)+r+3,R=G.r(y0)-r-3,n=Math.max(2,Math.floor((R-L)/(2*r+5))+1),step=(R-L)/(n-1);
      for(let k=0;k<n;k++)over+=`<circle class="${drop?'drop':''}" style="--d:${k*70}ms" cx="${(L+k*step).toFixed(1)}" cy="${y0.toFixed(1)}" r="${r}" fill="${PEARL[t]}"/>`;
      bedTop-=2*r+3;}
    else{for(let k=0;k<5;k++){const yy=bedTop-12-(k%2)*14-rnd(k,20+ti)*6,[a,b]=inside(yy,10);over+=`<rect class="${drop?'drop':''}" style="--d:${k*60}ms" x="${(a+(k/4)*(b-a-12)).toFixed(1)}" y="${yy.toFixed(1)}" width="12" height="12" rx="2.5" fill="${fill}" transform="rotate(${(rnd(k,22)*30-15).toFixed(0)} ${(a+(k/4)*(b-a-12)+6).toFixed(1)} ${(yy+6).toFixed(1)})"/>`;}bedTop-=34;}});
  // 폼: 음료 맨 위의 크림 띠
  let foamSvg='';
  foams.forEach((f,k)=>{const col=f==='치즈폼'?TOP_STYLE['치즈폼'][0]:f==='cream'?'#fbf4e4':TOP_STYLE['밀크폼'][0];foamSvg+=`<rect class="${fx.drop===f?'pour':''}" x="20" y="${top+k*16}" width="140" height="17" fill="${col}"/>`;});
  const wide=solids.length>0||st.blended;
  const straw=`<path d="M${wide?114:118} 8L${wide?101:106} 96" stroke="var(--lid)" stroke-width="${wide?13:8}"/>`;
  const lid=seal==='실링'?`<rect x="38" y="60" width="104" height="5" rx="2.5" fill="var(--lid)" opacity=".5"/>`:`<rect x="30" y="52" width="120" height="13" rx="6.5" fill="var(--lid)"/>`;
  const handle=hot?`<path d="M136 110h7q15 0 15 16v18q0 16-15 16h-7" fill="none" stroke="var(--cup-band)" stroke-width="10"/>`:'';
  const steam=hot?`<g class="steam" fill="none" stroke="var(--lid)" stroke-width="4" stroke-linecap="round" opacity=".28"><path d="M78 72q-8-9 0-18t0-18"/><path d="M102 72q-8-9 0-18t0-18"/></g>`:'';
  return `<svg viewBox="0 0 180 230" role="img" aria-label="${label}"><defs><clipPath id="${id}"><path d="${G.path}"/></clipPath></defs>${hot?'':straw}${handle}<path d="${G.path}" fill="var(--cup-band)"/><g clip-path="url(#${id})">${body}${foamSvg}</g>${hot?steam:lid}${over}</svg>`;
}
/* 펄이: 키오스크에서 말을 걸어 주는 타피오카 펄. 음료 그림(컵)과 겹치지 않게 동그란 알 하나로 */
function mascot(cls=''){return `<svg class="mascot ${cls}" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="61" rx="15" ry="2.4" fill="var(--shadow)"/><g class="arm l"><ellipse cx="9.5" cy="40" rx="4" ry="6.5" fill="var(--pearl)" transform="rotate(25 9.5 40)"/></g><g class="arm r"><ellipse cx="54.5" cy="40" rx="4" ry="6.5" fill="var(--pearl)" transform="rotate(-25 54.5 40)"/></g><circle cx="32" cy="34" r="24" fill="var(--pearl)"/><ellipse cx="21" cy="20.5" rx="7" ry="4" fill="#fff" opacity=".24" transform="rotate(-32 21 20.5)"/><g class="eyes"><circle cx="24" cy="33" r="5.4" fill="#fff"/><circle cx="40" cy="33" r="5.4" fill="#fff"/><circle cx="25.1" cy="34" r="2.8" fill="#1c120c"/><circle cx="41.1" cy="34" r="2.8" fill="#1c120c"/></g><path class="mouth" d="M28.5 42.5q3.5 3.6 7 0" stroke="#f6e9da" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="16.5" cy="41.5" rx="3.6" ry="2.2" fill="#f2907c" opacity=".6"/><ellipse cx="47.5" cy="41.5" rx="3.6" ry="2.2" fill="#f2907c" opacity=".6"/></svg>`;}
function appendMessage(role,text) { if(!text)return; messages.push({role,text});renderMessages(); }
let msgKey='';
// 대화가 늘었을 때만 다시 그린다(화면을 옮길 때마다 말풍선이 다시 떠오르지 않게)
function renderMessages(){const el=$('#messages'),pending=(()=>{try{return aiPending;}catch{return false;}})(),key=messages.length+'|'+pending;if(key!==msgKey){msgKey=key;el.innerHTML='';for(const msg of messages){const row=box('msg '+msg.role),b=box('bubble '+msg.role),who=document.createElement('span');who.className='sr';who.textContent=msg.role==='user'?'나: ':'펄이: ';b.append(who,document.createTextNode(msg.text));if(msg.role==='bot')row.insertAdjacentHTML('beforeend',mascot('tiny'));row.append(b);el.append(row);}if(pending)el.insertAdjacentHTML('beforeend','<div class="msg bot typing">'+mascot('tiny')+'<div class="bubble bot" aria-label="답을 준비하고 있어요"><i></i><i></i><i></i></div></div>');el.scrollTop=el.scrollHeight;}$('#messageCount').textContent=messages.length;const on=messages.length>1;document.body.classList.toggle('has-chat',on);if(!on)setChat(false);$('#chatBtn').innerHTML=ICON.chat+'<span>대화</span><b>'+messages.length+'</b>';$('#chatBtn').setAttribute('aria-label','나눈 대화 '+messages.length+'개 보기');}
function talk(){const h=$('.say .mascot');if(!h)return;h.classList.remove('talk');void h.getBoundingClientRect();h.classList.add('talk');clearTimeout(talk.t);talk.t=setTimeout(()=>h.classList.remove('talk'),520);}
function setChat(open){document.body.classList.toggle('chat-open',open);$('#chatBtn').setAttribute('aria-expanded',String(open));}
let chatTurn=null,rendering=false;
function say(m,notes=[]){if(chatTurn&&!rendering){chatTurn.push(m,...notes);return;}const el=$('#m');if(el.textContent!==m){talk();el.textContent='';el.setAttribute('aria-label',m);m.split(/(\s+)/).forEach((w,k)=>{if(/^\s+$/.test(w)){el.append(w);return;}const s=document.createElement('span');s.className='w';s.style.animationDelay=Math.min(k/2*70,560)+'ms';s.textContent=w;s.setAttribute('aria-hidden','true');el.append(s);});}$('#notes').innerHTML='';for(const n of notes){const p=document.createElement('p');p.className='n';p.textContent=n;$('#notes').append(p);}}
function memo(){ $('#sn').textContent=({where:'취향대로, 한 잔',fork:'메뉴 고르기',order:'말로 주문하기',taste:'오늘의 취향',picks:'추천 메뉴',full:'전체 메뉴',cup:'나의 한 잔',cart:'담은 메뉴',pay:'결제',notify:'주문 알림',done:'주문 완료',offer:'이런 메뉴는 어떠세요'})[S.stage]||'취향대로, 한 잔';$('#back').disabled=historyStack.length===0||S.paid;$('#f').hidden=S.stage==='notify'||S.stage==='done';
 const n=S.cart.reduce((a,l)=>a+l.qty,0),sum=S.cart.reduce((a,l)=>a+l.price*l.qty,0),cb=$('#cartBtn');cb.hidden=S.paid||S.stage==='notify'||S.stage==='done';cb.disabled=false;cb.innerHTML=ICON.bag+'<span class="cb-l">담은 메뉴</span><b class="cb-n">'+n+'</b>'+(n?'<span class="cb-s">'+won(sum)+'</span>':'');cb.setAttribute('aria-label','담은 메뉴 '+n+'잔'+(n?', '+won(sum):'')+' 보기');cb.classList.toggle('here',S.stage==='cart');if(n>cartCount&&!flying){cb.classList.remove('bump');void cb.offsetWidth;cb.classList.add('bump');}cartCount=n;
 $('#sn').hidden=S.stage==='where';}
function snapshot(){return {recommendationOptions:clone(S.recommendationOptions||{}),offer:[...(S.offer||[])],offerMsg:S.offerMsg||'',offerSold:S.offerSold||null,stage:S.stage,where:S.where,cat:S.cat,situ:S.situ,less:S.less,nomilk:S.nomilk,from:S.from||'board',pool:S.pool.map(i=>i.id),page:S.page,rerolls:S.rerolls,item:S.item?.id||null,cfg:S.cfg?clone(S.cfg):null};}
function show(){const same=currentStage===S.stage,top=B.scrollTop;if(currentStage!==null&&!same&&lastSnapshot)historyStack.push(lastSnapshot);currentStage=S.stage;B.innerHTML='';memo();rendering=true;try{({where,fork,order,taste,picks,full,cup,cart,pay,notify,done,offer})[S.stage]();}finally{rendering=false;fx={};}B.scrollTop=same?top:0;lastSnapshot=snapshot();renderMessages();}
function goBack(){if($('#dialog').open){$('#dialog').close();return;}if(S.paid||!historyStack.length)return;const p=historyStack.pop();const cartNow=S.cart;Object.assign(S,p,{pool:p.pool.map(id=>byId[id]),item:p.item?byId[p.item]:null,cart:cartNow});currentStage=S.stage;lastSnapshot=null;B.scrollTop=0;if(S.stage==='cup'){const k=S.cart.length-1;editIndex=k>=0&&S.cart[k].i.id===S.item.id?k:null;}show();}
function rulesReset(){S={stage:'where',quick:null,quickFrom:null,where:null,cat:null,situ:null,less:false,nomilk:false,pool:[],page:0,rerolls:0,item:null,cfg:null,cart:[],dec:0,offer:[],offerMsg:'',offerSold:null,paid:false,phone:null,maskedPhone:null,number:null,payment:null};messages=[];historyStack=[];currentStage=null;lastSnapshot=null;editIndex=null;draftCache.clear();cartCount=0;if($('#dialog').open)$('#dialog').close();$('#in').value='';$('#conversation').open=false;show();appendMessage('bot','안녕하세요, 펄세권이에요. 매장에서 드세요, 포장하세요?');}
// 펄 신선도: 매장 자료의 '12분 전'에서 시작해 1분씩 늘고, 30분마다 새로 삶아 0분으로 돌아간다
const PEARL_T0=Date.now()-D.store.pearl_minutes_ago*60000,PEARL_CYCLE=30;
const pearlMin=()=>Math.floor((Date.now()-PEARL_T0)/60000)%PEARL_CYCLE;
const pearlAge=()=>{const m=pearlMin();return m===0?'펄을 방금 삶았어요':`펄은 ${m}분 전에 삶았어요`;};
setInterval(()=>{const el=$('.pearl-age');if(el&&el.textContent!==pearlAge())el.textContent=pearlAge();},5000);
const BUBBLE_IDS=()=>drinks.filter(i=>!i.sold_out&&(DEF[i.id]?.toppings||[]).some(t=>t==='펄'||t==='화이트펄')).sort((a,b)=>(({'베스트':0,'시그니처':1})[a.badge]??2)-(({'베스트':0,'시그니처':1})[b.badge]??2)).slice(0,4).map(i=>i.id);
const WELCOME=[['black_milktea_pearl','베스트','#b88b61'],['mango_yogurt_whitepearl','가장 많이 찾는','#f4c04c'],['brownsugar_milktea_pearl','시그니처','#b8642a']],TODAY='brownsugar_milktea_pearl';
function where(){const q=S.quick&&byId[S.quick];say(q?`${q.name.split(' + ')[0]}${toJosa(q.name.split(' + ')[0])} 고르셨어요. 매장에서 드세요, 포장하세요?`:'매장에서 드세요, 포장하세요?');// 선반의 세 잔: 베스트 · 가장 많이 찾는 · 시그니처. 컵마다 제 음료 색의 원판을 깐다
 const quick=(id,from)=>()=>{const same=S.quick===id&&S.quickFrom===from;S.quick=same?null:id;S.quickFrom=same?null:from;show();},shelf=box('shelf');
 WELCOME.forEach(([id,tag,tint],k)=>{const i=byId[id],[n,top]=i.name.split(' + '),on=S.quick===id&&S.quickFrom==='pick',b=btn('pick'+(k===1?' center':'')+(on?' on':''),`<span class="pick-tag">${tag}</span><span class="pick-name"><b>${esc(n)}</b>${top?`<small>+ ${esc(top)}</small>`:''}</span><span class="pick-art">${drinkSvg(i)}</span>`,quick(id,'pick'),{ariaLabel:`${tag} ${i.name} 바로 주문하기`});b.style.setProperty('--tint',tint);b.setAttribute('aria-pressed',String(on));shelf.append(b);});
 const art=box('welcome-art');art.append(shelf);
 // 오늘의 추천은 선반 밖, 메모 아래 따뜻한 띠로
 const t=byId[TODAY],today=btn('today-band'+(S.quick===TODAY&&S.quickFrom==='band'?' on':''),`<span class="tb-art">${drinkSvg(t,null,true)}</span><span class="tb-text"><small>오늘의 추천</small><b>${esc(t.name)}</b></span><span class="tb-fresh"><i></i><i></i><i></i><em class="pearl-age">${pearlAge()}</em></span><span class="tb-go">바로 주문${ICON.arrow}</span>`,quick(TODAY,'band'),{ariaLabel:'오늘의 추천 '+t.name+' 바로 주문하기'});
 B.append(box('welcome-note','<b>맛만 고르세요.</b> 어울리는 조합을 준비해 드릴게요.'),today,art,box('board-wait',`대기 ${D.store.queue_drinks}잔 · 약 ${D.wait}분`));const r=box('ledge-choice'),full=D.seats<=0;for(const x of ['매장','포장'])r.append(btn('ledge-btn',`<b>${x}</b><span>${x==='매장'?(full?'지금은 빈자리가 없어요':`현재 빈자리 <em class="seats">${seatsShown??D.seats}</em>석`):'들고 가기 편하게'}</span>`,()=>{S.where=x;if(S.quick&&byId[S.quick]&&!byId[S.quick].sold_out){const id=S.quick;S.quick=null;choose(byId[id]);return;}S.quick=null;S.stage='fork';show();},{disabled:x==='매장'&&full}));B.append(r);
 // 지난번보다 자리가 줄었으면 숫자가 하나씩 내려간다
 const el=r.querySelector('.seats');if(el&&seatsShown!==null&&seatsShown>D.seats){let n=seatsShown;const tick=()=>{if(!el.isConnected)return;n--;el.textContent=n;el.classList.remove('tick');void el.offsetWidth;el.classList.add('tick');if(n>D.seats)setTimeout(tick,260);};setTimeout(tick,500);}seatsShown=D.seats;}
function fork(){say('메뉴 정하셨어요?');B.append(btn('big','<b>정했어요</b><span>메뉴를 보거나, 이름을 알려 주세요.</span>',()=>{S.stage='full';show();}),btn('big pri','<b>아직이요</b><span>좋아하는 맛부터 골라 볼까요?</span>',()=>{S.stage='taste';show();}),box('hint',`앞에 음료 ${D.store.queue_drinks}잔이 있어요. 예상 대기 ${D.wait}분부터.`));}
const baseTaste=legacyTaste,basePicks=legacyPicks,baseFull=legacyFull;
// '로/으로': 받침이 없거나 ㄹ 받침이면 '로'
const toJosa=w=>{const c=w.replace(/[^가-힣]/g,'').slice(-1).charCodeAt(0)-0xac00,j=c>=0?c%28:0;return j===0||j===8?'로':'으로';};
function goPicks(){S.recommendationOptions={};S.pool=buildPool();S.page=0;S.rerolls=0;S.from=chatTurn?'chat':'board';S.stage='picks';show();}
const CAT_ADJ={'달달':'달달한','상큼':'상큼한','진한':'진한','부드러운':'순한'};
function taste(){const ok=i=>!i.sold_out&&(!S.less||lessOk(i))&&(!S.nomilk||!milk(i));say('오늘은 어떤 맛으로 드릴까요?',[...(S.less?['단맛 2 이하 메뉴만 남겼어요.']:[]),...(S.nomilk?['우유가 들어간 메뉴는 뺐어요.']:[])]);
 const slot=box('fmap');B.append(slot);
 const cs=box('cats');
 CATS.forEach(c=>{const n=drinks.filter(i=>ok(i)&&catOf(i)===c).length;cs.append(btn('cat',`<span class="dot" style="background:${color(c)}"></span><span><b>${LABELS[c]}</b><br><small>${CAT[c][1]}</small></span><small>${n}</small>`,()=>{S.cat=c;S.situ=null;decide();goPicks();},{disabled:!n}));});
 const more=box('chips taste-more'),flt=(on,label,flip)=>{const b=btn('chip less'+(on?' on':''),(on?ICON.mark:'')+label,()=>{flip();show();});b.setAttribute('aria-pressed',String(on));return b;};
 more.append(box('lbl','거르기'),flt(S.less,'덜 달게',()=>S.less=!S.less),flt(S.nomilk,'우유 빼고',()=>S.nomilk=!S.nomilk),box('lbl','상황으로'));
 ['운동 직전이에요','저녁이라 카페인 없이','기분이 꿀꿀해요','처음이에요'].forEach(x=>more.append(btn('chip',x,()=>hear(x))));
 B.append(cs,more);const map=flavorMap({focus:drinks.filter(ok).map(i=>i.id),room:roomLeft()});slot.replaceWith(map);
 cs.querySelectorAll('.cat').forEach((b,k)=>{b.onpointerenter=()=>map.querySelectorAll('.pin').forEach(p=>p.classList.toggle('lit',p.dataset.cat===CATS[k]));b.onpointerleave=()=>map.querySelectorAll('.lit').forEach(p=>p.classList.remove('lit'));});}
function picks(){const p=S.pool.slice(S.page*3,S.page*3+3);
 if(!p.length){S.stage='full';show();say('조건에 맞는 메뉴가 없어서 전체 메뉴를 보여 드려요.');return;}
 const chat=S.from==='chat',what=(S.situ?`‘${S.situ}’에 맞는`:S.cat?CAT_ADJ[S.cat]+(S.less?' 맛 중 덜 단':' 맛'):S.less?'덜 단':chat?'말씀하신 대로':'어울리는')+(S.nomilk?', 우유 없는':'');
 say(`${what} ${p.length}${p.every(i=>i.category==='디저트')?'개':'잔'}을 골랐어요.`);
 const slot=box('fmap');B.append(slot);
 const row=box('pick-row');row.style.setProperty('--n',p.length);
 p.forEach((i,n)=>{const cfg=S.from==='chat'?S.recommendationOptions?.[i.id]:null;row.append(btn('card pick-card',`${drinkSvg(i,cfg,true)}<span class="pk"><span class="r"><b><span class="no" style="background:${color(catOf(i))}">${n+1}</span>${esc(i.name)}</b></span><span class="pr">${won(cfg?priceOf(i,cfg):Object.values(i.prices)[0])}${i.badge?'<span class="tag">'+esc(i.badge)+'</span>':''}</span><span class="why">${esc([cfg?.temp==='HOT'?'따뜻하게':null,reason(i)].filter(Boolean).join(' · '))}</span></span>`,()=>{decide();choose(i);}));});
 B.append(row);
 const left=2-S.rerolls,more=S.pool.length>(S.page+1)*3,r=box('row2');
 if(left>0&&more)r.append(btn('ghost',`다른 추천 (${left}번 남음)`,()=>{S.rerolls++;S.page++;decide();show();}));
 else{
  // 다시 추천을 다 썼으면, 같은 조건의 첫 추천(대개 베스트)을 권한다. 대화로 골라 달라고 한 경우·후보가 이미 다 보이면 맛 고르기로
  const first=S.pool[0],shown=p.some(i=>i.id===first?.id);
  if(!chat&&first&&!shown){const n=first.name.split(' + ')[0];const lead=({'베스트':'베스트','시그니처':'시그니처','사장 추천':'사장님 추천'})[first.badge]||'처음 추천한';r.append(btn('ghost',`${lead} ${n}${toJosa(n)} 할게요`,()=>{decide();choose(first);}));}
  else r.append(btn('ghost','맛으로 다시 고를게요',()=>{decide();S.cat=S.situ=null;S.stage='taste';show();}));}
 r.append(btn('ghost','전체 보기',()=>{decide();S.stage='full';show();}));
 B.append(r);if(p.every(i=>i.category==='디저트'))slot.remove();else slot.replaceWith(flavorMap({focus:p.map(i=>i.id),numbered:p.map(i=>i.id),compact:true,room:roomLeft()}));}
// 판 본문에서 아직 비어 있는 높이(지도를 그만큼 키운다)
function roomLeft(){const cs=getComputedStyle(B),kids=B.children,used=kids[kids.length-1].getBoundingClientRect().bottom-kids[0].getBoundingClientRect().top;return B.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom)-used-2;}
/* 맛 지도: 진·위스키 맵처럼 칸 격자 위에 이름표를 단 점. 가로 단맛 0~5, 세로 진함 0~5, 칸 한가운데가 그 값 */
const MEASURE=document.createElement('canvas').getContext('2d');
function textW(t,px,letter=false){MEASURE.font=letter?`500 ${px}px "Gmarket Sans",Pretendard,system-ui,sans-serif`:`600 ${px}px Pretendard,"Apple SD Gothic Neo",system-ui,sans-serif`;return MEASURE.measureText(t).width;}
function flavorMap({focus=null,numbered=[],compact=false,room=0}={}){
 const pad=parseFloat(getComputedStyle(B).paddingLeft)||0,W=Math.round(Math.max(300,Math.min(760,B.clientWidth-pad*2))),narrow=W<520;
 const H=Math.round(narrow?(compact?240:420):compact?Math.max(200,Math.min(340,room)):Math.max(280,Math.min(W*.62,room)));
 const L=narrow?36:46,R=W-(narrow?28:32),T=14,Bt=H-(compact?14:30),cw=(R-L)/6,ch=(Bt-T)/6,cx=L+3*cw,cy=T+3*ch,X=v=>L+(v+.5)*cw,Y=v=>Bt-(v+.5)*ch;
 const fs=narrow?11:12.5,lh=narrow?18:21,id='fm'+(++svgSerial),list=drinks.filter(i=>!i.sold_out),pos={},groups={};
 list.forEach(i=>{const k=i.taste['단맛']+','+i.taste['진함'];(groups[k]=groups[k]||[]).push(i);});
 Object.values(groups).forEach(g=>g.forEach((i,n)=>{const gap=Math.min(24,cw*.78/g.length);pos[i.id]=[X(i.taste['단맛'])+(n-(g.length-1)/2)*gap,Y(i.taste['진함'])];}));
 let s=`<defs><marker id="${id}-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="axh" d="M0 0L10 5L0 10z"/></marker><radialGradient id="${id}-sh" cx=".34" cy=".3" r=".8"><stop stop-color="#fff" stop-opacity=".65"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></radialGradient></defs>`;
 if(S.less)s+=`<rect class="less-zone" x="${L}" y="${T}" width="${cx-L}" height="${Bt-T}"/>`;
 for(let k=1;k<6;k++){const x=(L+k*cw).toFixed(1),y=(T+k*ch).toFixed(1);s+=`<line class="g1" x1="${x}" y1="${T}" x2="${x}" y2="${Bt}"/><line class="g1" x1="${L}" y1="${y}" x2="${R}" y2="${y}"/>`;}
 s+=`<rect class="frame" x="${L}" y="${T}" width="${R-L}" height="${Bt-T}" rx="6"/>`;
 if(!compact){for(let v=0;v<=5;v++)s+=`<text class="tick" x="${X(v).toFixed(1)}" y="${Bt+17}" text-anchor="middle">${v}</text><text class="tick" x="${L-8}" y="${(Y(v)+4).toFixed(1)}" text-anchor="end">${v}</text>`;s+=`<text class="tick cap" x="${L-8}" y="${Bt+17}" text-anchor="end">단맛</text>`;}
 // 축 끝 이름표: 판 테두리에 걸쳐 꽂는다
 const ends=[['진하게',cx,T],['가볍게',cx,Bt],['덜 달게',L,cy],['달게',R,cy]],obst=[];
 s+=`<line class="ax" x1="${cx}" y1="${T+12}" x2="${cx}" y2="${Bt-12}" marker-start="url(#${id}-a)" marker-end="url(#${id}-a)"/><line class="ax" x1="${L+30}" y1="${cy}" x2="${R-24}" y2="${cy}" marker-start="url(#${id}-a)" marker-end="url(#${id}-a)"/>`;
 for(const [t,x,y] of ends){const w=textW(t,fs,true)+16,h=lh-2;obst.push({x:x-w/2,y:y-h/2,w,h});s+=`<rect class="end" x="${(x-w/2).toFixed(1)}" y="${(y-h/2).toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="${h/2}"/><text class="endt" x="${x}" y="${(y+fs*.36).toFixed(1)}" text-anchor="middle">${t}</text>`;}
 const dotR=i=>numbered.includes(i.id)?(narrow?9:10):(narrow?5:6);
 list.forEach(i=>{const [x,y]=pos[i.id],r=dotR(i)+2;obst.push({x:x-r,y:y-r,w:2*r,h:2*r});});
 const hit=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
 const named=numbered.length?list.filter(i=>numbered.includes(i.id)):[...list].sort((a,b)=>(focus&&!focus.includes(a.id))-(focus&&!focus.includes(b.id)));
 const pins={};
 for(const i of named){const [x,y]=pos[i.id],t=i.name.split(' + ')[0],w=textW(t,fs)+14,h=lh,r=dotR(i);let best=null;
  for(const d of [7,16,28,42,58])for(const [ax,ay] of [[1,0],[-1,0],[0,-1],[0,1],[1,-1],[-1,-1],[1,1],[-1,1]]){
   const bx=ax>0?x+r+d:ax<0?x-r-d-w:x-w/2,by=ay>0?y+r+d*.6:ay<0?y-r-d*.6-h:y-h/2,box1={x:bx,y:by,w,h};
   let cost=obst.reduce((a,o)=>a+hit(box1,o),0)+(bx<4||bx+w>W-4||by<T+2||by+h>Bt-2?5000:0)+d;
   if(!best||cost<best.cost)best={...box1,cost};}
  obst.push(best);pins[i.id]=best;}
 list.forEach(i=>{const [x,y]=pos[i.id],dim=focus&&!focus.includes(i.id),col=color(catOf(i)),b=pins[i.id],no=numbered.indexOf(i.id),r=dotR(i);
  let g=`<g class="pin${dim?' dim':''}${no>=0?' always':''}" data-id="${i.id}" data-cat="${catOf(i)}" role="button" tabindex="${dim?-1:0}" aria-label="${esc(i.name)} · 단맛 ${i.taste['단맛']} · 진함 ${i.taste['진함']}">`;
  if(b){const nx=Math.max(b.x,Math.min(x,b.x+b.w)),ny=Math.max(b.y,Math.min(y,b.y+b.h));if(Math.hypot(nx-x,ny-y)>r+5)g+=`<line class="lead" x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" />`;
   g+=`<rect class="tag" x="${b.x.toFixed(1)}" y="${b.y.toFixed(1)}" width="${b.w.toFixed(1)}" height="${b.h}" rx="5"/><text class="tagt" x="${(b.x+7).toFixed(1)}" y="${(b.y+b.h/2+fs*.36).toFixed(1)}">${esc(i.name.split(' + ')[0])}</text>`;}
  g+=`<circle class="hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="15"/><circle class="halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r+4}" style="stroke:${col}"/><circle class="pt" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" style="fill:${col}"/>`+(no>=0?`<text class="no" x="${x.toFixed(1)}" y="${(y+4.5).toFixed(1)}" text-anchor="middle">${no+1}</text>`:'');
  s+=g+'</g>';});
 const el=document.createElementNS('http://www.w3.org/2000/svg','svg');
 el.setAttribute('viewBox',`0 0 ${W} ${H}`);el.setAttribute('class','map');el.style.fontSize=fs+'px';el.setAttribute('role','group');el.setAttribute('aria-label','맛 지도: 가로는 단맛, 세로는 진함');el.innerHTML=s;
 // 올린 점은 맨 위로 올려 이름표가 다른 점에 가리지 않게. 터치는 첫 번째 탭에 이름, 두 번째 탭에 선택
 let pointer='mouse';const raise=e=>{const g=e.target.closest('.pin');if(g&&g!==el.lastElementChild)el.appendChild(g);};
 el.addEventListener('pointerover',raise);el.addEventListener('focusin',raise);el.addEventListener('pointerdown',e=>{pointer=e.pointerType;});
 const pick=e=>{const g=e.target.closest('[data-id]');if(!g)return;if(pointer==='touch'&&!g.classList.contains('always')&&!g.classList.contains('open')){el.querySelectorAll('.open').forEach(o=>o.classList.remove('open'));g.classList.add('open');raise(e);return;}choose(byId[g.dataset.id]);};
 el.addEventListener('click',pick);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(e);}});
 const wrap=box('fmap'+(compact?' compact':''));wrap.append(el);return wrap;}
function full(){say('어떤 메뉴로 드릴까요?');for(const category of D.categories){const list=items.filter(i=>i.category===category);const g=box('grp',`<h4>${category}</h4>`);for(const i of list){const b=btn('card menu-list-card',`${drinkSvg(i,null,true)}<span><span class="r"><b>${i.name}</b>${i.badge?'<span class="tag">'+i.badge+'</span>':''}</span><span class="why">${won(Object.values(i.prices)[0])}${i.sold_out?' · 품절':''}</span></span>`,()=>choose(i));if(i.sold_out){b.classList.add('is-sold');b.querySelector('.r').insertAdjacentHTML('beforeend','<span class="sold-tag">품절</span>');}g.append(b);}B.append(g);}B.append(btn('ghost','맛으로 골라 주세요',()=>{S.stage='taste';show();}));}
function alternativesOf(i){const cats=new Set(DEF[i.id]?.taste_categories||[]);const pool=drinks.filter(d=>!d.sold_out&&d.id!==i.id);const same=pool.filter(d=>(DEF[d.id]?.taste_categories||[]).some(c=>cats.has(c)));return (same.length?same:pool).sort((a,b)=>Math.abs(a.taste['단맛']-i.taste['단맛'])-Math.abs(b.taste['단맛']-i.taste['단맛'])||(a.category!==i.category)-(b.category!==i.category)).slice(0,3).map(d=>d.id);}
function soldOutMessage(i,alts){return `죄송해요, ${josa(i.name,'이','가')} 지금 품절이에요.`+(alts.length?' 대신 이건 어떠세요?':'');}
function offerMenus(ids,message,soldId=null){S.offer=ids.filter(id=>byId[id]&&!byId[id].sold_out);S.offerMsg=message;S.offerSold=soldId&&byId[soldId]?soldId:null;S.stage='offer';show();}
function offer(){
 say(S.offerMsg||(S.offerSold?`${byId[S.offerSold].name.split(' + ')[0]} 대신 이건 어떠세요?`:'이런 메뉴는 어떠세요?'));
 if(S.offerSold){const s=byId[S.offerSold];B.append(box('card menu-list-card is-sold sold-row',`${drinkSvg(s,null,true)}<span><span class="r"><b>${esc(s.name)}</b><span class="sold-tag">품절</span></span><span class="why">오늘 준비한 양이 다 나갔어요</span></span>`));}
 S.offer.forEach(id=>{
  const i=byId[id],cfg=S.from==='chat'?S.recommendationOptions?.[id]:null;
  const description=[cfg?.size,cfg?.temp==='HOT'?'따뜻하게':cfg?.temp==='ICE'?'차갑게':null,firstSitu(i)].filter(Boolean).join(' · ');
  B.append(btn('card menu-list-card',`${drinkSvg(i,cfg,true)}<span><span class="r"><b>${esc(i.name)}</b><span class="pr">${won(cfg?priceOf(i,cfg):Object.values(i.prices)[0])}</span></span><span class="why">${esc(description)}</span></span>`,()=>choose(i)));
 });
 B.append(btn('ghost','전체 메뉴 보기',()=>{S.stage='full';show();}));
}
function choose(i,cfg,lead,notes){if(i.sold_out){const alts=alternativesOf(i);offerMenus(alts,soldOutMessage(i,alts),i.id);return;}if(S.item&&S.cfg)draftCache.set(S.item.id,clone(S.cfg));const same=S.item?.id===i.id,recommended=S.from==='chat'&&S.recommendationOptions?.[i.id];S.item=i;S.cfg=cfg||(recommended?clone(recommended):same&&draftCache.has(i.id)?clone(draftCache.get(i.id)):defaultsFor(i));editIndex=null;if(!cfg&&!recommended&&!same&&S.less&&sugarAdjustable(i))S.cfg.sugar=DEF[i.id].sugar_less_sweet??30;S.stage='cup';show();if(lead||notes?.length)say(lead||$('#m').textContent,notes);}
function optionGroup(title,values,current,initial,change,format=x=>x,disabled=x=>false){const wide=values.length>3||values.map(v=>String(format(v)).replace(/<[^>]+>/g,'')).join('').length>15;const g=box('option-group'+(wide?' wide':''));const changed=JSON.stringify(current)!==JSON.stringify(initial);g.append(box('option-heading',esc(title)+(changed?'<span class="changed">변경됨</span>':'')));const row=box('choice-row');row.style.setProperty('--n',values.length);for(const value of values){const on=current===value;const b=btn('chip'+(on&&changed?' changed-choice':''),(on?ICON.mark:'')+format(value),()=>{if(on)return;change(value);fx={kind:title,drop:title==='얼음'?'얼음':title==='시럽'?'시럽':null};show();},{disabled:disabled(value)});b.setAttribute('aria-pressed',String(on));row.append(b);}g.append(row);(OPT||B).append(g);}
function cup(){const i=S.item,c=S.cfg,b=defaultsFor(i);say('이대로 드릴까요? 바꾸고 싶은 것만 골라 주세요.');const ingredients=[...c.tops,c.syrup?extra(c.syrup).name:null,c.shot?'샷 '+c.shot+'회':null,c.oat?'오트밀크':null,c.decaf?'디카페인':null].filter(Boolean);const scale=i.category==='디저트'?1:({'소':.9,'중':1,'대':1.12})[c.size]||1,from=fx.kind==='사이즈'?cupScale:scale;cupScale=scale;
 const cls=fx.kind==='사이즈'?'grow':fx.kind&&!fx.drop?'rattle':'';
 const wrap=box('cup-wrap');wrap.append(box('cup-preview',drinkSvg(i,c,false,fx).replace('<svg ',`<svg class="${cls}" style="--from:${from};--to:${scale}" `)+`<div class="cup-info"><h2>${i.name}</h2><p>${i.category==='디저트'?'단품':c.size+' · '+c.temp}${c.sugar!==null?' · 당도 '+c.sugar+'%':''}</p><p class="ingredient-list">${ingredients.join(' · ')||'메뉴 기본 구성'}</p>${i.category==='디저트'?'':`<p class="cup-meta">${cafWords(i)} · 알레르기 ${i.allergens.join(', ')||'표기 없음'}</p>`}</div>`));OPT=box('opts');
 if(i.category!=='디저트'){
 optionGroup('사이즈',['소','중','대'].filter(v=>i.prices[v]),c.size,b.size,v=>c.size=v);
 optionGroup('온도',i.temperatures,c.temp,b.temp,v=>{c.temp=v;c.ice=v==='ICE'&&!O.ice.not_categories.includes(i.category)?'보통':null;},v=>v==='ICE'?'차갑게':'따뜻하게');
 if(sugarAdjustable(i))optionGroup('당도',O.sugar.levels,c.sugar,b.sugar,v=>c.sugar=v,v=>v+'%');else if(O.sugar.overrides[i.id])OPT.append(box('hint wide',O.sugar.overrides[i.id].why+'.'));
 if(c.temp==='ICE'&&!O.ice.not_categories.includes(i.category))optionGroup('얼음',O.ice.levels,c.ice,b.ice,v=>c.ice=v);
 if(O.toppings.categories.includes(i.category)){const g=box('option-group wide');g.append(box('option-heading','토핑 <small>최대 3개 · 기본 재료는 포함</small>'));const row=box('choice-row tops-row');for(const t of D.toppings){const on=c.tops.includes(t.name);const included=c.incl.includes(t.name);const sty=TOP_STYLE[t.name];const el=btn('chip ingredient-option',`<span class="swatch ${sty[1]==='circle'?'':'square'}" style="background:${sty[0]}"></span><span class="io"><b>${t.name}</b><small>${included?'포함':'+'+t.price.toLocaleString()}</small></span>`,()=>{if(on){c.tops=c.tops.filter(n=>n!==t.name);fx={kind:'토핑'};}else if(c.tops.length<O.toppings.max_per_drink){c.tops.push(t.name);fx={kind:'토핑',drop:t.name};}else{say('토핑은 한 잔에 3개까지예요.');return;}show();});el.setAttribute('aria-pressed',String(on));row.append(el);}g.append(row);OPT.append(g);}
 const available=O.extras.filter(e=>e.categories.includes(i.category)&&(!e.requires_allergen||i.allergens.includes(e.requires_allergen)));
 if(available.some(e=>e.id==='shot'))optionGroup('샷 추가',[0,1,2],c.shot,0,v=>c.shot=v,v=>v?v+'회 +'+(v*extra('shot').price):'기본');
 if(available.some(e=>e.id==='decaf'))optionGroup('디카페인',[false,true],c.decaf,false,v=>c.decaf=v,v=>v?'변경 +'+extra('decaf').price:'기본');
 const syrups=available.filter(e=>e.id.startsWith('syrup_'));if(syrups.length)optionGroup('시럽',[null,...syrups.map(e=>e.id)],c.syrup,null,v=>c.syrup=v,v=>v?`<span class="swatch" style="background:${EXTRA_STYLE[v]}"></span> `+extra(v).name.replace(' 시럽 추가','')+' +'+extra(v).price:'기본');
 if(available.some(e=>e.id==='oat_milk'))optionGroup('우유',[false,true],c.oat,false,v=>c.oat=v,v=>v?'오트밀크 +'+extra('oat_milk').price:'우유');
 if(c.seal)optionGroup('포장',['실링','뚜껑'],c.seal,b.seal,v=>c.seal=v);
 if(c.oat&&(c.tops.some(t=>t.includes('폼'))||DRINK_STYLE[i.id].foam))OPT.append(box('hint wide',rule('oat_foam_milk')));
 } else OPT.append(box('hint wide',i.description));
 const tot=box('cup-total');tot.append(box('total',`<span>합계</span><b>${won(priceOf(i,c))}</b>`),btn('go',(editIndex!==null?'변경한 내용 저장':'이대로 담기')+ICON.arrow,()=>{const art=B.querySelector('.cup-preview svg');const ghost=art&&grabArt(art);addLine(i,c,1);if(ghost)flyToCart(ghost);}),box('action-note','선택하지 않은 옵션은 추천값으로 준비해요.'));wrap.append(OPT,tot);B.append(wrap);OPT=null;
 draftCache.set(i.id,clone(c));
}
// 담기를 누르면 컵 그림이 장바구니 버튼으로 날아간다(움직임을 줄인 설정이면 생략)
function grabArt(el){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return null;const r=el.getBoundingClientRect(),g=el.cloneNode(true);g.removeAttribute('class');g.classList.add('fly-art');Object.assign(g.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});document.body.append(g);flying=true;return g;}
function flyToCart(g){const a=g.getBoundingClientRect(),t=$('#cartBtn').getBoundingClientRect(),dx=t.left+t.width/2-(a.left+a.width/2),dy=t.top+t.height/2-(a.top+a.height/2);
 const anim=g.animate([{transform:'translate(0,0) scale(1) rotate(0)',opacity:1},{transform:`translate(${dx*.45}px,${dy*.45-90}px) scale(.62) rotate(-8deg)`,opacity:1,offset:.45},{transform:`translate(${dx}px,${dy}px) scale(.12) rotate(6deg)`,opacity:.7}],{duration:720,easing:'cubic-bezier(.45,0,.3,1)'});
 anim.onfinish=()=>{g.remove();flying=false;const cb=$('#cartBtn');cb.classList.remove('bump','catch');void cb.offsetWidth;cb.classList.add('bump','catch');};}
function addLine(i,c,qty=1,quiet=false){const line={i,c:clone(c),qty,price:priceOf(i,c)};if(editIndex!==null&&S.cart[editIndex]){line.qty=S.cart[editIndex].qty;S.cart[editIndex]=line;editIndex=null;}else S.cart.push(line);if(!quiet){S.stage='cart';show();say('담았어요. 추가하실 메뉴 있으신가요?');}}
function cart(){const total=S.cart.reduce((a,l)=>a+l.price*l.qty,0);say(S.cart.length?'담은 메뉴를 확인해 주세요. 메뉴를 누르면 다시 고칠 수 있어요.':'아직 담은 메뉴가 없어요.');
 S.cart.forEach((l,k)=>{const el=box('line');
  el.append(btn('line-edit',`${drinkSvg(l.i,l.c,true)}<span><b>${esc(l.i.name)}</b><small>${l.i.category==='디저트'?'단품':l.c.size+' '+(l.c.temp||'')} · ${diffText(l.i,l.c)}</small><span class="edit-hint">바꾸기</span></span>`,()=>{editIndex=k;S.item=l.i;S.cfg=clone(l.c);S.stage='cup';show();},{ariaLabel:l.i.name+' 옵션 바꾸기'}));
  const st=box('step');st.append(btn('',ICON.minus,()=>{if(l.qty>1){l.qty--;show();}},{ariaLabel:l.i.name+' 한 잔 빼기',disabled:l.qty<=1}),box('qty',String(l.qty)),btn('',ICON.plus,()=>{if(l.qty<20){l.qty++;show();}},{ariaLabel:l.i.name+' 한 잔 더',disabled:l.qty>=20}));
  el.append(st,box('pr',won(l.price*l.qty)),btn('del',ICON.close,()=>{S.cart.splice(k,1);show();},{ariaLabel:l.i.name+' 빼기'}));B.append(el);});
 B.append(box('total',`<span>합계</span><b>${won(total)}</b>`));const r=box('row2');r.append(btn('ghost','더 주문할게요',()=>{editIndex=null;S.cat=S.situ=null;S.less=false;S.nomilk=false;S.stage='fork';show();}),btn('go','결제할게요',()=>{if(!S.cart.length)return;S.stage='pay';show();},{disabled:!S.cart.length}));B.append(r);}
function pay(){say('어떻게 결제하시겠어요?');B.append(box('total',`<span>결제 금액</span><b>${won(S.cart.reduce((a,l)=>a+l.price*l.qty,0))}</b>`));for(const name of ['카드','QR','쿠폰'])B.append(btn('big',`<b>${name}</b><span>${name==='쿠폰'?'쿠폰은 한 번에 한 장만 사용할 수 있어요.':'간편하게 결제해요.'}</span>`,()=>finishPayment(name)));B.append(box('action-note','결제 과정은 시연용이에요. 실제로 청구되지 않아요.'));}
const SEATS0=D.seats,QUEUE0=D.store.queue_drinks,waitOf=q=>Math.max(1,Math.round(q*.4));
// 시연용 시계: 30초마다 음료 한 잔이 나가고, 90초마다 자리 하나가 빈다
setInterval(()=>{if(D.store.queue_drinks>QUEUE0){D.store.queue_drinks--;D.wait=waitOf(D.store.queue_drinks);if(S.stage==='where'&&!rendering)$('.board-wait')&&($('.board-wait').textContent=`대기 ${D.store.queue_drinks}잔 · 약 ${D.wait}분`);}},30000);
setInterval(()=>{if(D.seats<SEATS0){D.seats++;if(S.stage==='where')show();}},90000);
function finishPayment(method){if(S.paid)return;if(S.where==='매장'){const cups=S.cart.filter(l=>l.i.category!=='디저트').reduce((a,l)=>a+l.qty,0);D.seats=Math.max(0,D.seats-Math.max(1,cups));}const drinksN=S.cart.filter(l=>l.i.category!=='디저트').reduce((a,l)=>a+l.qty,0);S.ahead=D.store.queue_drinks;D.store.queue_drinks+=drinksN;D.wait=waitOf(D.store.queue_drinks);S.paidAt=Date.now();S.paid=true;S.payment=method;S.number=String(100+Math.floor(Math.random()*900));historyStack=[];currentStage=null;lastSnapshot=null;S.stage='notify';show();}
function phoneDigits(value){return value.replace(/\D/g,'').slice(0,11);}
function phoneFormat(value){const d=phoneDigits(value);return d.length>7?d.slice(0,3)+'-'+d.slice(3,7)+'-'+d.slice(7):d.length>3?d.slice(0,3)+'-'+d.slice(3):d;}
function notify(){say('음료가 나오면 알림으로 알려 드릴까요?');B.append(box('hint','시연용 번호예요. 저장하거나 밖으로 보내지 않아요.'));const inp=document.createElement('input');inp.className='phone-input';inp.type='tel';inp.inputMode='numeric';inp.placeholder='010-0000-0000';inp.setAttribute('aria-label','알림 받을 번호');inp.value=phoneFormat(S.phone||'');const save=btn('go','알림 받기',()=>{if(!/^010\d{8}$/.test(S.phone||''))return;S.maskedPhone='010-****-'+S.phone.slice(-4);S.phone=null;S.stage='done';show();},{disabled:!/^010\d{8}$/.test(S.phone||'')});const update=()=>{S.phone=phoneDigits(inp.value);inp.value=phoneFormat(S.phone);save.disabled=!/^010\d{8}$/.test(S.phone);};inp.oninput=update;B.append(inp);const keys=box('keypad');for(const k of ['1','2','3','4','5','6','7','8','9','지우기','0','⌫'])keys.append(btn('',k==='⌫'?ICON.back:k,()=>{inp.value=k==='지우기'?'':k==='⌫'?phoneDigits(inp.value).slice(0,-1):phoneDigits(inp.value)+k;update();}));B.append(keys,save,btn('ghost','괜찮아요',()=>{S.phone=null;S.maskedPhone=null;S.stage='done';show();}));}
// 완료: 주문 번호와 함께 '접수 → 만드는 중 → 완성'을 보여 준다. 시연이라 앞 잔 수에 맞춰 몇 초 만에 지나간다
const STEPS=['주문 접수','만드는 중','완성'];
function doneStep(){const t=(Date.now()-(S.paidAt||Date.now()))/1000,make=4+Math.min(S.ahead||0,6)*1.5;return t<3?0:t<3+make?1:2;}
function done(){const k=doneStep();say(['주문을 받았어요!','맛있게 만들고 있어요.','다 됐어요! 받아 가세요.'][k]);
 B.append(box('receipt',`<span class="lbl">주문 번호</span><div class="num">${S.number}</div>`));
 B.append(box('progress',STEPS.map((n,j)=>`<span class="st${j<k?' past':j===k?' now':''}"><i></i>${n}</span>`).join('')));
 B.append(box('hint',k===2?`${D.store.pickup_location||'카운터'}에서 받아 가세요.`:`앞에 ${S.ahead||0}잔이 있어요. 다 되면 ${S.maskedPhone?S.maskedPhone+'로 알려 드릴게요.':'화면과 번호판으로 알려 드릴게요.'}`));
 if(S.maskedPhone&&k===2)B.append(btn('ghost','알림톡 미리보기',()=>openDialog('알림톡 미리보기 · 시연용',`펄세권\n주문하신 음료가 나왔어요. ${S.number}번, ${D.store.pickup_location||'카운터'}에서 받아 가세요.`)));
 B.append(btn('go','새 주문 시작',reset));
 if(k<2){clearTimeout(done.t);done.t=setTimeout(()=>{if(S.stage==='done')show();},k===0?3000-(Date.now()-S.paidAt):Math.max(300,(3+4+Math.min(S.ahead||0,6)*1.5)*1000-(Date.now()-S.paidAt)));}}
function openDialog(title,text){$('#dialogContent').innerHTML='<h2>'+esc(title)+'</h2><p>'+esc(text).replace(/\n/g,'<br>')+'</p>';$('#dialog').showModal();}
function staff(){openDialog('직원 호출 · 시연','직원 호출 화면이에요. 실제 직원에게 알림이 전송되지는 않아요.');say('직원에게 도움을 요청할 수 있어요.');}

const MENU_ALIASES=(()=>{const a=items.map(i=>[i.name.replace(/ \+ .*/,'').replace(/\s/g,''),i.id]);for(const w of D.lexicon){const i=items.find(i=>i.name===w.kind);if(i&&!D.toppings.some(t=>t.name===w.text))a.push([w.text.replace(/\s/g,''),i.id]);}return a.sort((a,b)=>b[0].length-a[0].length);})();
function findMenus(text){let t=text.replace(/\s/g,'');const out=[];for(const [alias,id] of MENU_ALIASES){let k;while((k=t.indexOf(alias))>=0){out.push({id,pos:k});t=t.slice(0,k)+'#'.repeat(alias.length)+t.slice(k+alias.length);}}return out.sort((a,b)=>a.pos-b.pos);}
function applyText(i,c,text,msgs){
 const m=text.match(/(?:사이즈\s*)?(소|중|대)\s*사이즈/)||text.match(/사이즈\s*(소|중|대)/);if(m){if(i.prices[m[1]])c.size=m[1];else msgs.push(m[1]+' 사이즈는 제공하지 않아요.');}
 if(/라지|큰\s*(거|걸)/.test(text)){if(i.prices.대)c.size='대';else msgs.push('이 메뉴는 중 사이즈만 있어요.');}
 const temp=/따뜻|뜨아|뜨거|\bhot\b|핫/i.test(text)?'HOT':/아이스|차갑|아아|\bice\b/i.test(text)?'ICE':null;if(temp){if(i.temperatures.includes(temp)){c.temp=temp;c.ice=temp==='ICE'&&!O.ice.not_categories.includes(i.category)?c.ice||'보통':null;}else msgs.push('이 메뉴는 '+(i.temperatures[0]||'단품')+'로만 나와요.');}
 const sg=text.match(/당도\s*(\d+)\s*%?/)||(LESS_RE.test(text)?[0,'30']:null);if(sg){if(!sugarAdjustable(i))msgs.push(O.sugar.overrides[i.id]?.why||'이 메뉴는 당도를 조절할 수 없어요.');else if(!O.sugar.levels.includes(+sg[1]))msgs.push('당도는 0, 30, 50, 70, 100% 중에 골라 주세요.');else c.sugar=+sg[1];}
 const ice=text.match(/얼음(?:을|은)?\s*(적게|조금|많이|많|보통|빼|없이)/);if(ice){if(O.ice.not_categories.includes(i.category))msgs.push(rule('smoothie_no_ice'));else if(c.temp!=='ICE')msgs.push(rule('hot_no_ice'));else if(/빼|없이/.test(ice[1]))msgs.push('얼음은 적게, 보통, 많이 중에 고를 수 있어요.');else c.ice=/많/.test(ice[1])?'많이':/보통/.test(ice[1])?'보통':'적게';}
 let masked=text;for(const top of [...D.toppings].sort((a,b)=>b.name.length-a.name.length)){const re=new RegExp(top.name+'(?:을|은|도)?\\s*(빼|제거|없이|추가|넣|올려)');const match=masked.match(re);if(!match)continue;masked=masked.replace(re,'');if(!O.toppings.categories.includes(i.category)){msgs.push(rule('topping_scope'));continue;}if(/빼|제거|없이/.test(match[1]))c.tops=c.tops.filter(t=>t!==top.name);else if(!c.tops.includes(top.name)){if(c.tops.length>=O.toppings.max_per_drink)msgs.push(rule('topping_max'));else c.tops.push(top.name);}}
 const xforms=[[/샷(?:을)?\s*(추가|빼|제거)|샷\s*[12](?:회|개)/,'shot'],[/디카페인/,'decaf'],[/오트밀크|오트/,'oat_milk'],[/바닐라\s*시럽/,'syrup_vanilla'],[/헤이즐넛\s*시럽/,'syrup_hazelnut'],[/카라멜\s*시럽/,'syrup_caramel']];for(const [re,id]of xforms){if(!re.test(text))continue;const e=extra(id),allowed=e.categories.includes(i.category)&&(!e.requires_allergen||i.allergens.includes(e.requires_allergen));if(!allowed){msgs.push(e.name+' 옵션은 이 메뉴에 적용할 수 없어요.');continue;}if(id==='shot')c.shot=/샷.*(빼|제거)/.test(text)?0:/샷\s*2|두\s*샷/.test(text)?2:1;else if(id==='decaf')c.decaf=!/디카페인.*(취소|빼|제거)/.test(text);else if(id==='oat_milk')c.oat=!/오트.*(취소|빼|제거)/.test(text);else c.syrup=/시럽.*(빼|제거|없이)/.test(text)?null:id;}
 if(/우유로\s*(변경|바꿔)/.test(text))c.oat=false;if(/뚜껑/.test(text)&&c.seal)c.seal='뚜껑';if(/실링/.test(text)&&c.seal)c.seal='실링';
}
const OPTION_REQUEST=/사이즈|얼음|당도|덜\s*달|안\s*달|따뜻|차갑|아이스|\bHOT\b|\bICE\b|샷|오트|시럽|디카페인|뚜껑|실링|(?:펄|폼|코코넛|알로에)(?:을|은|도)?\s*(추가|넣|빼|제거|없이)/i;
function cfgSummary(i,c){return [i.name,c.size,c.temp,c.sugar!==null?'당도 '+c.sugar+'%':null,c.ice?'얼음 '+c.ice:null,...c.tops,c.syrup?extra(c.syrup).name:null,c.oat?'오트밀크':null,c.shot?'샷 '+c.shot+'회':null,c.decaf?'디카페인':null].filter(Boolean).join(' · ');}
function rulesHear(text){const t=text.trim();if(!t)return;appendMessage('user',t);chatTurn=[];try{handleMessage(t);}catch(error){console.error(error);chatTurn.push('처리하지 못했어요. 다시 말씀하시거나 직원을 불러 주세요.');}const reply=chatTurn.filter(Boolean);chatTurn=null;appendMessage('bot',(reply.length?reply:[$('#m').textContent]).join('\n'));revealChat();}
// 좁은 화면에선 대화창이 서랍이라, 답이 오면 서랍을 열어 보여 준다
function revealChat(){if(!matchMedia('(min-width:1200px)').matches)setChat(true);}
function handleMessage(t){
 if(/직원/.test(t))return staff();
 if(S.paid){say('결제된 주문은 여기서 변경할 수 없어요. 도움이 필요하면 직원을 불러 주세요.');return;}
 if(/뒤로|이전\s*화면/.test(t)){goBack();return;}
 if(/펄.*(삶|신선|언제)/.test(t)){say(pearlAge()+'. 펄은 30분마다 새로 삶아요.');return;}
 if(/버블티|펄\s*음료/.test(t)&&!findMenus(t.replace(/버블티|밀크티/g,' ')).length){const ids=BUBBLE_IDS();if(!S.where)S.where='포장';offerMenus(ids,'어떤 버블티로 드릴까요?');say('어떤 버블티로 드릴까요? 아래에서 골라 주세요.');return;}
 if(/빈자리|자리\s*있|좌석/.test(t)){say(`현재 빈자리는 ${D.seats}석이에요. 창가와 콘센트 자리는 직원에게 확인해 주세요.`);return;}
 if(/대기|몇\s*분|얼마나\s*걸/.test(t)){say(`앞에 음료 ${D.store.queue_drinks}잔이 있고, 예상 대기는 ${D.wait}분부터예요.`);return;}
 if(/뭐예요|뭐에요|뭔가요|뭐야|차이|설명/.test(t)){const tp=[...D.toppings].sort((a,b)=>b.name.length-a.name.length).find(x=>t.includes(x.name));if(tp){say(tp.description);return;}const f=FAQ_RE.find(([re])=>re.test(t));if(f){say(D.faq[f[1]].replace(/^\[자주 묻는 말\]\s*/, '').replace(/^[^?]*\?\s*/,''));return;}const match=findMenus(t)[0];if(match){say(byId[match.id].description);return;}}
 const policy=POL_RE.find(([re])=>re.test(t));if(policy){say(D.policy[policy[1]]);if(/취소|잘못/.test(t))B.append(btn('ghost','직원 부르기',staff));return;}
 if(/전체|메뉴판|다\s*보여/.test(t)){S.stage='full';show();return;}
 if(/장바구니/.test(t)){S.stage='cart';show();return;}
 if(S.stage==='where'&&!findMenus(t).length){if(/포장|가져|테이크/.test(t)){S.where='포장';S.stage='fork';show();return;}if(/매장|먹고|여기서/.test(t)){S.where='매장';S.stage='fork';show();return;}}
 if(S.stage==='fork'&&/^(아직|모르|골라)/.test(t)){S.stage='taste';show();return;}
 if(S.stage==='cup'&&/^(네|응|좋아|이대로|담아)([\s!?.]|$)/.test(t)){addLine(S.item,S.cfg,1);return;}
 if(S.stage==='cart'&&/결제/.test(t)){if(!S.cart.length){say('먼저 메뉴를 담아 주세요.');return;}S.stage='pay';show();return;}
 if(S.stage==='pay'&&/카드|QR|큐알|쿠폰/i.test(t)){finishPayment(/카드/.test(t)?'카드':/쿠폰/.test(t)?'쿠폰':'QR');return;}
 if(S.stage==='picks'&&/다른\s*(거|걸|것)|별로|다시\s*추천/.test(t)){if(S.rerolls<2&&S.pool.length>(S.page+1)*3){S.rerolls++;S.page++;show();}else{S.stage='full';show();say('더 추천할 메뉴가 없어 전체 메뉴를 보여 드려요.');}return;}
 const found=findMenus(t);
 // 카페인 질문은 주문이 아니라 정보: 아메리카노 한 잔과 견준 말로
 if(found.length&&/카페인/.test(t)){const i=byId[found[0].id],n=i.name.split(' + ')[0];say(!caf(i)?`${josa(n,'은','는')} 카페인이 없어요.`:i.id==='americano'?`아메리카노는 카페인이 한 잔에 ${caf(i)}mg이에요.`:`${josa(n,'은','는')} ${cafWords(i).replace('카페인 ','카페인이 ')}예요.`.replace(')예요',')이에요'));return;}
 if(S.stage==='cup'&&OPTION_REQUEST.test(t)&&(!found.length||!found.some(m=>m.id!==S.item.id))){const before=clone(S.cfg),msgs=[];applyText(S.item,S.cfg,t,msgs);show();if(JSON.stringify(before)!==JSON.stringify(S.cfg))say('변경했어요. '+cfgSummary(S.item,S.cfg),msgs);else say(msgs.length?'요청하신 옵션을 확인해 주세요.':'어떤 옵션으로 바꿀까요? 사이즈, 당도, 얼음이나 재료를 알려 주세요.',msgs);return;}
 if(!found.length){const situ=Object.keys(SITU).find(k=>SITU[k].re.test(t));const less=LESS_RE.test(t);const taste=Object.keys(TASTE_RE).find(k=>TASTE_RE[k].test(t)&&!(less&&k==='달달'))||(/순하게|순한/.test(t)?'부드러운':/달게/.test(t)&&!less?'달달':null);if(situ||taste||less){if(!S.where)S.where='포장';S.situ=situ||null;S.cat=situ?null:taste;S.less=less;goPicks();return;}}
 if(found.length){const {lines,unknown}=readOrder(t);const warnings=unknown.map(unknownText);if(!S.where)S.where='포장';if(/있어요|있나요|파나요|가능|되나요/.test(t)&&!/주세요|주문|담아|할게/.test(t)){if(lines.length===1&&lines[0].i.sold_out){choose(lines[0].i);return;}const names=lines.map(l=>l.i.sold_out?josa(l.i.name,'은','는')+' 지금 품절이에요.':l.i.name+' 있어요.');S.stage='full';show();say(names.join(' ')||'메뉴를 확인해 주세요.',warnings);return;}const available=lines.filter(l=>!l.i.sold_out);const soldLines=lines.filter(l=>l.i.sold_out);if(!available.length&&soldLines.length){choose(soldLines[0].i);return;}soldLines.forEach(l=>warnings.push(josa(l.i.name,'은','는')+' 지금 품절이라 담지 않았어요.'));if(!available.length){S.stage='full';show();say('해당 메뉴를 주문할 수 없어 전체 메뉴를 보여 드려요.',warnings);return;}if(available.length===1&&available[0].q===1){const i=available[0].i,c=defaultsFor(i);applyText(i,c,available[0].seg,warnings);choose(i,c,'추천 조합을 준비했어요. '+cfgSummary(i,c),warnings);return;}for(const l of available){const c=defaultsFor(l.i);applyText(l.i,c,l.seg,warnings);editIndex=null;addLine(l.i,c,l.q,true);}S.stage='cart';show();say('잔별로 나눠 담았어요. 장바구니를 확인해 주세요.',warnings);return;}
 if(OPTION_REQUEST.test(t)){say('먼저 음료를 골라 주세요. 선택한 음료에서 옵션을 바꿀 수 있어요.');return;}
 say('그건 제가 대답하기 어려워요. 이어서 주문을 도와드릴게요.');
}
$('#f').addEventListener('submit',e=>{e.preventDefault();const t=$('#in').value;$('#in').value='';hear(t);});
$('#staff').onclick=staff;$('#reset').onclick=goHome;$('#home').onclick=goHome;$('#back').onclick=goBack;
// 자리 비움: 한동안 입력이 없으면 10초를 세고 처음 화면으로. 시연 중엔 끊기지 않게 기본은 꺼 두고, ?idle=75처럼 초를 주면 켠다
const IDLE_S=(()=>{const v=new URLSearchParams(location.search).get('idle');return v===null?0:Math.max(0,+v||0);})();
let idleTimer=null,idleTick=null;
function idleArm(){clearTimeout(idleTimer);if(!IDLE_S||$('#dialog').dataset.kind==='idle')return;idleTimer=setTimeout(idleAsk,IDLE_S*1000);}
function idleAsk(){const busy=(()=>{try{return aiPending;}catch{return false;}})();
 if(S.stage==='where'&&!S.cart.length&&messages.length<=1)return idleArm();
 if(busy||$('#dialog').open)return idleArm();
 let n=10;const paint=()=>{$('#dialogContent').querySelector('.count').textContent=n;};
 $('#dialogContent').innerHTML='<h2>계속 주문하시겠어요?</h2><p><b class="count">10</b>초 뒤에 처음 화면으로 돌아가요.'+(S.cart.length&&!S.paid?' 담은 메뉴도 비워져요.':'')+'</p>';
 const r=box('row2 dialog-actions');r.append(btn('ghost','처음으로',()=>{idleStop();$('#dialog').close();reset();}),btn('go','계속할게요',()=>{idleStop();$('#dialog').close();}));$('#dialogContent').append(r);
 $('#closeDialog').hidden=true;$('#dialog').dataset.kind='idle';$('#dialog').showModal();
 idleTick=setInterval(()=>{n--;paint();if(n<=0){idleStop();$('#dialog').close();reset();}},1000);}
function idleStop(){clearInterval(idleTick);idleTick=null;delete $('#dialog').dataset.kind;}
['pointerdown','keydown','input','wheel'].forEach(t=>addEventListener(t,idleArm,{passive:true,capture:true}));
// 처음으로: 담은 메뉴가 있으면 한 번 묻는다
function goHome(){if(S.cart.length&&!S.paid){$('#dialogContent').innerHTML='<h2>처음으로 돌아갈까요?</h2><p>담은 메뉴 '+S.cart.reduce((a,l)=>a+l.qty,0)+'잔이 모두 사라져요.</p>';const r=box('row2 dialog-actions');r.append(btn('ghost','계속 주문하기',()=>$('#dialog').close()),btn('go','처음으로',()=>{$('#dialog').close();reset();}));$('#dialogContent').append(r);$('#closeDialog').hidden=true;$('#dialog').showModal();return;}reset();}
$('#dialog').addEventListener('close',()=>{$('#closeDialog').hidden=false;if($('#dialog').dataset.kind==='idle')idleStop();idleArm();});
$('.say').insertAdjacentHTML('afterbegin',mascot('host'));$('#home').insertAdjacentHTML('afterbegin','<svg class="logo" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="var(--ink)"/><path d="M25 5L21.5 17" stroke="var(--on-ink)" stroke-width="3.4"/><rect x="8" y="15" width="24" height="4" rx="2" fill="var(--on-ink)"/><circle cx="13" cy="28" r="3.6" fill="var(--on-ink)"/><circle cx="20" cy="29" r="3.6" fill="var(--on-ink)"/><circle cx="27" cy="28" r="3.6" fill="var(--on-ink)"/></svg>');$('.chat-head').insertAdjacentHTML('afterbegin',mascot('avatar'));
$('#cartBtn').onclick=()=>{if(S.paid||S.stage==='cart')return;editIndex=null;S.stage='cart';show();};
$('#chatBtn').onclick=()=>setChat(!document.body.classList.contains('chat-open'));$('#chatClose').onclick=()=>setChat(false);
addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('chat-open'))setChat(false);});
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(['taste','picks'].includes(S.stage))show();},150);});
function paintTheme(){const dark=document.documentElement.dataset.theme==='dark';$('#theme').innerHTML=dark?ICON.sun:ICON.moon;$('#theme').setAttribute('aria-label',dark?'흰 판으로 바꾸기':'검은 판으로 바꾸기');document.querySelector('meta[name=theme-color]')?.setAttribute('content',dark?'#1d1c1a':'#f4f0e8');}
$('#theme').onclick=()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';paintTheme();};paintTheme();
$('#closeDialog').onclick=()=>$('#dialog').close();
TASTE_RE['달달']=/달달|달콤|단\s*거|달게/;TASTE_RE['부드러운']=/부드러|고소|순하게|순한/;
rulesReset();
window.pearlsewon={get state(){return S;},get messages(){return messages;},select:id=>choose(byId[id]),hear,reset,back:goBack,priceOf,drinkSvg,styles:{drinks:DRINK_STYLE,toppings:TOP_STYLE,extras:EXTRA_STYLE}};
