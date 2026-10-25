/* =====================================================================
   화면 도구 — 앱 모양 확인창 · 되돌리기 토스트 · 로딩 표시 · 말풍선 · 끌어 놓기
   ===================================================================== */

/* ---------- 확인창 (브라우저 confirm/prompt 대신) ----------
   ask({title, msg(html), ok, cancel, danger, typeWord, noDismiss}) → Promise<true|false|null(닫기)> */
function ask(o){
  o=o||{};
  return new Promise(res=>{
    let d=$('#dim2'); if(!d){ d=document.createElement('div'); d.id='dim2'; document.body.appendChild(d); }
    d.innerHTML='<div class="modal ask'+(o.danger?' danger':'')+'" role="alertdialog" aria-modal="true"><div class="mh">'+(o.danger?'⚠️ ':'')+esc(o.title||'확인')+'</div>'
      +'<div class="mb">'+(o.msg||'')+(o.typeWord?'<label class="small" style="display:block;margin-top:10px">계속하려면 「<b>'+esc(o.typeWord)+'</b>」라고 입력하세요<input id="ask-in" autocomplete="off" style="display:block;width:100%;margin-top:4px"></label>':'')+'</div>'
      +'<div class="mf"><button class="btn" data-a="0">'+esc(o.cancel||'취소')+'</button><button class="btn '+(o.danger?'danger-solid':'pri')+'" data-a="1">'+esc(o.ok||'확인')+'</button></div></div>';
    d.classList.remove('hide');
    const okB=d.querySelector('[data-a="1"]'), inp=d.querySelector('#ask-in');
    const done=v=>{ d.classList.add('hide'); d.innerHTML=''; document.removeEventListener('keydown',key,true); res(v); };
    const key=e=>{ if(e.key==='Escape'&&!o.noDismiss){ e.preventDefault(); done(null); } else if(e.key==='Enter'&&!okB.disabled&&document.activeElement!==d.querySelector('[data-a="0"]')){ e.preventDefault(); done(true); } };
    document.addEventListener('keydown',key,true);
    if(inp){ okB.disabled=true; inp.oninput=()=>okB.disabled=inp.value.trim()!==o.typeWord; setTimeout(()=>inp.focus(),30); } else setTimeout(()=>okB.focus(),30);
    d.querySelector('[data-a="0"]').onclick=()=>done(false);
    okB.onclick=()=>done(true);
    d.onclick=e=>{ if(e.target===d&&!o.noDismiss) done(null); };
  });
}

/* ---------- 되돌리기 ---------- */
function snapDB(){ return JSON.stringify({students:DB.students,records:DB.records,tomb:DB.tomb,settings:DB.settings,checks:CUR?CUR.checks:null,fBan:ST.fBan}); }
function undoToast(msg,snap,after){
  const t=$('#toast'); clearTimeout(t._h);
  t.innerHTML='<span>'+esc(msg)+'</span><button type="button" class="undo">되돌리기</button>';
  t.classList.remove('hide');
  t.querySelector('.undo').onclick=()=>{
    const s=JSON.parse(snap); DB.students=s.students; DB.records=s.records; DB.tomb=s.tomb; if(s.settings) DB.settings=s.settings; if('fBan' in s) ST.fBan=s.fBan; if(CUR&&s.checks) CUR.checks=s.checks;
    if(after) after(); save(); render(); toast('되돌렸습니다');
  };
  t._h=setTimeout(()=>t.classList.add('hide'),10000);
}

/* ---------- 로딩 표시 ---------- */
let busyN=0;
function busy(on,msg){
  let b=$('#busy'); if(!b){ b=document.createElement('div'); b.id='busy'; b.innerHTML='<span class="spin"></span><span class="t"></span>'; document.body.appendChild(b); }
  busyN=Math.max(0,busyN+(on?1:-1));
  if(on&&msg) b.querySelector('.t').textContent=msg;
  b.classList.toggle('on',busyN>0);
}
async function withBusy(msg,fn){ busy(true,msg); await new Promise(r=>setTimeout(r,30)); try{ return await fn(); } finally{ busy(false); } }

/* ---------- 말풍선 (title 속성을 즉시 뜨는 말풍선으로) ---------- */
(function(){
  const tip=document.createElement('div'); tip.id='tip'; document.body.appendChild(tip);
  let cur=null, hideT=null;
  const textOf=el=>{ if(el.hasAttribute('title')){ el.dataset.tip=el.getAttribute('title'); el.removeAttribute('title'); } return el.dataset.tip; };
  const show=el=>{
    const t=textOf(el); if(!t){ return; }
    cur=el; tip.textContent=t; tip.classList.add('on');
    const r=el.getBoundingClientRect(), w=tip.offsetWidth, h=tip.offsetHeight;
    let x=r.left+r.width/2-w/2; x=Math.max(8,Math.min(x,window.innerWidth-w-8));
    let y=r.top-h-8; tip.classList.toggle('below',y<8); if(y<8) y=r.bottom+8;
    tip.style.left=x+'px'; tip.style.top=y+'px';
  };
  const hide=()=>{ cur=null; tip.classList.remove('on'); };
  document.addEventListener('mouseover',e=>{ const el=e.target.closest&&e.target.closest('[title],[data-tip]'); if(el&&el!==cur&&!el.closest('#tip')) show(el); else if(!el&&cur) hide(); });
  document.addEventListener('scroll',hide,true);
  /* 터치: 누르면 2.5초 표시 */
  document.addEventListener('touchstart',e=>{ const el=e.target.closest&&e.target.closest('[title],[data-tip]'); if(!el) return hide(); show(el); clearTimeout(hideT); hideT=setTimeout(hide,2500); },{passive:true});
})();

/* ---------- 끌어 놓기: 파일 종류를 보고 알아서 처리 ---------- */
function feedInput(sel,files){ const dt=new DataTransfer(); files.forEach(f=>dt.items.add(f)); const i=$(sel); i.files=dt.files; i.dispatchEvent(new Event('change')); }
async function routeFiles(files){
  files=files.filter(f=>/\.(html?|xlsx|xlsm|xls)$/i.test(f.name));
  if(!files.length){ toast('엑셀(.xlsx/.xlsm) 또는 이 앱의 HTML 파일만 올릴 수 있습니다'); return; }
  if(files.length>1||/\.html?$/i.test(files[0].name)){
    if(!CUR){ toast('먼저 교육과정을 불러와 주세요'); return; }
    feedInput('#f-merge',files); return;           /* 담임 파일·상담 기록 엑셀 합치기 */
  }
  const f=files[0];
  if(/\.xls$/i.test(f.name)){ feedInput('#f-cur',[f]); return; }
  let wb; try{ wb=await withBusy('엑셀 읽는 중…',()=>loadWB(f)); }catch(e){ feedInput('#f-cur',[f]); return; }
  /* 백업 · 나이스 편성표 · 교육과정 양식 → 교육과정 올리기 경로 / 상담 기록 시트만 있으면 → 기록 가져오기 */
  if(readBackup(wb)||detectNeis(wb)||findCurSheet(wb)){ feedInput('#f-cur',[f]); return; }
  if(!findDbSheet(wb)&&CUR&&findPickSheet(wb)){ pickUpload(f); return; }   /* 1 표시 현황표 → 바뀐 학생만 반영 */
  if(findDbSheet(wb)||findPickSheet(wb)){ if(!CUR){ toast('먼저 교육과정을 불러와 주세요'); return; } feedInput('#f-db',[f]); return; }
  modal('어떤 파일인지 알아보지 못했습니다','<p>「'+esc(f.name)+'」에서 교육과정 표, 나이스 편성표, 상담 기록, 백업을 찾지 못했습니다.</p><p class="small muted" style="margin-top:8px">교육과정은 나이스 「입학생 학교 교육과정 조회」 엑셀이나 이 앱의 양식을, 기록은 이 앱에서 내려받은 엑셀이나 담임 HTML 파일을 올려 주세요.</p>');
}
(function(){
  const ov=document.createElement('div'); ov.id='dropov';
  ov.innerHTML='<div class="box"><div class="ic">📥</div><b>여기에 놓으세요</b><span>나이스 교육과정 엑셀 · 채운 양식 · 백업 엑셀 · 담임 HTML 파일<br>파일 종류를 보고 알아서 처리합니다</span></div>';
  document.body.appendChild(ov);
  let depth=0;
  const hasFiles=e=>e.dataTransfer&&[...(e.dataTransfer.types||[])].includes('Files');
  window.addEventListener('dragenter',e=>{ if(!hasFiles(e)) return; e.preventDefault(); depth++; ov.classList.add('on'); });
  window.addEventListener('dragover',e=>{ if(!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect='copy'; });
  window.addEventListener('dragleave',e=>{ if(!hasFiles(e)) return; depth=Math.max(0,depth-1); if(!depth) ov.classList.remove('on'); });
  window.addEventListener('drop',e=>{ if(!hasFiles(e)) return; e.preventDefault(); depth=0; ov.classList.remove('on'); routeFiles([...e.dataTransfer.files]); });
})();

/* ---------- 부드럽게 이동 + 반짝 ---------- */
const REDUCED=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function flashTo(els){
  els=els.filter(Boolean); if(!els.length) return;
  els[0].scrollIntoView({behavior:REDUCED?'auto':'smooth',block:'center',inline:'center'});
  els.forEach(e=>{ e.classList.remove('flash'); void e.offsetWidth; e.classList.add('flash'); setTimeout(()=>e.classList.remove('flash'),1700); });
}

/* ---------- 큰 표는 보이는 앞부분부터 그리고 나머지는 이어서 (지연 로딩) ---------- */
let progTok=0;
function progressive(tbody,rows,first){
  const tok=++progTok; first=first||60;
  if(!tbody||rows.length<=first) return;
  let i=first;
  const step=()=>{ if(tok!==progTok||!tbody.isConnected) return;
    tbody.insertAdjacentHTML('beforeend',rows.slice(i,i+80).join('')); i+=80;
    if(i<rows.length) (window.requestIdleCallback||setTimeout)(step,{timeout:60}); };
  setTimeout(step,0);
}
