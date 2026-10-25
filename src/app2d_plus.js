/* =====================================================================
   편의 기능 — 화면 취향 · 반 명단 붙여넣기 · 일괄 인쇄 · 정렬 · 상태 칩 · 히트맵
             · 이름 가리기 · 글자 크기/발표 모드 · 상태 기호 · 둘러보기
   ===================================================================== */

/* ---------- 화면 취향 (기록과 다른 저장 칸, 이 브라우저에만) ---------- */
const UI_KEY='ecsUi:prefs';
const UI=(()=>{ try{ return Object.assign({zoom:100,heat:true,mask:false,tourDone:false},JSON.parse(localStorage.getItem(UI_KEY)||'{}')); }catch(e){ return {zoom:100,heat:true,mask:false,tourDone:false}; } })();
function uiSave(){ try{ localStorage.setItem(UI_KEY,JSON.stringify(UI)); }catch(e){} }

/* ---------- 상태 이름 · 기호 (색만으로 구분하지 않도록) ---------- */
const ST_INFO={ok:{t:'완료',i:'✓'},warn:{t:'미완료',i:'…'},bad:{t:'확인 필요',i:'!'},none:{t:'상담 전',i:'–'}};
function stOf(x){ return x&&x.lr?evalStatus(x.ev):'none'; }

/* ---------- 이름 가리기 (화면·인쇄만, 엑셀·백업은 실명) ---------- */
function dn(name){
  name=String(name==null?'':name);
  if(!UI.mask) return name;
  const m=name.match(/^(.*?)(\(.*\))?$/); const core=m[1]||'', tail=m[2]||'';
  const ch=[...core.trim()]; if(!ch.length) return name;
  return ch[0]+'○'.repeat(Math.max(1,ch.length-1))+tail;
}

/* ---------- 정렬 ---------- */
/* sortBy(list, key, ST.sort[tk], getters) — 빈 값은 항상 끝 */
function sortList(list,tk,getters){
  const S=(ST.sort=ST.sort||{})[tk]; if(!S||!getters[S.col]) return list;
  const g=getters[S.col], d=S.dir;
  return list.slice().sort((a,b)=>{ const x=g(a), y=g(b);
    const ex=x==null||x==='', ey=y==null||y===''; if(ex||ey) return ex===ey?0:ex?1:-1;
    return (typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'ko',{numeric:true}))*d; });
}
function sortTh(tk,col,label,cls){
  const S=(ST.sort||{})[tk]; const on=S&&S.col===col;
  return '<th class="srt'+(cls?' '+cls:'')+(on?' on':'')+'" data-tk="'+tk+'" data-col="'+col+'" title="눌러서 정렬">'+label+'<span class="ar">'+(on?(S.dir>0?'▲':'▼'):'↕')+'</span></th>';
}
function bindSort(P,rerender){
  P.querySelectorAll('th.srt').forEach(th=>th.onclick=e=>{ e.stopPropagation();
    ST.sort=ST.sort||{}; const tk=th.dataset.tk, col=th.dataset.col, S=ST.sort[tk];
    if(S&&S.col===col){ if(S.dir>0) S.dir=-1; else delete ST.sort[tk]; } else ST.sort[tk]={col,dir:1};
    keepScroll(rerender); });
}
const BANNO=s=>(+s.b||0)*1000+(+s.no||0);

/* ---------- 상태 칩 ---------- */
function statusChips(key,items,withNone,labels){
  const L=k=>(labels&&labels[k])||ST_INFO[k].t;
  const F=(ST.chip=ST.chip||{}); const cur=F[key]||'';
  const keys=['bad','warn','ok'].concat(withNone?['none']:[]);
  const cnt={}; items.forEach(s=>cnt[s]=(cnt[s]||0)+1);
  return '<div class="chips" data-ck="'+key+'"><button type="button" data-st=""'+(cur?'':' class="on"')+'>전체 <b>'+items.length+'</b></button>'
    +keys.map(k=>'<button type="button" data-st="'+k+'" class="c-'+k+(cur===k?' on':'')+'"><span class="sy">'+ST_INFO[k].i+'</span>'+L(k)+' <b>'+(cnt[k]||0)+'</b></button>').join('')+'</div>';
}
function bindChips(P,rerender){
  P.querySelectorAll('.chips[data-ck] button').forEach(b=>b.onclick=()=>{ ST.chip[b.parentElement.dataset.ck]=b.dataset.st; keepScroll(rerender); });
}
function chipPass(key,st){ const c=(ST.chip||{})[key]; return !c||c===st; }

/* ---------- 히트맵 ---------- */
/* 불투명한 색으로 계산 (고정 머리글 아래로 표 내용이 비치지 않게) */
function heatBg(n,max,k){
  if(!UI.heat||!max||!n) return ''; k=k||1;
  /* 가장 진한 칸도 검은 글씨가 잘 읽히는 정도까지만 칠함 → 글자색은 늘 같게 */
  const a=(0.08+0.42*n/max)*k, c=[91,111,225];
  const rgb=c.map(v=>Math.round(255*(1-a)+v*a));
  return 'background:rgb('+rgb.join(',')+');color:#2f2a4a;font-weight:700;';
}
function heatSwitch(){ return '<label class="small row" style="gap:5px"><input type="checkbox" class="sw" id="heat-sw"'+(UI.heat?' checked':'')+'> 인원 많을수록 진하게</label>'; }
function bindHeat(rerender){ const h=$('#heat-sw'); if(h) h.onchange=()=>{ UI.heat=h.checked; uiSave(); keepScroll(rerender); }; }

/* ---------- 반 명단 붙여넣기 ---------- */
function parseRoster(txt,y0,b0){
  const out=[], skip=[];
  String(txt||'').split(/\r?\n/).forEach((line,li)=>{
    const raw=line.trim(); if(!raw) return;
    const tk=raw.split(/[\t,;]+|\s+/).map(t=>t.trim()).filter(Boolean);
    let name='', y=y0, b=b0, no='';
    const nums=[];
    tk.forEach(t=>{
      if(/^\d{4,5}$/.test(t)&&!nums.length){ const h=parseHakbun(t); if(h){ y=h.y; b=h.b; no=h.no; nums.push('hb'); return; } }
      if(/^\d{1,2}$/.test(t)){ nums.push(t); return; }
      const nm=t.replace(/\s+/g,'');
      if(!name&&/^[가-힣]{2,6}$/.test(nm)&&!/^(남|여|남자|여자|이름|성명|번호|학번|비고|성별)$/.test(nm)) name=nm;
      else if(!name&&/^[A-Za-z][A-Za-z .'-]{1,30}$/.test(t)&&!/^(name|no)$/i.test(t)) name=t;
    });
    if(!nums.includes('hb')){ if(nums.length>=2){ b=String(+nums[0]); no=String(+nums[1]); } else if(nums.length===1) no=String(+nums[0]); }
    if(!name){ skip.push(li+1); return; }
    out.push({y:String(y||''),b:String(b||''),no:String(no||''),name});
  });
  return {list:out,skip};
}
function rosterModal(){
  const yDef=DB.settings.y||(CUR&&CX.sems.length?String(Math.max(1,+CX.sems[0].split('-')[0]-1)):'1');
  const m=modal('반 명단 붙여넣기',
    '<p class="small" style="margin-bottom:8px">나이스나 엑셀에서 <b>번호·이름</b>(또는 학번·이름, 반·번호·이름) 칸을 그대로 복사해 아래에 붙여넣으세요. 머리글 줄이나 성별 칸이 섞여 있어도 이름과 번호만 골라 읽습니다.</p>'
    +'<div class="row" style="gap:8px;margin-bottom:8px;flex-wrap:wrap"><label class="small">학년 <select id="rs-y">'+[1,2,3].map(v=>'<option'+(String(v)===String(yDef)?' selected':'')+'>'+v+'</option>').join('')+'</select></label>'
    +'<label class="small">반 <input id="rs-b" style="width:56px" value="'+esc(ST.fBan||DB.settings.ban||'')+'" placeholder="예: 3"></label><span class="small muted">학번(예: 10305)이 있으면 학년·반은 학번을 따릅니다.</span></div>'
    +'<textarea id="rs-txt" rows="8" style="width:100%;font-family:inherit" placeholder="1&#9;김하늘&#10;2&#9;이바다&#10;3&#9;박누리"></textarea>'
    +'<div id="rs-pv" class="small" style="margin-top:8px"></div>',
    [{label:'취소'},{label:'등록',cls:'pri',fn:()=>{
      const P=parseRoster($('#rs-txt').value,$('#rs-y').value,$('#rs-b').value.trim());
      if(!P.list.length){ toast('읽을 수 있는 이름이 없습니다'); return false; }
      const snap=snapDB(); let add=0, dup=0;
      P.list.forEach(x=>{ const id=stuId(x.y,x.b,x.no,x.name); if(DB.students.find(s=>s.id===id)){ dup++; return; } ensureStudent(x.y,x.b,x.no,x.name); add++; });
      DB.settings.y=$('#rs-y').value; const b=$('#rs-b').value.trim(); if(b&&!DB.settings.ban) DB.settings.ban=b;
      if(b) ST.fBan=b;
      save(); render(); undoToast('학생 '+add+'명을 등록했습니다'+(dup?' (이미 있는 '+dup+'명 건너뜀)':''),snap);
    }}],{wide:true});
  const pv=()=>{
    const P=parseRoster($('#rs-txt').value,$('#rs-y').value,$('#rs-b').value.trim());
    const ex=x=>DB.students.some(s=>s.id===stuId(x.y,x.b,x.no,x.name));
    $('#rs-pv').innerHTML=!P.list.length?'<span class="muted">붙여넣으면 여기에 미리 보여 드립니다.</span>'
      :'<b>'+P.list.length+'명</b> 읽음'+(P.skip.length?' · 이름이 없어 건너뛴 줄: '+P.skip.slice(0,8).join(', ')+(P.skip.length>8?' …':''):'')
       +'<div class="scroll-x" style="max-height:220px;overflow:auto;margin-top:6px"><table class="tbl"><thead><tr><th>학년</th><th>반</th><th>번호</th><th>이름</th><th></th></tr></thead><tbody>'
       +P.list.map(x=>'<tr><td>'+esc(x.y)+'</td><td>'+esc(x.b||'-')+'</td><td>'+esc(x.no||'-')+'</td><td><b>'+esc(x.name)+'</b></td><td class="small muted">'+(ex(x)?'이미 있음':'')+'</td></tr>').join('')+'</tbody></table></div>';
  };
  ['#rs-txt','#rs-y','#rs-b'].forEach(s=>{ const e=m.el.querySelector(s); e.oninput=e.onchange=pv; });
  pv(); setTimeout(()=>$('#rs-txt').focus(),30);
}

/* ---------- 일괄 인쇄: 학생마다 최근 기록 한 장씩 ---------- */
function printMany(recs,title){
  if(!recs.length){ toast('인쇄할 상담 기록이 없습니다'); return; }
  $('#print').innerHTML=recs.map((r,i)=>'<div class="pr-page'+(i===recs.length-1?' last':'')+'">'+recordPrintHtml(r)+'</div>').join('');
  toast((title||'')+' '+recs.length+'명 인쇄 창을 엽니다');
  setTimeout(()=>window.print(),80);
}
function latestOf(students){ return sortStudents(students).map(s=>latestRec(s.id)).filter(Boolean); }

/* ---------- 글자 크기 · 발표 모드 ---------- */
function applyZoom(){ document.documentElement.style.setProperty('--zoom',(UI.zoom/100)); $$('#zoom-seg [data-z]').forEach(x=>x.classList.toggle('on',+x.dataset.z===UI.zoom)); syncViewBtn(); }
/* 「보기」 단추에 지금 켜 둔 것을 짧게 표시 */
function syncViewBtn(){ const b=$('#b-view'); if(!b) return; const on=[]; if(UI.zoom!==100) on.push(UI.zoom+'%'); if(UI.mask) on.push('이름 가림'); if(document.documentElement.classList.contains('present')) on.push('발표 중'); b.textContent='보기'+(on.length?' · '+on.join(' · '):'')+' ▾'; b.classList.toggle('on',on.length>0); }
function setZoom(z){ UI.zoom=z; uiSave(); applyZoom(); }
function cycleZoom(){ UI.zoom=UI.zoom>=130?100:UI.zoom>=115?130:115; uiSave(); applyZoom(); toast('글자 크기 '+UI.zoom+'%'); }
function togglePresent(){
  const on=!document.documentElement.classList.contains('present');
  document.documentElement.classList.toggle('present',on);
  if(on&&document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(()=>{});
  if(!on&&document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  syncPresent();
}
function closeViewMenu(){ const vm=$('#view-menu'); if(vm&&!vm.classList.contains('hide')){ vm.classList.add('hide'); const vb=$('#b-view'); if(vb) vb.setAttribute('aria-expanded','false'); } }
function syncPresent(){ syncViewBtn(); const b=$('#b-present'); if(b){ const on=document.documentElement.classList.contains('present'); b.classList.toggle('on',on); b.textContent=on?'발표 모드 끝내기':'발표 모드 (크게 + 전체 화면)'; } }
document.addEventListener('fullscreenchange',()=>{ if(!document.fullscreenElement&&document.documentElement.classList.contains('present')){ document.documentElement.classList.remove('present'); syncPresent(); } });
function toggleMask(){ UI.mask=!UI.mask; uiSave(); syncMask(); render(); toast(UI.mask?'학생 이름을 가렸습니다 (화면·인쇄만, 엑셀·백업은 실명)':'학생 이름을 다시 보여 줍니다'); }
function syncMask(){ const c=$('#vm-mask'); if(c) c.checked=!!UI.mask; syncViewBtn(); }

/* ---------- 둘러보기 ---------- */
const TOUR=[
  {sel:'#app-school',t:'① 학교명',d:'먼저 학교명을 적어 두면 화면 맨 위·인쇄물·엑셀·배포용 파일에 들어갑니다.',tab:null},
  {sel:'.tab[data-tab="cur"]',t:'② 교육과정 설정',d:'나이스 「입학생 학교 교육과정 조회」 엑셀을 여기서 올리거나, 화면 아무 곳에나 끌어다 놓으면 됩니다.',tab:null},
  {sel:'.tab[data-tab="counsel"]',t:'③ 상담하기',d:'학생을 추가(반 명단 붙여넣기도 가능)하고 과목 칸을 눌러 고릅니다. 문제가 있으면 「확인할 내용」이 알려 줍니다.',tab:null},
  {sel:'#b-link',t:'④ 파일에 저장 연결',d:'크롬·엣지에서 이 단추로 지금 연 HTML 파일을 한 번 고르면, 이후 기록이 파일 안에 자동 저장됩니다.',tab:null},
  {sel:'#b-priv',t:'⑤ 백업·지우기',d:'공용 PC에서 쓴 뒤에는 백업 받고 이 PC의 기록을 지웁니다. 새 버전으로 옮길 때도 여기서 「짐 싸기·짐 풀기」를 합니다.',tab:null},
  {sel:'.tab[data-tab="help"]',t:'⑥ 간단 사용법',d:'역할별(교육과정 담당·담임·학년 취합) 순서가 한 쪽에 정리되어 있습니다. 둘러보기는 여기서 다시 볼 수 있습니다.',tab:null}
];
function startTour(){
  let i=0;
  let ring=$('#tour-ring'); if(!ring){ ring=document.createElement('div'); ring.id='tour-ring'; document.body.appendChild(ring); }
  let box=$('#tour-box'); if(!box){ box=document.createElement('div'); box.id='tour-box'; box.setAttribute('role','dialog'); document.body.appendChild(box); }
  const end=done=>{ ring.remove(); box.remove(); document.removeEventListener('keydown',key,true); window.removeEventListener('resize',place); if(done!==false){ UI.tourDone=true; uiSave(); } };
  const key=e=>{ if(e.key==='Escape'){ e.preventDefault(); end(); } else if(e.key==='ArrowRight'){ go(1); } else if(e.key==='ArrowLeft'){ go(-1); } };
  const place=()=>{
    const s=TOUR[i], el=document.querySelector(s.sel); if(!el){ go(1); return; }
    el.scrollIntoView({block:'nearest',inline:'nearest'});
    const r=el.getBoundingClientRect(), pad=6;
    Object.assign(ring.style,{left:(r.left-pad)+'px',top:(r.top-pad)+'px',width:(r.width+pad*2)+'px',height:(r.height+pad*2)+'px'});
    box.innerHTML='<div class="tt">'+esc(s.t)+'<span class="muted small">'+(i+1)+' / '+TOUR.length+'</span></div><div class="dd">'+esc(s.d)+'</div>'
      +'<div class="row" style="gap:6px;justify-content:flex-end;margin-top:10px"><button class="btn ghost" data-t="x">그만 보기</button>'+(i?'<button class="btn" data-t="-1">이전</button>':'')+'<button class="btn pri" data-t="1">'+(i===TOUR.length-1?'끝':'다음')+'</button></div>';
    const bw=Math.min(320,window.innerWidth-20); box.style.width=bw+'px';
    let x=r.left; x=Math.max(10,Math.min(x,window.innerWidth-bw-10));
    let y=r.bottom+14; if(y+box.offsetHeight>window.innerHeight-10) y=Math.max(10,r.top-box.offsetHeight-14);
    box.style.left=x+'px'; box.style.top=y+'px';
    box.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ const t=b.dataset.t; if(t==='x') end(); else go(+t); });
    box.querySelector('[data-t="1"]').focus();
  };
  const go=d=>{ i+=d; if(i<0) i=0; if(i>=TOUR.length){ end(); return; } place(); };
  document.addEventListener('keydown',key,true); window.addEventListener('resize',place);
  place();
}
function initPlus(){
  applyZoom(); syncPresent(); syncMask();
  $$('#zoom-seg [data-z]').forEach(x=>x.onclick=()=>setZoom(+x.dataset.z));
  const p=$('#b-present'); if(p) p.onclick=()=>{ closeViewMenu(); togglePresent(); };
  const k=$('#vm-mask'); if(k) k.onchange=()=>{ if(!!UI.mask!==k.checked) toggleMask(); };
  const vb=$('#b-view'), vm=$('#view-menu');
  if(vb&&vm){
    vb.onclick=e=>{ e.stopPropagation(); const open=vm.classList.contains('hide'); vm.classList.toggle('hide',!open); vb.setAttribute('aria-expanded',open); };
    vm.onclick=e=>e.stopPropagation();
    document.addEventListener('click',closeViewMenu);
    document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeViewMenu(); });
  }
  /* 처음 연 사람(기록 없음)에게만 자동으로, 자동 시험 브라우저에서는 띄우지 않음 */
  if(!UI.tourDone&&!DB.records.length&&!navigator.webdriver) setTimeout(startTour,700);
}
