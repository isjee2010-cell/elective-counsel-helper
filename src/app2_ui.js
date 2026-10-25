/* =====================================================================
   화면 공통
   ===================================================================== */
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.remove('hide'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.add('hide'),2600); }
function modal(title,body,buttons,opt){
  const d=$('#dim');
  d.innerHTML='<div class="modal'+(opt&&opt.wide?' wide':'')+'" role="dialog" aria-modal="true"><div class="mh">'+esc(title)+'</div><div class="mb">'+body+'</div><div class="mf"></div></div>';
  const mf=d.querySelector('.mf');
  const close=()=>{ d.classList.add('hide'); d.innerHTML=''; };
  (buttons||[{label:'닫기'}]).forEach(b=>{
    const el=document.createElement('button'); el.className='btn '+(b.cls||''); el.textContent=b.label;
    el.onclick=async()=>{ if(b.fn){ const r=await b.fn(d); if(r===false) return; } close(); };
    mf.appendChild(el);
  });
  d.classList.remove('hide');
  d.onclick=e=>{ if(e.target===d) close(); };
  return {el:d,close};
}
function hueRGB(i){
  /* 계열 색: 상태색(빨강·노랑·주황·초록)과 겹치지 않게 파랑·보라·청록·회청 계열만 */
  const P=[[46,96,178],[130,66,172],[32,142,156],[74,92,190],[96,110,135],[40,125,195],[112,82,190],[22,112,124],[118,118,152],[64,146,206]];
  return P[((i%P.length)+P.length)%P.length];
}
function tint(rgb,t){ return 'rgb('+rgb.map(v=>Math.round(v+(255-v)*t)).join(',')+')'; }
function bansOf(list){ return [...new Set(list.map(s=>s.b).filter(Boolean))].sort((a,b)=>(+a||0)-(+b||0)||String(a).localeCompare(String(b))); }
function fmtDate(d){ return d||'-'; }
function statusPill(st){
  return ({ok:'<span class="pill p-ok">✓ 선택 완료</span>',warn:'<span class="pill p-warn">… 미완료</span>',bad:'<span class="pill p-bad">! 확인 필요</span>',none:'<span class="pill p-mute">– 선택 없음</span>'})[st]||'';
}

const ST={tab:'counsel',sid:null,fBan:null,fQ:'',list:{ban:'',q:'',from:'',to:'',latest:false},grade:{ban:'',min:''},stuQ:''};
let DRAFT=null;
function isDraftDirty(){ return !!(DRAFT&&DRAFT.dirty); }

function setTab(t){ ST.tab=t; $$('.tab').forEach(b=>b.classList.toggle('on',b.dataset.tab===t)); render(); $('#main').scrollTop=0;
  const pg=$('#page'); pg.classList.remove('fx'); void pg.offsetWidth; pg.classList.add('fx'); }
$$('.tab').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$('#app-school').onclick=()=>{ setTab('cur'); setTimeout(()=>{ const i=$('#st-school'); if(i){ flashTo([i]); i.focus({preventScroll:true}); } },30); };
$('#b-link').onclick=()=>{ if(selfHandle){ toast('이미 파일과 연결되어 자동 저장 중입니다'); return; } connectSelf(); };

function renderChrome(){
  const sc=schoolName();
  $('#app-title').textContent=APP_NAME;
  const sb=$('#app-school'); sb.textContent=sc?sc:'학교명 입력'; sb.classList.toggle('empty',!sc); sb.title=sc?'학교명 바꾸기 (교육과정 설정)':'교육과정 설정에서 학교명을 입력하세요';
  document.title=sc?sc+' · '+APP_NAME:APP_NAME;
  const nS=DB.students.length, nR=DB.records.length;
  $('#app-sub').textContent=CUR?((CUR.title?CUR.title+' · ':'')+'과목 '+CX.rows.length+'개 · 학생 '+nS+'명 · 상담 기록 '+nR+'건'):'교육과정을 불러오면 상담을 시작할 수 있습니다';
  /* 알림: warn(주의 — 기록이 사라질 수 있거나 꼭 할 일) / info(안내) 를 색으로 나누고 주의를 위에 */
  const msgs=[]; const W=h=>msgs.push({lv:'warn',h}), I=h=>msgs.push({lv:'info',h});
  if(bootMsg) I('ℹ️ '+esc(bootMsg));
  if(!CUR) W('📋 <b>교육과정이 아직 없습니다.</b> 「교육과정 설정」에서 나이스 교육과정 엑셀(또는 채운 양식)을 올려 주세요.');
  else if(CUR.sample) I('📋 지금은 <b>가상의 예시 교육과정</b>입니다. 「교육과정 설정」에서 우리 학교 나이스 엑셀을 올리면 바뀝니다.');
  if(!FSA) W('⚠️ 이 브라우저는 파일 자체 저장을 지원하지 않아 <b>이 PC의 브라우저에만 임시 저장</b>됩니다. 크롬·엣지 사용을 권장합니다.');
  else if(!selfHandle&&DB.records.length) W('💾 <b>아직 파일과 연결되지 않았습니다.</b> 지금 기록은 이 브라우저에만 임시로 있습니다. <button class="btn bn-btn" id="bn-link">지금 파일에 저장 연결</button>');
  const dc=demoCount(); if(dc.s) I('🧪 <b>연수용 예시 학생 '+dc.s+'명</b>이 들어 있습니다. 실제로 쓰기 전에 지워 주세요. <button class="btn bn-btn" id="bn-demo">예시 데이터 빼기</button>');
  msgs.sort((a,b)=>(a.lv==='warn'?0:1)-(b.lv==='warn'?0:1));
  const bn=$('#banner');
  if(ST.bnFold==null) ST.bnFold=window.innerWidth<=520;
  const nW=msgs.filter(m=>m.lv==='warn').length;
  const icons=msgs.map(m=>{ const t=m.h.replace(/<[^>]+>/g,''); return [...t][0]||'•'; }).join(' ');
  bn.classList.toggle('fold',!!ST.bnFold&&msgs.length>0);
  bn.innerHTML=ST.bnFold&&msgs.length?'<button type="button" class="bn-tg bn-fold'+(nW?' has-warn':'')+'" id="bn-tg">알림 '+msgs.length+'개'+(nW?' · <b>주의 '+nW+'</b>':'')+' '+icons+' <span class="muted">펼치기 ▾</span></button>'
    :(()=>{ /* 주의는 한 줄씩, 안내는 한 줄에 모아서 */
        const rows=msgs.filter(m=>m.lv==='warn').map(m=>({lv:'warn',h:m.h})); const inf=msgs.filter(m=>m.lv==='info');
        if(inf.length) rows.push({lv:'info',h:inf.map(m=>'<span class="bn-it">'+m.h+'</span>').join('<span class="bn-sep"></span>')});
        return '<div class="bn-list">'+rows.map((r,k)=>'<div class="bn-row '+r.lv+'">'+r.h+(k===0?'<button type="button" class="bn-tg bn-x" id="bn-tg" title="알림 접기">접기 ▴</button>':'')+'</div>').join('')+'</div>'; })();
  $('#bn-tg')&&($('#bn-tg').onclick=()=>{ ST.bnFold=!ST.bnFold; renderChrome(); });
  const bd=$('#bn-demo'); if(bd) bd.onclick=async()=>{ if(await ask({title:'예시 데이터 빼기',msg:'<p>연수용 예시 학생과 기록만 지웁니다. 실제 기록은 그대로입니다.</p>',ok:'예시 빼기',danger:true})) removeDemoData(); };
  const bl=$('#bn-link'); if(bl) bl.onclick=()=>$('#b-link').click();
  bn.classList.toggle('hide',!msgs.length);
  syncLinkUi();
}
function render(){
  progTok++; $('#page').onclick=null;
  renderChrome();
  document.body.classList.remove('has-dock');
  const P=$('#page');
  ({counsel:renderCounsel,student:renderStudent,list:renderList,sheet:renderSheet,check:renderCheck,grade:renderGrade,cur:renderCurPage,help:renderHelp})[ST.tab](P);
}

/* =====================================================================
   상담하기
   ===================================================================== */
function newDraft(sid,opt){
  opt=opt||{};
  const last=latestRec(sid);
  const base=(opt.blank||!last)?null:last;
  const {ids,extra}=base?picksToSel(base.picks):{ids:[],extra:[]};
  DRAFT={sid,recId:null,date:today(),counselor:DB.settings.counselor||'',method:'면대면',
    career:base?base.career||'':'',major:base?base.major||'':'',content:'',plan:'',
    sel:new Set(ids),extra:extra,dirty:false,fromRec:base?base.date:null};
}
function editDraft(rec){
  const {ids,extra}=picksToSel(rec.picks);
  DRAFT={sid:rec.sid,recId:rec.id,date:rec.date||today(),counselor:rec.counselor||'',method:rec.method||'면대면',career:rec.career||'',major:rec.major||'',
    content:rec.content||'',plan:rec.plan||'',sel:new Set(ids),extra:extra.slice(),dirty:false};
}
async function confirmLeaveDraft(){ return !isDraftDirty()||!!(await ask({title:'저장하지 않은 상담 내용',msg:'<p>지금 쓰던 상담 내용이 아직 저장되지 않았습니다. 버리고 이동할까요?</p>',ok:'버리고 이동',cancel:'계속 작성',danger:true})); }
async function selectStudent(sid,opt){
  if(DRAFT&&DRAFT.sid===sid&&!(opt&&opt.force)) return;
  if(!(await confirmLeaveDraft())) return;
  ST.sid=sid; newDraft(sid,opt); render();
}

function renderCounsel(P){
  if(ST.fBan==null) ST.fBan=DB.settings.ban||'';
  const bans=bansOf(DB.students);
  const q=ST.fQ.trim();
  const list=sortStudents(DB.students).filter(s=>(!ST.fBan||s.b===ST.fBan)&&(!q||s.name.includes(q)||stuNo(s).includes(q)));
  const yDef=DB.settings.y||(CUR&&CX.sems.length?String(Math.max(1,+CX.sems[0].split('-')[0]-1)):'1');
  const side='<aside class="card side">'
    +'<div class="filters"><select id="cs-ban"><option value="">전체 반</option>'+bans.map(b=>'<option'+(b===ST.fBan?' selected':'')+' value="'+esc(b)+'">'+esc(b)+'반</option>').join('')+'</select>'
    +'<input id="cs-q" placeholder="이름·번호 검색" value="'+esc(ST.fQ)+'"></div>'
    +'<div class="stu-list">'+(list.length?list.map(s=>{
        const lr=latestRec(s.id); const st=lr?evalStatus(recEval(lr)):'none';
        return '<div class="stu-item'+(s.id===ST.sid?' on':'')+'" data-sid="'+esc(s.id)+'" title="'+esc(stuLabel(s))+(lr?' · 최근 상담 '+esc(lr.date):'')+'"><span class="no">'+esc(stuNo(s))+'</span><span class="nm">'+esc(dn(s.name))+'</span><span class="dot dot-'+st+'" aria-label="'+ST_INFO[st].t+'">'+ST_INFO[st].i+'</span></div>';
      }).join(''):'<div class="empty-msg small">'+(DB.students.length?'조건에 맞는 학생이 없습니다':'아래에서 학생을 추가하세요')+'</div>')+'</div>'
    +'<div class="add"><div class="small muted" style="margin-bottom:5px;font-weight:700">학생 추가</div>'
    +'<div class="row" style="gap:5px"><select id="na-y" style="width:62px">'+[1,2,3].map(v=>'<option'+(String(v)===String(yDef)?' selected':'')+'>'+v+'</option>').join('')+'</select>'
    +'<input id="na-b" placeholder="반" style="width:46px" value="'+esc(ST.fBan||DB.settings.ban||'')+'"><input id="na-no" placeholder="번호" style="width:52px"></div>'
    +'<div class="row" style="gap:5px;margin-top:5px"><input id="na-name" placeholder="이름" style="flex:1"><button class="btn" id="na-go">추가</button></div>'
    +'<button class="btn ghost" id="na-roster" style="margin-top:6px;width:100%">반 명단 붙여넣기</button>'
    +'<div class="small muted lg-st" style="margin-top:6px"><span class="dot dot-ok">✓</span>완료 <span class="dot dot-warn">…</span>미완료 <span class="dot dot-bad">!</span>확인 필요 <span class="dot dot-none">–</span>상담 전</div></div>'
    +'</aside>';
  let body='';
  if(!CUR){ body='<div class="card empty-msg">교육과정이 없어 상담 화면을 만들 수 없습니다.<br><br><button class="btn pri" data-goto="cur">교육과정 설정으로 가기</button></div>'; }
  else if(!DRAFT||!DB.students.find(s=>s.id===DRAFT.sid)){ DRAFT=null; body='<div class="card empty-msg">왼쪽 목록에서 학생을 고르거나 새 학생을 추가하세요.<br><span class="small">학생을 고르면 가장 최근 상담의 선택 과목을 불러와 이어서 상담합니다.</span></div>'; }
  else body=counselBody();
  P.innerHTML='<div class="cs">'+side+'<section id="cs-main">'+body+'</section></div>';
  P.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>setTab(b.dataset.goto));

  $('#cs-ban').onchange=e=>{ ST.fBan=e.target.value; renderCounsel(P); };
  $('#cs-q').oninput=e=>{ ST.fQ=e.target.value; const pos=e.target.selectionStart; renderCounsel(P); const i=$('#cs-q'); i.focus(); i.setSelectionRange(pos,pos); };
  $$('.stu-item').forEach(el=>el.onclick=()=>selectStudent(el.dataset.sid));
  const addFn=async()=>{
    const y=$('#na-y').value, b=$('#na-b').value.trim(), no=$('#na-no').value.trim(), nm=$('#na-name').value.trim();
    if(!nm){ toast('이름을 입력하세요'); $('#na-name').focus(); return; }
    const exists=DB.students.find(s=>s.id===stuId(y,b,no,nm));
    if(!(await confirmLeaveDraft())) return;
    const s=ensureStudent(y,b,no,nm); DB.settings.y=y; if(b) DB.settings.ban=DB.settings.ban||b;
    save(); ST.sid=s.id; newDraft(s.id); if(ST.fBan&&ST.fBan!==s.b) ST.fBan=s.b;
    toast(exists?'이미 있는 학생입니다 — 선택했습니다':stuLabel(s)+' 추가');
    render(); const n=$('#na-no'); if(n){ n.value=no?String((+no||0)+1):''; }
  };
  $('#na-go').onclick=addFn;
  $('#na-roster').onclick=()=>{ if(!CUR){ toast('먼저 교육과정을 불러와 주세요'); return; } rosterModal(); };
  $('#na-name').onkeydown=e=>{ if(e.key==='Enter') addFn(); };
  if(DRAFT&&CUR) bindCounsel();
}

function counselBody(){
  const s=DB.students.find(x=>x.id===DRAFT.sid);
  const recs=recsOf(s.id);
  const mode=DRAFT.recId?'<span class="pill p-acc mode-tag">'+esc(DRAFT.date)+' 기록 수정 중</span>':'<span class="pill p-mute mode-tag">새 상담 작성'+(DRAFT.fromRec?' · '+esc(DRAFT.fromRec)+' 선택 불러옴':'')+'</span>';
  const F=(k,label,cls,inp)=>'<div class="fld '+cls+'"><label for="d-'+k+'">'+label+'</label>'+inp+'</div>';
  const I=(k,ph)=>'<input id="d-'+k+'" data-k="'+k+'" value="'+esc(DRAFT[k])+'"'+(ph?' placeholder="'+esc(ph)+'"':'')+'>';
  return '<div class="card"><h2><span class="stu-title">'+esc(stuLabel(s))+'</span>'+mode
    +'<span class="tail"><span class="small muted" style="align-self:center">상담 '+recs.length+'회</span><button class="btn ghost" id="d-editstu">학생 정보 수정</button>'
    +(recs.length?'<button class="btn ghost" id="d-hist">기록 보기</button>':'')+'</span></h2>'
    +'<div class="form-grid">'
    +F('date','상담일','c2','<input type="date" id="d-date" data-k="date" value="'+esc(DRAFT.date)+'">')
    +F('counselor','상담자','c2',I('counselor','담임 이름'))
    +F('method','상담 방법','c2','<select id="d-method" data-k="method">'+METHODS.map(m=>'<option'+(m===DRAFT.method?' selected':'')+'>'+m+'</option>').join('')+'</select>')
    +F('career','희망 진로','c3',I('career','예: 간호사'))
    +F('major','희망 학과','c3',I('major','예: 간호학과'))
    +F('content','주요 상담 내용','c6','<textarea id="d-content" data-k="content" rows="3">'+esc(DRAFT.content)+'</textarea>')
    +F('plan','추후 상담 계획','c6','<textarea id="d-plan" data-k="plan" rows="3">'+esc(DRAFT.plan)+'</textarea>')
    +'</div></div>'
    +'<div class="sumbar" id="sumbar"></div><div id="iss-box"></div>'
    +'<div class="board-wrap" id="board"></div>'
    +'<div id="extra"></div>';
}
function bindCounsel(){
  $$('#cs-main [data-k]').forEach(el=>{
    el.oninput=()=>{ DRAFT[el.dataset.k]=el.value; if(!DRAFT.dirty){ DRAFT.dirty=true; updateSaveBtn(); } };
    el.onchange=()=>{ DRAFT[el.dataset.k]=el.value; if(el.dataset.k==='career'||el.dataset.k==='major') paintSumbar(); };
  });
  $('#d-editstu').onclick=()=>editStudentModal(DRAFT.sid);
  const h=$('#d-hist'); if(h) h.onclick=()=>{ ST.stuSel=DRAFT.sid; setTab('student'); };
  paintBoard();
}
function draftCtx(){ return {career:DRAFT.career,major:DRAFT.major}; }
function paintBoard(){
  const ev=evalSel(DRAFT.sel,draftCtx());
  paintSumbar(ev);
  const sems=CX.sems;
  let h='<table class="board"><thead><tr><th style="width:130px">선택그룹 · 계열</th>'
    +sems.map(k=>'<th class="sem-h">'+semLabel(k)+'<span class="sc">'+(ev.semCr[k]||0)+'학점 선택</span></th>').join('')+'</tr></thead><tbody>';
  const upHue={}; let hueN=0;
  CX.pools.forEach(pool=>{
    const prow=CX.rows.filter(r=>r.g===pool);
    h+='<tr class="pool-h"><td class="pool-name">'+esc(pool)+'</td>'+sems.map(k=>{
      const gs=Object.values(CX.groups).filter(g=>g.g===pool&&semKey(g.y,g.s)===k);
      if(!gs.length) return '<td></td>';
      return '<td><div class="gstat">'+gs.map(g=>{
        const x=ev.groups[g.key]; const multi=gs.length>1;
        const cls={ok:'p-ok',over:'p-bad',under:'p-warn',none:'p-mute'}[x.state];
        const tail={ok:' 완료',over:' 초과!',under:'',none:''}[x.state];
        return '<span class="pill '+cls+'" data-gk="'+esc(g.key)+'" title="'+esc(grpLabel(g))+'">택'+g.need+(multi?'('+g.c+'학점)':'')+' · '+x.cnt+'/'+g.need+tail+'</span>';
      }).join('')+'</div></td>';
    }).join('')+'</tr>';
    const blocks=[]; prow.forEach(r=>{ const bk=r.up+'|'+r.lo; if(!blocks.includes(bk)) blocks.push(bk); });
    const loIdx={};
    blocks.forEach(bk=>{
      const [up,lo]=bk.split('|');
      if(upHue[up]==null) upHue[up]=hueN++;
      loIdx[up]=(loIdx[up]==null?0:loIdx[up]+1);
      const bg=tint(hueRGB(upHue[up]),0.80+Math.min(loIdx[up],4)*0.035);
      h+='<tr><td class="blk-label" style="background:'+bg+'">'+esc(up)+(lo&&lo!==up?'<span class="lo">'+esc(lo)+'</span>':'')+'</td>';
      sems.forEach(k=>{
        const items=prow.filter(r=>r.up+'|'+r.lo===bk&&semKey(r.y,r.s)===k);
        if(!items.length){ h+='<td class="cell none"></td>'; return; }
        h+='<td class="cell">'+items.map(r=>chipHtml(r,ev)).join('')+'</td>';
      });
      h+='</tr>';
    });
  });
  h+='</tbody></table>';
  $('#board').innerHTML=h;
  $$('#board .chip').forEach(el=>el.onclick=()=>{
    const id=el.dataset.id;
    if(DRAFT.sel.has(id)) DRAFT.sel.delete(id); else DRAFT.sel.add(id);
    DRAFT.dirty=true; paintBoard();
  });
  const ex=$('#extra');
  ex.innerHTML=DRAFT.extra.length?'<div class="extra-box"><b>현재 교육과정에 없는 과목</b> — 이전 기록이나 가져온 자료에 있던 과목입니다. 필요 없으면 빼 주세요.<div class="row" style="margin-top:6px">'
    +DRAFT.extra.map((p,i)=>'<span class="pill p-warn">'+esc((p.y?p.y+'-'+p.s+' ':'')+p.n)+' <button class="btn ghost" style="padding:0 4px" data-xi="'+i+'" title="빼기">✕</button></span>').join('')+'</div></div>':'';
  $$('#extra [data-xi]').forEach(b=>b.onclick=()=>{ DRAFT.extra.splice(+b.dataset.xi,1); DRAFT.dirty=true; paintBoard(); });
}
function chipHtml(r,ev){
  const on=ev.sel.has(r.id);
  const mp=ev.pre[r.id], ml=ev.link[r.id];
  let notes='';
  if(on){
    if(mp) notes+='<span class="note bad">⚠ 선이수 미선택: '+esc(mp.join(', '))+'</span>';
    if(ml) notes+='<span class="note warn">연계 권장: '+esc(ml.join(', '))+'</span>';
    if(r.preExt&&r.preExt.length) notes+='<span class="note ref">선이수(확인 필요): '+esc(r.preExt.join(', '))+'</span>';
  }else{
    const pre=(r.pre||[]).concat(r.preExt||[]);
    if(pre.length) notes+='<span class="note ref">선이수: '+esc(pre.join(', '))+'</span>';
  }
  const cls='chip'+(on?' on':'')+(on&&mp?' has-bad':'')+(on&&!mp&&ml?' has-warn':'');
  const tip=[r.n,r.t,r.c+'학점',r.link&&r.link.length?'연계: '+r.link.join(', '):'',r.note?'비고: '+r.note:''].filter(Boolean).join(' · ');
  return '<button class="'+cls+'" data-id="'+r.id+'" title="'+esc(tip)+'" aria-pressed="'+on+'"><span class="top"><span class="ck">'+(on?'✓':'')+'</span><span class="nm">'+esc(r.n)+'</span><span class="tt '+typeCls(r.t)+'">'+esc(typeShort(r.t))+'</span></span>'+notes+'</button>';
}
function rulePill(r){
  const c=r.rule, cls=r.ok?'p-ok':(r.level==='warn'?'p-warn':'p-bad');
  if(c.type==='sum'||!c.type) return '<span class="pill '+cls+'" title="'+esc(checkDesc(c))+'">'+esc(c.name)+' '+r.val+(ruleCond(c)?' / '+esc(ruleCond(c)):'')+'</span>';
  return '<span class="pill '+cls+'" title="'+esc(r.why||checkDesc(c))+'">⚠ '+esc(c.name)+'</span>';
}
function paintSumbar(ev){
  ev=ev||evalSel(DRAFT.sel,draftCtx());
  const box=$('#sumbar');
  if(!box.querySelector('.acts')){
    box.innerHTML='<div id="sum-stats" style="display:contents"></div><div class="acts"><button class="btn sub" id="d-clear">선택 비우기</button>'
      +(DRAFT.recId?'<button class="btn" id="d-new">새 상담 시작</button>':'')
      +'<button class="btn" id="d-print">인쇄</button>'
      +'<button class="btn pri" id="d-save"></button></div>';
    $('#d-clear').onclick=()=>{ if(!DRAFT.sel.size) return; const keep=new Set(DRAFT.sel), d0=DRAFT; DRAFT.sel.clear(); DRAFT.dirty=true; paintBoard();
      const t=$('#toast'); clearTimeout(t._h); t.innerHTML='<span>선택한 과목 '+keep.size+'개를 비웠습니다</span><button type="button" class="undo">되돌리기</button>'; t.classList.remove('hide');
      t.querySelector('.undo').onclick=()=>{ if(DRAFT!==d0) return; DRAFT.sel=keep; paintBoard(); toast('되돌렸습니다'); }; t._h=setTimeout(()=>t.classList.add('hide'),10000); };
    const nb=$('#d-new'); if(nb) nb.onclick=async()=>{ if(!(await confirmLeaveDraft())) return; newDraft(DRAFT.sid); renderCounsel($('#page')); };
    $('#d-print').onclick=()=>printRecord(draftToRec(),true);
    $('#d-save').onclick=saveDraft;
  }
  updateSaveBtn();
  const st=evalStatus(ev);
  const warnN=ev.nOver+ev.nPre+ev.nRule;
  const semTxt=CX.sems.map(k=>k+': '+(ev.semCr[k]||0)).join(' · ');
  const shown=ev.rules.filter(r=>r.rule.type==='sum'||!r.rule.type||(!r.ok&&!r.na));
  $('#sum-stats').innerHTML=
     '<div class="sum-stat" title="'+esc(semTxt)+'"><span class="k">총 선택 학점</span><span class="v">'+ev.total+'<small>'+ev.sel.size+'과목</small></span></div>'
    +'<div class="sum-stat"><span class="k">선택 묶음 완료</span><span class="v">'+ev.nOk+'<small>/ '+ev.nGroups+'</small></span></div>'
    +'<div class="sum-stat"><span class="k">확인 필요</span><span class="v" style="color:'+(warnN?'var(--bad)':'inherit')+'">'+warnN+'<small>초과 '+ev.nOver+' · 선이수 '+ev.nPre+(ev.rules.length?' · 검증 규칙 '+ev.nRule:'')+(ev.nRuleWarn?' · 권장 '+ev.nRuleWarn:'')+(ev.nLink?' · 연계 '+ev.nLink:'')+'</small></span></div>'
    +(shown.length?'<div class="sum-stat"><span class="k">검증 규칙</span><span class="v rules">'+shown.map(rulePill).join('')+'</span></div>':'')
    +'<div>'+statusPill(st)+'</div>';
  paintDock(ev,warnN);
  /* 과목판 학기 머리글을 요약줄 바로 아래에 고정 (요약줄 높이가 바뀌면 따라감) */
  const sb=$('#sumbar');
  if(sb){ const setH=()=>document.documentElement.style.setProperty('--sumH',Math.max(0,sb.offsetHeight-14)+'px'); setH();
    if(window.ResizeObserver&&!sb._ro){ sb._ro=new ResizeObserver(setH); sb._ro.observe(sb); } }
  /* 확인할 내용: 누르면 그 묶음·과목으로 부드럽게 이동하고 반짝 */
  const L=issueList(ev), ib=$('#iss-box');
  if(ib){
    ib.innerHTML=L.length?'<div class="iss-go"><span class="k">확인할 내용 <small>누르면 그 자리로 이동</small></span>'+L.map((x,i)=>'<button type="button" class="'+x.lv+'" data-ii="'+i+'">'+esc(x.t)+'</button>').join('')+'</div>':'';
    ib.querySelectorAll('[data-ii]').forEach(b=>b.onclick=()=>goIssue(L[+b.dataset.ii]));
  }
  const ks=[...$('#sum-stats').querySelectorAll('.sum-stat')][2];
  if(ks&&L.length){ ks.classList.add('clickable'); ks.title='누를 때마다 다음 확인할 곳으로 이동합니다'; ks.onclick=()=>{ ST.issI=((ST.issI||0)+1)%L.length; goIssue(L[ST.issI]); }; }
}
function goIssue(x){
  if(!x) return;
  const els=[]; if(x.gk){ const p=document.querySelector('[data-gk="'+CSS.escape(x.gk)+'"]'); if(p) els.push(p); }
  (x.ids||[]).forEach(id=>{ const c=document.querySelector('.chip[data-id="'+CSS.escape(id)+'"]'); if(c) els.push(c); });
  if(!els.length) return;
  flashTo(els);
}
/* 휴대폰·태블릿: 화면 아래에 떠 있는 저장 도크 */
function paintDock(ev,warnN){
  let d=$('#dock'); if(!d){ d=document.createElement('div'); d.id='dock'; document.body.appendChild(d); }
  const s=DB.students.find(x=>x.id===DRAFT.sid);
  d.innerHTML='<div class="dk-st"><b>'+esc(s?dn(s.name):'')+'</b><span>'+ev.total+'학점 · 묶음 '+ev.nOk+'/'+ev.nGroups+'</span>'+(warnN?'<span class="bad">확인 '+warnN+'</span>':ev.nUnder?'<span class="warn">미완료</span>':'<span class="ok">완료</span>')+'</div>'
    +'<button class="btn pri" id="dk-save"></button>';
  d.querySelector('#dk-save').onclick=saveDraft;
  updateSaveBtn(); document.body.classList.add('has-dock');
}
function updateSaveBtn(){ const t=DRAFT.recId?(DRAFT.dirty?'수정 저장':'저장됨 ✓'):'상담 기록 저장'; const b=$('#d-save'); if(b) b.textContent=t; const k=$('#dk-save'); if(k) k.textContent=t; }
function draftToRec(){
  const picks=selToPicks([...DRAFT.sel],DRAFT.extra);
  return {id:DRAFT.recId||uid('r'),sid:DRAFT.sid,date:DRAFT.date||today(),counselor:DRAFT.counselor.trim(),method:DRAFT.method,career:DRAFT.career.trim(),major:DRAFT.major.trim(),
    content:DRAFT.content,plan:DRAFT.plan,picks,credits:picksCredits(picks)};
}
async function saveDraft(){
  if(DRAFT.recId&&!DRAFT.dirty){ toast('변경 사항이 없습니다'); return; }
  const ev=evalSel(DRAFT.sel);
  if(!ev.sel.size&&!DRAFT.extra.length&&!(await ask({title:'선택한 과목이 없습니다',msg:'<p>과목을 하나도 고르지 않았습니다. 상담 내용만 저장할까요?</p>',ok:'그래도 저장'}))) return;
  const r=draftToRec(); const now=Date.now();
  if(DRAFT.recId){
    const i=DB.records.findIndex(x=>x.id===DRAFT.recId);
    if(i>=0){ DB.records[i]=Object.assign({},DB.records[i],r,{updatedAt:now}); }
    else DB.records.push(Object.assign(r,{createdAt:now,updatedAt:now,src:''}));
  }else{
    DB.records.push(Object.assign(r,{createdAt:now,updatedAt:now,src:''}));
  }
  if(r.counselor) DB.settings.counselor=r.counselor;
  DRAFT.recId=r.id; DRAFT.dirty=false;
  save();
  const s=DB.students.find(x=>x.id===r.sid);
  toast((s?s.name+' — ':'')+'상담 기록을 저장했습니다 ('+r.picks.length+'과목 · '+r.credits+'학점)');
  render();
}
function editStudentModal(sid){
  const s=DB.students.find(x=>x.id===sid); if(!s) return;
  const n=recsOf(sid).length;
  modal('학생 정보 수정',
    '<div class="form-grid"><div class="fld c3"><label>학년</label><input id="es-y" value="'+esc(s.y)+'"></div><div class="fld c3"><label>반</label><input id="es-b" value="'+esc(s.b)+'"></div><div class="fld c3"><label>번호</label><input id="es-no" value="'+esc(s.no)+'"></div><div class="fld c3"><label>이름</label><input id="es-nm" value="'+esc(dn(s.name))+'"></div></div>'
    +'<p class="small muted" style="margin-top:10px">이 학생의 상담 기록 '+n+'건도 함께 옮겨집니다.</p>',
    [{label:'학생 삭제',cls:'danger',fn:async()=>{ if(!(await ask({title:'학생 삭제',msg:'<p><b>'+esc(dn(s.name))+'</b> 학생과 상담 기록 '+n+'건을 삭제합니다.</p><p class="small muted" style="margin-top:6px">삭제 후 10초 안에는 「되돌리기」로 살릴 수 있습니다.</p>',ok:'삭제',danger:true}))) return false;
        const snap=snapDB(); const now=Date.now(); DB.records.filter(r=>r.sid===sid).forEach(r=>DB.tomb[r.id]=now);
        DB.records=DB.records.filter(r=>r.sid!==sid); DB.students=DB.students.filter(x=>x.id!==sid);
        if(DRAFT&&DRAFT.sid===sid) DRAFT=null; if(ST.sid===sid) ST.sid=null; save(); render(); undoToast(s.name+' 학생을 삭제했습니다',snap); }},
     {label:'취소'},
     {label:'저장',cls:'pri',fn:()=>{
        const y=$('#es-y').value.trim(), b=$('#es-b').value.trim(), no=$('#es-no').value.trim(), nm=$('#es-nm').value.trim();
        if(!nm){ toast('이름을 입력하세요'); return false; }
        const nid=stuId(y,b,no,nm);
        if(nid!==sid&&DB.students.find(x=>x.id===nid)){ toast('같은 학년·반·번호·이름의 학생이 이미 있습니다'); return false; }
        Object.assign(s,{id:nid,y,b,no,name:nm}); DB.records.forEach(r=>{ if(r.sid===sid){ r.sid=nid; r.updatedAt=Date.now(); } });
        if(DRAFT&&DRAFT.sid===sid) DRAFT.sid=nid; if(ST.sid===sid) ST.sid=nid; if(ST.stuSel===sid) ST.stuSel=nid;
        save(); render(); toast('학생 정보를 고쳤습니다'); }}]);
}

/* =====================================================================
   학생별 기록 (타임라인)
   ===================================================================== */
function pickKey(p){ return (p.y||0)+'-'+(p.s||0)+'|'+normName(p.n); }
function renderStudent(P){
  const all=sortStudents(DB.students);
  if(!all.length){ P.innerHTML='<div class="card empty-msg">아직 학생이 없습니다. 「상담하기」에서 학생을 추가하거나, 「교육과정 설정」에서 기존 엑셀 기록을 가져오세요.</div>'; return; }
  if(!ST.stuSel||!all.find(s=>s.id===ST.stuSel)) ST.stuSel=(ST.sid&&all.find(s=>s.id===ST.sid))?ST.sid:all[0].id;
  const s=all.find(x=>x.id===ST.stuSel);
  const recs=recsOf(s.id);
  let h='<div class="card"><h2><select id="ss-sel" style="font-size:15px;font-weight:700;max-width:100%">'
    +bansOf(all).concat(all.some(x=>!x.b)?['']:[]).map(b=>'<optgroup label="'+(b?esc(b)+'반':'반 미지정')+'">'+all.filter(x=>x.b===b).map(x=>'<option value="'+esc(x.id)+'"'+(x.id===s.id?' selected':'')+'>'+esc(stuNo(x)+' '+dn(x.name))+'</option>').join('')+'</optgroup>').join('')
    +'</select><span class="small muted">'+esc(stuLabel(s))+' · 상담 '+recs.length+'회</span>'
    +'<span class="tail"><button class="btn" id="ss-edit">학생 정보 수정</button><button class="btn pri" id="ss-new">이 학생 상담하기</button></span></h2>';
  if(!recs.length){ h+='<div class="empty-msg">아직 상담 기록이 없습니다.</div></div>'; P.innerHTML=h; bindStu(s); return; }
  h+='<p class="small muted" style="margin-bottom:8px">왼쪽부터 오래된 순서입니다. <b style="color:var(--ok)">+초록</b>은 직전 상담보다 새로 고른 과목, <s style="color:var(--bad)">빨강 취소선</s>은 직전 상담에서 뺀 과목입니다.</p><div class="tl">';
  recs.forEach((r,i)=>{
    const prev=i?recs[i-1]:null;
    const prevKeys=new Set((prev?prev.picks:[]).map(pickKey));
    const curKeys=new Set(r.picks.map(pickKey));
    const ev=recEval(r);
    const bySem={};
    r.picks.forEach(p=>{ const k=p.y?semKey(p.y,p.s):'?'; (bySem[k]=bySem[k]||[]).push({p,cls:prev&&!prevKeys.has(pickKey(p))?'add':'same'}); });
    if(prev) prev.picks.forEach(p=>{ if(!curKeys.has(pickKey(p))){ const k=p.y?semKey(p.y,p.s):'?'; (bySem[k]=bySem[k]||[]).push({p,cls:'del'}); } });
    h+='<div class="tl-card'+(i===recs.length-1?' latest':'')+'"><div><div class="d">'+esc(fmtDate(r.date))+(i===recs.length-1?' <span class="pill p-acc">최근</span>':'')+'</div>'
      +'<div class="meta">'+esc([r.counselor,r.method,r.src?'출처: '+r.src:''].filter(Boolean).join(' · '))+'</div></div>'
      +((r.career||r.major)?'<div class="small"><b>희망</b> '+esc([r.career,r.major].filter(Boolean).join(' / '))+'</div>':'')
      +'<div class="row">'+statusPill(evalStatus(ev))+'<span class="pill p-mute">'+r.picks.length+'과목 · '+picksCredits(r.picks)+'학점</span></div>'+issueHtml(ev)
      +'<div class="tl-sems">'+Object.keys(bySem).sort().map(k=>'<div class="tl-sem"><b>'+(k==='?'?'학기 미상':semLabel(k))+'</b>'+bySem[k].map(x=>'<div class="it '+x.cls+'"><span>'+esc(x.p.n)+'</span><span class="tt '+typeCls(x.p.t)+'">'+esc(typeShort(x.p.t))+'</span></div>').join('')+'</div>').join('')+'</div>'
      +(r.content?'<div><div class="small muted" style="font-weight:700">상담 내용</div><div class="tl-txt">'+esc(r.content)+'</div></div>':'')
      +(r.plan?'<div><div class="small muted" style="font-weight:700">추후 계획</div><div class="tl-txt">'+esc(r.plan)+'</div></div>':'')
      +'<div class="acts"><button class="btn" data-ed="'+r.id+'">수정</button><button class="btn" data-pr="'+r.id+'">인쇄</button><button class="btn danger" data-del="'+r.id+'">삭제</button></div></div>';
  });
  h+='</div></div>';
  P.innerHTML=h; bindStu(s);
}
function bindStu(s){
  $('#ss-sel').onchange=e=>{ ST.stuSel=e.target.value; render(); };
  $('#ss-edit').onclick=()=>editStudentModal(s.id);
  $('#ss-new').onclick=async()=>{ if(!(await confirmLeaveDraft())) return; ST.sid=s.id; newDraft(s.id); setTab('counsel'); };
  $$('[data-ed]').forEach(b=>b.onclick=async()=>{ const r=DB.records.find(x=>x.id===b.dataset.ed); if(!r||!(await confirmLeaveDraft())) return; ST.sid=r.sid; editDraft(r); setTab('counsel'); });
  $$('[data-pr]').forEach(b=>b.onclick=()=>{ const r=DB.records.find(x=>x.id===b.dataset.pr); if(r) printRecord(r); });
  $$('[data-del]').forEach(b=>b.onclick=async()=>{ const r=DB.records.find(x=>x.id===b.dataset.del); if(!r) return;
    if(!(await ask({title:'상담 기록 삭제',msg:'<p>'+esc(r.date)+' 상담 기록을 삭제할까요?</p>',ok:'삭제',danger:true}))) return;
    const snap=snapDB(), wasRec=DRAFT&&DRAFT.recId===r.id;
    DB.records=DB.records.filter(x=>x.id!==r.id); DB.tomb[r.id]=Date.now();
    if(DRAFT&&DRAFT.recId===r.id){ DRAFT.recId=null; DRAFT.dirty=true; }
    save(); render(); undoToast(r.date+' 상담 기록을 삭제했습니다',snap,()=>{ delete DB.tomb[r.id]; if(wasRec&&DRAFT){ DRAFT.recId=r.id; } }); });
}

/* =====================================================================
   상담 목록
   ===================================================================== */
function filteredRecords(){
  const F=ST.list; const q=F.q.trim();
  const stu={}; DB.students.forEach(s=>stu[s.id]=s);
  let list=DB.records.map(r=>({r,s:stu[r.sid]||{id:r.sid,name:'(알 수 없음)',y:'',b:'',no:''}}));
  if(F.latest){ const lt={}; list.forEach(x=>{ const o=lt[x.r.sid]; if(!o||String(x.r.date).localeCompare(String(o.r.date))>0||(x.r.date===o.r.date&&(x.r.createdAt||0)>(o.r.createdAt||0))) lt[x.r.sid]=x; }); list=Object.values(lt); }
  list=list.filter(({r,s})=>(!F.ban||s.b===F.ban)&&(!F.from||r.date>=F.from)&&(!F.to||r.date<=F.to)
    &&(!q||[s.name,r.career,r.major,r.content,r.plan,r.counselor].some(v=>String(v||'').includes(q))||r.picks.some(p=>p.n.includes(q))));
  list.sort((a,b)=>String(b.r.date).localeCompare(String(a.r.date))||(+a.s.b||0)-(+b.s.b||0)||(+a.s.no||0)-(+b.s.no||0));
  return list;
}
let LROWS=null;
function renderList(P){
  LROWS=null;
  const F=ST.list; const bans=bansOf(DB.students);
  const all=filteredRecords(); all.forEach(x=>{ x.ev=recEval(x.r); x.st=evalStatus(x.ev); });
  const SO={bad:0,warn:1,ok:2,none:3};
  const list=sortList(all.filter(x=>chipPass('ls',x.st)),'ls',{date:x=>x.r.date,no:x=>BANNO(x.s),name:x=>x.s.name,cs:x=>x.r.counselor||'',car:x=>[x.r.career,x.r.major].filter(Boolean).join(' / '),n:x=>x.r.picks.length,cr:x=>picksCredits(x.r.picks),st:x=>SO[x.st]});
  let h='<div class="card"><h2>상담 목록 <span class="small muted">'+list.length+'건</span><span class="tail"><button class="btn" id="ls-print" title="보이는 학생마다 가장 최근 상담 기록을 한 장씩 인쇄">학생별 최근 기록 일괄 인쇄</button><button class="btn" id="ls-xls">엑셀로 내려받기</button></span></h2>'
    +'<div class="row" style="margin-bottom:10px"><select id="ls-ban"><option value="">전체 반</option>'+bans.map(b=>'<option value="'+esc(b)+'"'+(b===F.ban?' selected':'')+'>'+esc(b)+'반</option>').join('')+'</select>'
    +'<input id="ls-q" placeholder="이름·진로·학과·과목·내용 검색" value="'+esc(F.q)+'" style="flex:1;min-width:180px">'
    +'<input type="date" id="ls-from" value="'+esc(F.from)+'"><span class="muted">~</span><input type="date" id="ls-to" value="'+esc(F.to)+'">'
    +'<label class="small" style="display:flex;gap:4px;align-items:center"><input type="checkbox" class="sw" id="ls-latest"'+(F.latest?' checked':'')+'> 학생별 최근 기록만</label></div>'
    +statusChips('ls',all.map(x=>x.st),false);
  if(!list.length) h+='<div class="empty-msg">조건에 맞는 상담 기록이 없습니다.</div>';
  else{
    h+='<div class="scroll-x"><table class="tbl"><thead><tr>'+sortTh('ls','date','상담일')+sortTh('ls','no','반-번호')+sortTh('ls','name','이름')+sortTh('ls','cs','상담자')+sortTh('ls','car','희망 진로 / 학과')+sortTh('ls','n','과목','num')+sortTh('ls','cr','학점','num')+sortTh('ls','st','상태 · 확인할 내용')+'<th>출처</th></tr></thead><tbody>'
      +(LROWS=list.slice(0,800).map(({r,s,ev})=>'<tr data-sid="'+esc(s.id)+'" style="cursor:pointer"><td class="nw">'+esc(r.date)+'</td><td>'+esc(stuNo(s))+'</td><td><b>'+esc(dn(s.name))+'</b></td><td>'+esc(r.counselor||'')+'</td><td>'+esc([r.career,r.major].filter(Boolean).join(' / '))+'</td><td class="num">'+r.picks.length+'</td><td class="num">'+picksCredits(r.picks)+'</td><td style="min-width:220px">'+statusPill(evalStatus(ev))+issueHtml(ev,4)+'</td><td class="small muted">'+esc(r.src||'')+'</td></tr>')).slice(0,60).join('')
      +'</tbody></table></div>'+(list.length>800?'<p class="small muted">앞의 800건만 표시했습니다. 엑셀로 내려받으면 전체를 볼 수 있습니다.</p>':'');
  }
  h+='</div>';
  P.innerHTML=h;
  const re=()=>renderList(P);
  $('#ls-ban').onchange=e=>{ F.ban=e.target.value; re(); };
  $('#ls-q').oninput=e=>{ F.q=e.target.value; const p=e.target.selectionStart; re(); const i=$('#ls-q'); i.focus(); i.setSelectionRange(p,p); };
  $('#ls-from').onchange=e=>{ F.from=e.target.value; re(); };
  $('#ls-to').onchange=e=>{ F.to=e.target.value; re(); };
  $('#ls-latest').onchange=e=>{ F.latest=e.target.checked; re(); };
  $('#ls-xls').onclick=()=>exportRecords(list.map(x=>x.r),'counsel_records_'+today().replace(/-/g,'')+'.xlsx');
  $('#ls-print').onclick=()=>{ const sids=[...new Set(list.map(x=>x.s.id))]; printMany(latestOf(DB.students.filter(s=>sids.includes(s.id))),(F.ban?F.ban+'반':'')); };
  bindSort(P,re); bindChips(P,re);
  progressive(P.querySelector('table.tbl tbody'),LROWS||[],60);
  P.onclick=e=>{ const tr=e.target.closest('tr[data-sid]'); if(!tr) return; ST.stuSel=tr.dataset.sid; setTab('student'); };
}

/* =====================================================================
   학년 현황 (취합 · 통계)
   ===================================================================== */
function gradeData(ban){
  const studs=sortStudents(DB.students).filter(s=>!ban||s.b===ban);
  const rows=studs.map(s=>{ const lr=latestRec(s.id); const ev=lr?recEval(lr):null; return {s,lr,ev,st:lr?evalStatus(ev):'none',n:recsOf(s.id).length}; });
  const cnt={}, byBan={}; const extraCnt={};
  rows.forEach(x=>{ if(!x.lr) return; const {ids,extra}=picksToSel(x.lr.picks);
    ids.forEach(id=>{ cnt[id]=(cnt[id]||[]); cnt[id].push(x.s); });
    extra.forEach(p=>{ const k=(p.y?p.y+'-'+p.s+' ':'')+p.n; extraCnt[k]=(extraCnt[k]||0)+1; }); });
  return {rows,cnt,extraCnt};
}
function renderGrade(P){
  const G=ST.grade; const bans=bansOf(DB.students);
  const D=gradeData(G.ban);
  const done=D.rows.filter(x=>x.lr).length, ok=D.rows.filter(x=>x.st==='ok').length, bad=D.rows.filter(x=>x.st==='bad').length, warn=D.rows.filter(x=>x.st==='warn').length;
  let h='<div class="card"><h2>담임 파일 합치기<span class="tail"><button class="btn pri" id="gr-merge">파일 선택해서 합치기</button></span></h2>'
    +'<p class="small muted">다른 선생님이 저장한 <b>'+APP_SHORT+' HTML 파일</b>이나 <b>상담 목록 엑셀</b>(이 앱에서 내려받은 것 또는 기존 「선택과목 상담툴」 엑셀 .xlsm)을 여러 개 한 번에 고르면 이 파일에 합쳐집니다. 같은 기록은 한 번만 들어가고, 더 최근에 고친 기록이 남습니다.</p>'
    +'<div id="gr-log"></div></div>';
  h+='<div class="card"><h2>현황 <select id="gr-ban" style="font-weight:600"><option value="">전체 반</option>'+bans.map(b=>'<option value="'+esc(b)+'"'+(b===G.ban?' selected':'')+'>'+esc(b)+'반</option>').join('')+'</select>'
    +'<span class="tail"><button class="btn" id="gr-xls">학년 현황 엑셀로 내려받기</button></span></h2>'
    +'<div class="stat-cards">'
    +'<div class="stat-card"><div class="k">학생</div><div class="v">'+D.rows.length+'<small>명</small></div></div>'
    +'<div class="stat-card"><div class="k">상담한 학생</div><div class="v">'+done+'<small>명 ('+(D.rows.length?Math.round(done/D.rows.length*100):0)+'%)</small></div></div>'
    +'<div class="stat-card"><div class="k">선택 완료</div><div class="v" style="color:var(--ok)">'+ok+'<small>명</small></div></div>'
    +'<div class="stat-card"><div class="k">미완료</div><div class="v" style="color:var(--warn)">'+warn+'<small>명</small></div></div>'
    +'<div class="stat-card"><div class="k">확인 필요 (초과·선이수·검증 규칙)</div><div class="v" style="color:var(--bad)">'+bad+'<small>명</small></div></div>'
    +'</div></div>';
  if(!G.ban&&bans.length>1){
    h+='<div class="card"><h2>반별 진행</h2><div class="scroll-x"><table class="tbl compact"><thead><tr><th>반</th><th class="num">학생</th><th class="num">상담한 학생</th><th class="num">선택 완료</th><th class="num">미완료</th><th class="num">확인 필요</th><th>최근 상담일</th></tr></thead><tbody>'
      +bans.map(b=>{ const L=D.rows.filter(x=>x.s.b===b); const last=L.map(x=>x.lr&&x.lr.date).filter(Boolean).sort().pop()||'-';
        return '<tr><td><b>'+esc(b)+'반</b></td><td class="num">'+L.length+'</td><td class="num">'+L.filter(x=>x.lr).length+'</td><td class="num">'+L.filter(x=>x.st==='ok').length+'</td><td class="num">'+L.filter(x=>x.st==='warn').length+'</td><td class="num">'+L.filter(x=>x.st==='bad').length+'</td><td>'+esc(last)+'</td></tr>'; }).join('')
      +'</tbody></table></div></div>';
  }
  if(CUR){
    const mx=Math.max(1,...Object.values(D.cnt).map(a=>a.length));
    const min=+G.min||0;
    h+='<div class="card"><h2>과목별 선택 인원 <span class="small muted">학생마다 가장 최근 상담 기준</span>'
      +'<span class="tail"><label class="small row" style="gap:5px"><input type="checkbox" class="sw" id="gr-sort"'+(G.sortN?' checked':'')+'> 인원 많은 순</label><label class="small row" style="gap:4px">개설 기준 인원 <input id="gr-min" type="number" min="0" style="width:64px" value="'+esc(G.min)+'"></label></span></h2>'
      +'<div class="sem-cols">'+CX.sems.map(k=>{
        const gs=Object.values(CX.groups).filter(g=>semKey(g.y,g.s)===k);
        return '<div class="card" style="margin:0"><h2 style="font-size:13.5px">'+semLabel(k)+'</h2>'+gs.map(g=>'<div class="grp-h">'+esc(g.g)+' <span class="pill p-mute">택'+g.need+' · '+g.c+'학점</span></div>'
          +(G.sortN?g.rows.slice().sort((a,b)=>(D.cnt[b.id]||[]).length-(D.cnt[a.id]||[]).length):g.rows).map(r=>{ const n=(D.cnt[r.id]||[]).length; const low=min&&n<min;
            return '<div class="subj-row"><span class="n" title="'+esc(r.n)+'">'+esc(r.n)+' <span class="tt '+typeCls(r.t)+'">'+esc(typeShort(r.t))+'</span></span><span class="bar'+(low?' low':'')+'"><i style="width:'+(n/mx*100)+'%"></i></span><span class="c"'+(n?' data-who="'+r.id+'" style="cursor:pointer;text-decoration:underline dotted"':'')+(low?' title="개설 기준 미달"':'')+'>'+(low?'⚠':'')+n+'</span></div>'; }).join('')).join('')+'</div>';
      }).join('')+'</div>';
    const ex=Object.keys(D.extraCnt);
    if(ex.length) h+='<div class="extra-box">현재 교육과정에 없는 과목이 기록에 있습니다: '+ex.map(k=>esc(k)+' ('+D.extraCnt[k]+'명)').join(', ')+'</div>';
    h+='</div>';
  }
  const chk=D.rows.filter(x=>x.st==='bad'||x.st==='warn');
  h+='<div class="card"><h2>확인이 필요한 학생 <span class="small muted">'+chk.length+'명</span></h2>';
  if(!chk.length) h+='<div class="empty-msg small">'+(done?'모든 학생의 선택이 완료되었습니다.':'아직 상담 기록이 없습니다.')+'</div>';
  else h+='<div class="scroll-x"><table class="tbl"><thead><tr><th>반-번호</th><th>이름</th><th>상태</th><th>내용</th><th>최근 상담</th></tr></thead><tbody>'
    +chk.map(x=>'<tr data-sid="'+esc(x.s.id)+'" style="cursor:pointer"><td style="white-space:nowrap">'+esc(stuNo(x.s))+'</td><td style="white-space:nowrap"><b>'+esc(dn(x.s.name))+'</b></td><td>'+statusPill(x.st)+'</td><td>'+issueHtml(x.ev)+'</td><td style="white-space:nowrap">'+esc(x.lr.date)+'</td></tr>').join('')
    +'</tbody></table></div>';
  h+='</div>';
  const none=D.rows.filter(x=>!x.lr);
  if(none.length) h+='<div class="card"><h2>아직 상담하지 않은 학생 <span class="small muted">'+none.length+'명</span></h2><div class="row">'+none.map(x=>'<span class="pill p-mute">'+esc(stuNo(x.s)+' '+dn(x.s.name))+'</span>').join('')+'</div></div>';
  P.innerHTML=h;
  $('#gr-merge').onclick=()=>$('#f-merge').click();
  $('#gr-ban').onchange=e=>{ G.ban=e.target.value; renderGrade(P); };
  const mi=$('#gr-min'); if(mi) mi.onchange=e=>{ G.min=e.target.value; renderGrade(P); };
  const gs=$('#gr-sort'); if(gs) gs.onchange=e=>{ G.sortN=e.target.checked; keepScroll(()=>renderGrade(P)); };
  $('#gr-xls').onclick=()=>exportGrade();
  $$('[data-who]').forEach(el=>el.onclick=()=>{ const r=CX.byId[el.dataset.who]; const L=sortStudents(D.cnt[el.dataset.who]||[]);
    modal(r.n+' 선택 학생 ('+L.length+'명)','<div class="row">'+L.map(s=>'<span class="pill p-acc">'+esc(stuNo(s)+' '+dn(s.name))+'</span>').join('')+'</div>'); });
  $$('#page tr[data-sid]').forEach(tr=>tr.onclick=()=>{ ST.stuSel=tr.dataset.sid; setTab('student'); });
  if(ST.mergeLog) $('#gr-log').innerHTML=ST.mergeLog;
}
/* 확인할 내용 — 쉬운 말 한 줄씩 {lv:'bad'|'warn', t} */
function issueList(ev){
  if(!ev||!ev.sel.size) return [];
  const out=[];
  const lab=g=>g.y+'-'+g.s+' 「'+g.g+'」'+(Object.values(CX.groups).some(o=>o!==g&&o.y===g.y&&o.s===g.s&&o.g===g.g)?'('+g.c+'학점)':'');
  Object.values(ev.groups).forEach(x=>{
    if(x.state==='over') out.push({lv:'bad',gk:x.g.key,ids:x.g.rows.map(r=>r.id),t:lab(x.g)+': '+x.need+'과목만 고르는데 '+x.cnt+'과목을 골랐어요'});
  });
  Object.keys(ev.pre).forEach(id=>{ const pn=ev.pre[id].map(normName); out.push({lv:'bad',ids:[id].concat(CX.rows.filter(r=>pn.includes(normName(r.n))).map(r=>r.id)),t:'「'+CX.byId[id].n+'」을(를) 들으려면 「'+ev.pre[id].join('」·「')+'」을(를) 먼저 골라야 해요'}); });
  ev.rules.filter(r=>!r.ok&&!r.na).forEach(r=>{
    const why=r.val!=null?r.val+ruleUnit(r.rule)+' — '+r.why:r.why;
    const rn=(r.rule.subjects||[]).concat(r.rule.then||[]).map(normName);
    out.push({lv:r.level==='warn'?'warn':'bad',ids:CX.rows.filter(x=>rn.includes(normName(x.n))).map(x=>x.id),t:(r.level==='warn'?'권장 ':'')+'「'+r.rule.name+'」: '+why});
  });
  /* 한 학기를 통째로 안 골랐으면 학기 단위로 한 줄 */
  const bySem={}; Object.values(ev.groups).forEach(x=>{ const k=semKey(x.g.y,x.g.s); (bySem[k]=bySem[k]||[]).push(x); });
  Object.keys(bySem).sort().forEach(k=>{
    const L=bySem[k];
    if(L.length>1&&L.every(x=>x.state==='none')){ out.push({lv:'warn',gk:L[0].g.key,ids:[],t:semLabel(k)+': 아직 한 과목도 고르지 않았어요 (묶음 '+L.length+'개)'}); return; }
    L.forEach(x=>{ if(x.state==='under'||x.state==='none') out.push({lv:'warn',gk:x.g.key,ids:x.g.rows.map(r=>r.id),t:lab(x.g)+': '+x.need+'과목을 골라야 하는데 '+(x.cnt?x.cnt+'과목만 골랐어요':'아직 안 골랐어요')}); });
  });
  return out;
}
function issueHtml(ev,max){
  const L=issueList(ev); if(!L.length) return '';
  max=max||99;
  return '<ul class="iss">'+L.slice(0,max).map(x=>'<li class="'+x.lv+'">'+esc(x.t)+'</li>').join('')+(L.length>max?'<li class="more">외 '+(L.length-max)+'건</li>':'')+'</ul>';
}
function issueText(ev){
  if(!ev) return '';
  const over=[],under=[],pre=[];
  const lab=g=>g.y+'-'+g.s+' '+g.g+(Object.values(CX.groups).some(o=>o!==g&&o.y===g.y&&o.s===g.s&&o.g===g.g)?'('+g.c+'학점)':'');
  Object.values(ev.groups).forEach(x=>{
    if(x.state==='over') over.push(lab(x.g)+' '+x.cnt+'/'+x.need);
    else if(x.state==='under'||x.state==='none') under.push(lab(x.g)+' '+x.cnt+'/'+x.need);
  });
  Object.keys(ev.pre).forEach(id=>{ pre.push(CX.byId[id].n+' ← '+ev.pre[id].join(', ')); });
  const fails=(ev.sel.size?ev.rules:[]).filter(r=>!r.ok&&!r.na);
  const txt=r=>r.val!=null?r.rule.name+' '+r.val+ruleUnit(r.rule)+'('+r.why+')':r.rule.name+': '+r.why;
  const rl=fails.filter(r=>r.level!=='warn').map(txt), rw=fails.filter(r=>r.level==='warn').map(txt);
  return [rl.length?'검증 규칙: '+rl.join(', '):'',rw.length?'권장: '+rw.join(', '):'',over.length?'초과: '+over.join(', '):'',pre.length?'선이수 미선택: '+pre.join(' / '):'',under.length?'부족: '+under.join(', '):''].filter(Boolean).join('  ·  ');
}

/* =====================================================================
   교육과정 설정
   ===================================================================== */
function accCard(key,title,body,def){
  ST.acc=ST.acc||{}; const open=key in ST.acc?ST.acc[key]:def;
  return '<details class="card acc" data-acc="'+key+'"'+(open?' open':'')+'><summary><h2>'+title+'</h2></summary><div class="acc-b">'+body+'</div></details>';
}
function keepScroll(fn){ const m=$('#main'), y=m.scrollTop; fn(); m.scrollTop=y; }
/* 과목 표에서 바로 고치기 */
function curEditApply(el){
  const f=el.dataset.f;
  if(el.dataset.g){
    const g=CX.groups[el.dataset.g]; if(!g) return; const v=+el.value;
    if(f==='c'){
      if(!(Number.isInteger(v)&&v>=1&&v<=12)){ toast('학점은 1~12 사이 정수로 적어 주세요'); el.value=g.c; return; }
      if(v===g.c) return;
      const ids=new Set(g.rows.map(r=>r.id));
      DB.records.forEach(rec=>{ let ch=false; (rec.picks||[]).forEach(p=>{ const m=matchPick(p); if(m&&ids.has(m.id)){ p.c=v; ch=true; } }); if(ch) rec.credits=picksCredits(rec.picks); });
      g.rows.forEach(r=>r.c=v);
      toast('「'+g.g+'」 묶음을 과목당 '+v+'학점으로 바꿨습니다');
    }else{
      if(!(Number.isInteger(v)&&v>=1&&v<=g.rows.length)){ toast('택 수는 1~'+g.rows.length+' 사이로 적어 주세요'); el.value=g.need; return; }
      if(v===g.need) return;
      g.rows.forEach(r=>r.need=v);
      toast('「'+g.g+'」 묶음을 택'+v+'로 바꿨습니다');
    }
  }else{
    const r=CX.byId[el.dataset.r]; if(!r) return;
    const names=splitList(el.value.replace(/·/g,','));
    const idx={}; CUR.rows.forEach(x=>{ const k=normLoose(x.n); (idx[k]=idx[k]||[]).push(x); });
    const miss=[];
    if(f==='pre'){
      r.pre=[]; r.preExt=[];
      names.forEach(nm=>{ const t=idx[normLoose(nm)]; if(!t){ r.preExt.push(nm); miss.push(nm); return; } const o=t[0]; if(o!==r&&!r.pre.includes(o.n)) r.pre.push(o.n); });
      toast(miss.length?'교육과정에 없는 과목은 확인만 표시합니다(자동 판정 제외): '+miss.join(', '):'「'+r.n+'」 선이수과목을 저장했습니다');
    }else{
      CUR.rows.forEach(o=>{ if(o!==r) o.link=(o.link||[]).filter(n=>normName(n)!==normName(r.n)); });
      r.link=[];
      names.forEach(nm=>{ const t=idx[normLoose(nm)]; if(!t){ miss.push(nm); return; } const o=t[0]; if(o===r) return; if(!r.link.includes(o.n)) r.link.push(o.n); o.link=o.link||[]; if(!o.link.includes(r.n)) o.link.push(r.n); });
      toast(miss.length?'교육과정에서 찾지 못해 뺐습니다: '+miss.join(', '):'「'+r.n+'」 연계과목을 저장했습니다 (양쪽 과목 모두 표시)');
    }
  }
  CUR.sig=curSig(CUR.rows); CUR.editedAt=new Date().toISOString(); setCur(CUR);
  save(); keepScroll(()=>render());
}
function renderCurPage(P){
  let h='<div class="card"><h2>학교 정보</h2><div class="form-grid"><div class="fld c6"><label>학교명</label><div class="row" style="gap:6px;flex-wrap:nowrap"><input id="st-school" value="'+esc(schoolName())+'" placeholder="예: ○○고등학교" maxlength="40" style="flex:1"><button class="btn" id="st-school-save">저장</button></div></div></div>'
    +'<p class="small muted" style="margin-top:8px">화면 맨 위, 인쇄물, 내려받는 엑셀에 표시됩니다. 「배포용 파일 만들기」로 만든 파일에도 함께 들어가므로 담임 선생님들은 따로 적지 않아도 됩니다.</p></div>';
  h+='<div class="card"><h2>교육과정 설정 순서</h2><div class="steps">'
    +'<div class="step"><span class="n">1단계</span><span class="t">나이스 편성표 올리기</span><span class="d">나이스 → 교육과정 → 입학생학교교육과정관리 → 입학생학교교육과정등록/검증 → <b>입학생 학교 교육과정 조회</b>에서 엑셀로 내려받은 파일을 그대로 올립니다. 화면에서 <b>과목당 학점</b>만 확인하면 됩니다.</span><button class="btn pri" id="cu-up">나이스 엑셀 올리기</button></div>'
    +'<div class="step"><span class="n">2단계 · 필요할 때</span><span class="t">양식 채우기</span><span class="d">학점·택·선이수과목은 아래 「과목 표」에서 바로 고칠 수 있습니다. <b>학점 기준</b>(예: 국영수 상한)을 넣거나 여러 과목을 한꺼번에 고칠 때는 엑셀 양식으로 받아 채운 뒤 다시 올립니다.</span>'
      +'<div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn" id="cu-cur" '+(CUR?'':'disabled')+'>① 양식으로 받기</button><button class="btn" id="cu-up2">② 채운 양식 올리기</button></div></div>'
    +'<div class="step"><span class="n">3단계 · 담당자</span><span class="t">담임 배포용 파일 만들기</span><span class="d">이 교육과정과 학교명이 들어 있고 기록은 빈 HTML 파일을 내려받아 담임 선생님들께 나눠 드립니다.</span><button class="btn" id="cu-dist" '+(CUR?'':'disabled')+'>배포용 파일 만들기</button></div>'
    +'</div>'
    +'<div class="row small muted" style="margin-top:10px;gap:8px;flex-wrap:wrap"><span>나이스 파일이 없나요? 빈 양식에 직접 적어 1단계처럼 올려도 됩니다. 기존 「선택과목 상담툴」 엑셀(.xlsm)도 그대로 올릴 수 있습니다.</span><button class="btn ghost" id="cu-blank">빈 양식 내려받기 (.xlsx)</button></div>'
    +'</div>';
  if(CUR){
    const gN=Object.keys(CX.groups).length;
    h+='<div class="card"><h2>지금 쓰는 교육과정'+(CUR.sample?' <span class="pill p-warn">예시</span>':'')+'</h2>'
      +'<dl class="kv"><dt>제목</dt><dd>'+esc(CUR.title||'-')+'</dd>'+(schoolName()?'<dt>학교</dt><dd>'+esc(schoolName())+'</dd>':'')
      +'<dt>과목</dt><dd>'+CX.rows.length+'개 · 선택 묶음 '+gN+'개 · '+CX.sems.map(semLabel).join(', ')+'</dd>'
      +'<dt>검증 규칙</dt><dd>'+(curChecks().length?curChecks().map(c=>esc(c.name)+(c.on===false?' <span class="muted">(꺼짐)</span>':'')).join(' · '):'<span class="muted" style="font-weight:500">없음</span>')+' <a href="#" id="cu-checks" style="font-weight:600">검증 규칙 관리 →</a></dd>'
      +'<dt>원본 파일</dt><dd>'+esc(CUR.src||'-')+(CUR.sheet?' / '+esc(CUR.sheet)+' 시트':'')+'</dd><dt>불러온 때</dt><dd>'+esc(CUR.at?new Date(CUR.at).toLocaleString('ko-KR'):'-')+'</dd></dl>';
    if(CUR.issues&&CUR.issues.length){ const nw=CUR.issues.filter(x=>x.lv!=='i').length; h+='<details class="sub-acc" style="margin-top:12px"'+(nw?' open':'')+'><summary class="small muted" style="font-weight:700">인식 결과 '+CUR.issues.length+'건'+(nw?' (확인할 것 '+nw+'건)':'')+'</summary><div style="margin-top:6px">'+issuesHtml(CUR.issues)+'</div></details>'; }
    h+='</div>';
    const ed=!!ST.curEdit;
    const numIn=(g,f,v,max)=>'<input class="ie" type="number" min="1" max="'+max+'" step="1" data-g="'+esc(g.key)+'" data-f="'+f+'" value="'+v+'" aria-label="'+(f==='c'?'학점':'택 수')+'">';
    const txtIn=(r,f,list,ph)=>'<input class="ie ie-w" data-r="'+r.id+'" data-f="'+f+'" value="'+esc(list.join(', '))+'" placeholder="'+ph+'">';
    const body='<div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px"><span class="small muted">'+(ed?'고치는 중 — <b>학점·택</b>은 묶음 단위, <b>연계·선이수과목</b>은 쉼표로 구분합니다. 칸을 벗어나거나 Enter를 누르면 바로 저장됩니다.':'나이스에서 올린 뒤 과목당 학점이 다르거나 선이수과목을 넣고 싶으면 「표에서 바로 고치기」를 누르세요.')+'</span>'
      +'<button class="btn '+(ed?'pri':'')+'" id="cu-edit">'+(ed?'✔ 고치기 끝내기':'표에서 바로 고치기')+'</button></div>'
      +'<div class="scroll-x"><table class="tbl'+(ed?' editing':'')+'"><thead><tr><th>학기</th><th>선택그룹</th><th class="num">학점</th><th class="num">택</th><th>과목명</th><th>유형</th><th>계열</th><th>연계과목</th><th>선이수과목</th><th>검증 규칙(합계)</th></tr></thead><tbody>'
      +Object.values(CX.groups).map(g=>g.rows.map((r,i)=>'<tr>'+(i?'<td colspan="4" style="border-bottom-color:transparent"></td>':'<td><b>'+semLabel(semKey(g.y,g.s))+'</b></td><td>'+esc(g.g)+'</td><td class="num">'+(ed?numIn(g,'c',g.c,12):g.c)+'</td><td class="num">'+(ed?numIn(g,'need',g.need,g.rows.length):g.need)+'</td>')
        +'<td><b>'+esc(r.n)+'</b></td><td><span class="tt '+typeCls(r.t)+'">'+esc(r.t)+'</span></td><td class="small">'+esc(r.up+(r.lo!==r.up?' / '+r.lo:''))+'</td>'
        +'<td class="small">'+(ed?txtIn(r,'link',r.link||[],''):esc((r.link||[]).join(', ')))+'</td>'
        +'<td class="small">'+(ed?txtIn(r,'pre',(r.pre||[]).concat(r.preExt||[]),''):esc((r.pre||[]).concat(r.preExt||[]).join(', ')))+'</td>'
        +'<td class="small">'+esc(curChecks().filter(c=>c.type==='sum'&&(c.subjects||[]).some(n=>normName(n)===normName(r.n))).map(c=>c.name).join(', '))+'</td></tr>').join('')).join('')
      +'</tbody></table></div>';
    h+=accCard('subj','과목 표 <span class="small muted">학점·택·연계·선이수과목 확인하고 바로 고치기</span>',body,true);
  }
  h+=accCard('db','기존 엑셀 기록 가져오기','<p class="small muted" style="margin-bottom:8px">기존 「선택과목 상담툴」 엑셀(.xlsm)의 <b>선택과목 상담DB</b> 시트나, 이 앱에서 내려받은 상담 목록 엑셀을 올리면 상담 기록으로 옮겨옵니다. 과목은 지금 교육과정과 이름으로 맞춥니다. 화면에 파일을 끌어다 놓아도 됩니다.</p>'
    +'<button class="btn" id="cu-db">상담 기록 엑셀 가져오기</button>',false);
  h+=demoCardHtml();
  h+=accCard('base','기본값 · 전체 지우기','<div class="form-grid"><div class="fld c4"><label>상담자 이름 (새 상담에 자동 입력)</label><input id="st-cs" value="'+esc(DB.settings.counselor||'')+'"></div>'
    +'<div class="fld c4"><label>내 반 (상담하기 목록 기본 필터)</label><input id="st-ban" value="'+esc(DB.settings.ban||'')+'" placeholder="예: 3"></div></div>'
    +'<div class="row" style="margin-top:14px;border-top:1px solid var(--line);padding-top:12px"><button class="btn danger" id="st-wipe">모든 학생·상담 기록 지우기</button><span class="small muted">교육과정은 남고 기록만 지워집니다.</span></div>',false);
  P.innerHTML=h;
  const lk=$('#cu-checks'); if(lk) lk.onclick=e=>{ e.preventDefault(); ST.check=ST.check||{ban:DB.settings.ban||'',only:false}; ST.check.mgr=true; setTab('check'); };
  $('#cu-blank').onclick=()=>exportCurTemplate(false);
  $('#cu-cur').onclick=()=>exportCurTemplate(true);
  $('#cu-up').onclick=()=>$('#f-cur').click();
  $('#cu-up2').onclick=()=>$('#f-cur').click();
  bindDemoCard();
  $$('details.acc').forEach(d=>d.ontoggle=()=>{ ST.acc[d.dataset.acc]=d.open; });
  const eb=$('#cu-edit'); if(eb) eb.onclick=()=>{ ST.curEdit=!ST.curEdit; keepScroll(()=>render()); };
  $$('input.ie').forEach(el=>{ el.onchange=()=>curEditApply(el); el.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); el.blur(); } }; });
  $('#cu-dist').onclick=makeDist;
  $('#cu-db').onclick=()=>{ if(!CUR){ toast('먼저 교육과정을 불러와 주세요'); return; } $('#f-db').click(); };
  const schSave=()=>{ const v=$('#st-school').value.trim(); if(v===schoolName()) { toast(v?'이미 저장된 학교명입니다':'학교명을 입력해 주세요'); return; } setSchool(v); render(); toast(v?'학교명을 저장했습니다':'학교명을 지웠습니다'); };
  $('#st-school-save').onclick=schSave;
  $('#st-school').onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); schSave(); } };
  $('#st-cs').onchange=e=>{ DB.settings.counselor=e.target.value.trim(); save(); toast('저장했습니다'); };
  $('#st-ban').onchange=e=>{ DB.settings.ban=e.target.value.trim(); ST.fBan=null; save(); toast('저장했습니다'); };
  $('#st-wipe').onclick=async()=>{
    const n=DB.records.length;
    if(!(await ask({title:'모든 학생·상담 기록 지우기',msg:'<p>학생 <b>'+DB.students.length+'명</b>과 상담 기록 <b>'+n+'건</b>을 모두 지웁니다. 교육과정은 남습니다.</p><p class="small muted" style="margin-top:6px">먼저 「🔒 백업·지우기 → 백업 받기」를 해 두면 안전합니다.</p>',ok:'모두 지우기',danger:true,typeWord:'삭제'}))) return;
    const snap=snapDB(); const now=Date.now(); DB.records.forEach(r=>DB.tomb[r.id]=now);
    DB.records=[]; DB.students=[]; DRAFT=null; ST.sid=null; save(); render(); undoToast('모두 지웠습니다',snap,()=>{ const s=JSON.parse(snap); DB.tomb=s.tomb; });
  };
}
function issuesHtml(list){
  const lv={e:'오류',w:'확인',i:'안내'};
  const order={e:0,w:1,i:2};
  return '<div class="issues">'+list.slice().sort((a,b)=>order[a.lv]-order[b.lv]).map(x=>'<div class="iss '+x.lv+'"><span class="lv">'+lv[x.lv]+'</span><span>'+esc(x.msg)+'</span></div>').join('')+'</div>';
}

/* =====================================================================
   사용법
   ===================================================================== */
/* ---------- 간단 사용법 (1쪽) ---------- */
function guideHtml(forPrint){
  const go=(t,label)=>forPrint?'':'<button class="btn" data-goto="'+t+'">'+label+' →</button>';
  return '<div class="qg">'
  +'<div class="qg-lead"><b>선택과목 상담 기록·현황·검증을 한 화면에서 하는 HTML 파일 하나</b>입니다. 설치·인터넷이 필요 없고, 학생 기록은 이 파일(또는 이 PC의 브라우저)에만 저장되며 외부로 전송되지 않습니다. 준비물: <b>크롬 또는 엣지</b> (사파리·파이어폭스는 파일 저장 불가)</div>'
  +'<div class="qg-roles">'
  +'<div class="qg-role"><div class="qg-h"><span class="qg-n">A</span>교육과정 담당 <small>(처음 한 번)</small></div><ol>'
    +'<li>「교육과정 설정 → <b>학교 정보</b>」에 학교명 적기</li>'
    +'<li>나이스 「입학생 학교 교육과정 조회」 엑셀을 「<b>나이스 엑셀 올리기</b>」로 올리거나 화면에 끌어다 놓고, 과목당 학점 확인</li>'
    +'<li>선이수과목·학점은 「<b>과목 표 → 표에서 바로 고치기</b>」, 학점 기준은 양식이나 「검증 결과 → 새 검증 규칙」으로<br><small>나이스 파일이 없으면 빈 양식에 직접 적어 올립니다.</small></li>'
    +'<li>「<b>배포용 파일 만들기</b>」로 받은 HTML을 담임께 나눠 드립니다. (교육과정·규칙만 있고 기록은 비어 있음)</li></ol>'+go('cur','교육과정 설정')+'</div>'
  +'<div class="qg-role"><div class="qg-h"><span class="qg-n">B</span>담임 선생님</div><ol>'
    +'<li>받은 HTML을 <b>내 폴더에 먼저 저장</b> (메신저 첨부를 바로 열지 않기)</li>'
    +'<li>크롬·엣지로 열고 오른쪽 위 빨간 점 「<b>파일에 저장 연결</b>」 → 방금 연 그 파일 선택(초록 점이 되면 자동 저장). 다음부터는 열 때마다 「다시 연결」 한 번.</li>'
    +'<li>「<b>상담하기</b>」에서 학생 추가(「반 명단 붙여넣기」로 한 번에) → 과목 칸을 눌러 선택. 문제가 있으면 「확인할 내용」을 눌러 그 자리로 갑니다.</li>'
    +'<li>「<b>상담 기록 저장</b>」. 반 전체는 「선택 현황표」(엑셀로 받아 1을 고쳐 올리면 바뀐 학생만 반영), 문제 학생은 「검증 결과」에서 봅니다.</li></ol>'+go('counsel','상담하기')+'</div>'
  +'<div class="qg-role"><div class="qg-h"><span class="qg-n">C</span>학년 취합 담당</div><ol>'
    +'<li>담임별 HTML 파일(또는 백업 엑셀)을 받습니다.</li>'
    +'<li>「학년 현황 → <b>파일 선택해서 합치기</b>」로 한 번에 고릅니다. 같은 기록은 한 번만 들어갑니다.</li>'
    +'<li>과목별 인원·확인 필요 학생을 보고 「학년 현황 / 검증 결과」 엑셀로 보관합니다.</li></ol>'+go('grade','학년 현황')+'</div>'
  +'</div>'
  +'<div class="qg-two"><div class="qg-box warn"><div class="qg-t">꼭 지켜 주세요</div><ul>'
    +'<li><b>한 파일은 한 사람·한 창만.</b> 공유 폴더의 파일 하나를 여럿이 열지 말고, 담임마다 자기 파일을 쓴 뒤 「합치기」로 모읍니다.</li>'
    +'<li><b>공용 PC</b>에서 썼다면 끝날 때 「🔒 백업·지우기 → 백업 받고 이 PC 기록 지우기」.</li>'
    +'<li>기록이 든 <b>HTML·백업 엑셀에는 학생 개인정보</b>가 암호화 없이 들어 있습니다. 보관·전달·파기는 학교 지침을 따르고, 다른 학교에는 <b>배포용 파일</b>만 나눕니다.</li></ul></div>'
  +'<div class="qg-box"><div class="qg-t">새 버전 파일을 받았을 때 (이사하듯 옮기기)</div><ol>'
    +'<li><b>쓰던 파일</b>에서 「🔒 백업·지우기 → 백업 받기」 — 짐 싸기</li>'
    +'<li><b>새 파일</b>에서 「🔒 백업·지우기 → 백업 파일로 되살리기」 — 짐 풀기</li>'
    +'<li>새 파일에서 「파일에 저장 연결」. 이제 새 파일만 씁니다.</li></ol><small>학생·기록·교육과정·검증 규칙이 모두 옮겨집니다.</small></div></div>'
  +'<div class="qg-box"><div class="qg-t">이럴 땐 이렇게</div><table class="qg-tbl"><tbody>'
    +[['「파일 저장 미지원 브라우저」가 떠요','크롬이나 엣지로 다시 여세요.'],
      ['어제 쓴 기록이 안 보여요','어제 연결했던 <b>그 파일</b>을 열었는지 확인하세요(다운로드 폴더의 사본일 수 있음). 없으면 백업 엑셀로 되살리세요.'],
      ['「다른 곳에서 이 파일이 바뀌었습니다」가 떠요','같은 파일이 다른 창·다른 사람에게 열려 있습니다. 양쪽 기록은 합쳐 저장됐으니 한쪽 창을 닫으세요.'],
      ['교육과정 양식에 빨간 오류가 나와요','안내된 행 번호를 엑셀에서 고친 뒤 다시 올리세요. 다시 올려도 기존 기록은 지워지지 않습니다.'],
      ['실수로 기록을 지웠어요','지운 직후 화면 아래 「<b>되돌리기</b>」를 10초 안에 누르세요. 지났다면 백업 엑셀로 되살립니다.'],
      ['화면 공유 때 학생 이름이 보여요','오른쪽 위 「<b>보기 ▾</b>」에서 「학생 이름 가리기」를 켜면 「김○○」로 가려집니다(엑셀·백업은 실명). 글자 크기·발표 모드도 여기에 있습니다.'],
      ['연수·시연용 학생이 필요해요','「교육과정 설정 → 연수용 예시 데이터 → <b>예시 학생 넣기</b>」. 끝나면 「예시 데이터 빼기」로 예시만 지웁니다.'],
      ['가상 예시 교육과정이 보여요','처음 들어 있는 예시입니다. 우리 학교 나이스 엑셀을 올리면 바뀝니다.']]
     .map(r=>'<tr><th>'+r[0]+'</th><td>'+r[1]+'</td></tr>').join('')
  +'</tbody></table></div>'
  +'<div class="qg-foot"><b>보안</b>: 이 파일은 인터넷 통신이 잠겨 있어(CSP) 기록을 밖으로 보낼 수 없습니다. 크롬에서 F12 → Network 탭이 비어 있는 것으로 확인할 수 있습니다. · '+APP_NAME+' 버전 '+APP_VERSION+' ('+APP_DATE+') · 포함 라이브러리: ExcelJS (MIT 라이선스, © 2014-2019 Guyon Roche) 및 그 하위 라이브러리 — 전체 문구는 HTML 파일 앞부분 주석</div>'
  +'</div>';
}
function renderHelp(P){
  P.innerHTML='<div class="card"><h2>간단 사용법 <span class="small muted">처음 쓰시는 분은 내 역할(A·B·C)만 보시면 됩니다</span><span class="tail"><button class="btn" id="qg-tour">둘러보기 다시 보기</button><button class="btn" id="qg-print">A4 한 쪽으로 인쇄</button></span></h2>'+guideHtml(false)+'</div>';
  $('#qg-tour').onclick=()=>startTour();
  $('#qg-print').onclick=()=>{ $('#print').innerHTML='<h1>'+esc(APP_NAME)+' 간단 사용법</h1>'+guideHtml(true); setTimeout(()=>window.print(),50); };
  $$('[data-goto]').forEach(b=>b.onclick=()=>setTab(b.dataset.goto));
}
