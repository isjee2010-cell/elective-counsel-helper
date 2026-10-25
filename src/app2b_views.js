/* =====================================================================
   선택 현황표 (학생 × 과목, 선택 = 1)  ·  검증 결과 (학점 기준 · 선이수 위계 · 묶음 개수)
   ===================================================================== */
/* 학기 색: 상태색(빨강·노랑·주황·초록)과 겹치지 않는 파랑·보라·청록·회청 계열 */
const SEM_BG=['#e4ecfc','#eee7fb','#ddf1f3','#eaedf4','#e8e9fb','#e2eef8'];
function semBg(k){ return SEM_BG[Math.max(0,CX.sems.indexOf(k))%SEM_BG.length]; }
function sheetCols(){ /* 학기 → 묶음 → 과목 순서 */
  const cols=[], sems=[], grps=[];
  CX.sems.forEach(k=>{
    const gs=Object.values(CX.groups).filter(g=>semKey(g.y,g.s)===k);
    let n=0;
    gs.forEach(g=>{ grps.push({g,n:g.rows.length,sem:k}); g.rows.forEach(r=>cols.push({r,g,sem:k})); n+=g.rows.length; });
    sems.push({k,n});
  });
  return {cols,sems,grps};
}
function grpShort(g){
  const multi=Object.values(CX.groups).some(o=>o!==g&&o.y===g.y&&o.s===g.s&&o.g===g.g);
  return g.g+(/택\s*\d/.test(g.g)?'':' 택'+g.need)+(multi?' · '+g.c+'학점':'')+' ('+g.need+'개)';
}
function studentMatrix(ban){
  return sortStudents(DB.students).filter(s=>!ban||s.b===ban).map(s=>{
    const lr=latestRec(s.id); const sel=lr?picksToSel(lr.picks):{ids:[],extra:[]};
    const ev=evalSel(sel.ids,lr?{career:lr.career,major:lr.major}:null);
    return {s,lr,ids:new Set(sel.ids),extra:sel.extra,ev,st:lr&&sel.ids.length?evalStatus(ev):'none'};
  });
}
/* 검증 판정 (원본 점검 도구 기준: 묶음 개수가 하나라도 다르면 확인 필요) */
function checkOf(x){
  const ev=x.ev, none=!x.lr||!x.ids.size;
  const grp=[]; Object.values(ev.groups).forEach(o=>{ if(o.cnt!==o.need) grp.push(semLabel(semKey(o.g.y,o.g.s))+' '+o.g.g+' ('+o.cnt+'/'+o.need+')'); });
  const pre=Object.keys(ev.pre).map(id=>CX.byId[id].n+' → '+ev.pre[id].join('·')+' 필요');
  const fails=none?[]:ev.rules.filter(r=>!r.ok&&!r.na);
  const badRules=fails.filter(r=>r.level!=='warn'), warnRules=fails.filter(r=>r.level==='warn');
  const bad=none||grp.length>0||pre.length>0||badRules.length>0;
  return {none,grp,pre,badRules,warnRules,bad,warn:!bad&&warnRules.length>0};
}

function renderSheet(P){
  if(!CUR){ P.innerHTML='<div class="card empty-msg">교육과정이 없습니다. 「교육과정 설정」에서 먼저 불러와 주세요.</div>'; return; }
  const F=ST.sheet=ST.sheet||{ban:DB.settings.ban||'',only:false};
  const bans=bansOf(DB.students);
  const all=studentMatrix(F.ban);
  const list=all.filter(x=>chipPass('sh',stOf(x)));
  const {cols,sems,grps}=sheetCols();
  const cnt=cols.map(c=>all.filter(x=>x.ids.has(c.r.id)).length), cmx=Math.max(1,...cnt);
  let h='<div class="card"><h2>선택 현황표 <span class="small muted">학생마다 가장 최근 상담 기준 · 선택한 과목은 1</span>'
    +'<span class="tail"><select id="sh-ban"><option value="">전체 반</option>'+bans.map(b=>'<option value="'+esc(b)+'"'+(b===F.ban?' selected':'')+'>'+esc(b)+'반</option>').join('')+'</select>'
    +heatSwitch()
    +'<button class="btn" id="sh-xls" title="지금 현황표를 엑셀(학생입력 형식)로 받습니다. 1을 고쳐 다시 올릴 수 있습니다">엑셀로 내려받기</button><button class="btn pri" id="sh-up" title="1 표시를 고친 엑셀을 올리면, 과목이 바뀐 학생만 오늘 날짜 상담일지가 생깁니다">엑셀 올려서 반영</button></span></h2>'
    +statusChips('sh',all.map(stOf),true)
    +'<p class="small muted" style="margin-bottom:8px"><b>1</b> = 선택 · <span class="lg lg-grp"></span> 묶음 선택 개수가 맞지 않는 칸 · <span style="color:var(--bad);font-weight:800">1</span> = 선이수 과목을 고르지 않음 · 학생 이름을 누르면 학생별 기록으로 갑니다. '+list.length+'명</p>';
  if(!list.length){ P.innerHTML=h+'<div class="empty-msg">'+(all.length?'조건에 맞는 학생이 없습니다.':'아직 학생이 없습니다.')+'</div></div>'; bindSheet(P,[]); return; }
  h+='<div class="sheet-wrap"><table class="sheet"><thead>'
    +'<tr><th class="sk sk0" colspan="3" rowspan="2">학생 정보</th>'+sems.map(x=>'<th colspan="'+x.n+'" class="semh" style="background:'+semBg(x.k)+'">'+semLabel(x.k)+'</th>').join('')+'<th rowspan="4" class="tot">총<br>학점</th><th rowspan="4" class="tot">상태</th></tr>'
    +'<tr>'+grps.map(x=>'<th colspan="'+x.n+'" class="grph" style="background:'+semBg(x.sem)+'" title="'+esc(grpLabel(x.g)+' 묶음 · '+x.g.need+'과목을 고릅니다')+'">'+esc(grpShort(x.g))+'</th>').join('')+'</tr>'
    +'<tr><th class="sk sk0 cnth" colspan="3">선택 인원</th>'+cnt.map((n,i)=>'<th class="cnt" style="'+heatBg(n,cmx)+'" data-c="'+i+'" title="'+esc(cols[i].r.n)+' — '+n+'명 선택">'+n+'</th>').join('')+'</tr>'
    +'<tr><th class="sk sk1">반</th><th class="sk sk2">번호</th><th class="sk sk3">이름</th>'+cols.map((c,i)=>'<th data-c="'+i+'" class="subj'+(i&&cols[i-1].g!==c.g?' gstart':'')+'" title="'+esc(c.r.n+' · '+c.r.t+' · '+c.r.c+'학점')+'"><span>'+esc(c.r.n)+'</span></th>').join('')+'</tr>'
    +'</thead><tbody>';
  const rowsH=[];
  list.forEach(x=>{
    const ck=checkOf(x);
    let h='<tr><td class="sk sk1">'+esc(x.s.b||'')+'</td><td class="sk sk2">'+esc(x.s.no||'')+'</td><td class="sk sk3"><a href="#" data-go="'+esc(x.s.id)+'">'+esc(dn(x.s.name))+'</a></td>';
    cols.forEach((c,i)=>{
      const on=x.ids.has(c.r.id);
      const go=x.ev.groups[c.g.key]; const gbad=!ck.none&&go&&go.cnt!==go.need;
      const pbad=on&&x.ev.pre[c.r.id];
      const cls=(on?'on':'')+(gbad?' grp':'')+(pbad?' pre':'')+(i&&cols[i-1].g!==c.g?' gstart':'');
      h+='<td data-c="'+i+'" class="'+cls.trim()+'"'+(on?' style="background:'+(gbad?'':semBg(c.sem))+'"':'')+(pbad?' title="선이수 미선택: '+esc(x.ev.pre[c.r.id].join(', '))+'"':'')+'>'+(on?'1':'')+'</td>';
    });
    const tip=ck.none?'상담 전':[ck.badRules.concat(ck.warnRules).map(r=>r.val!=null?r.rule.name+' '+r.val+ruleUnit(r.rule)+'('+r.why+')':r.rule.name+': '+r.why).join(', '),ck.pre.join(', '),ck.grp.join(', ')].filter(Boolean).join(' / ');
    h+='<td class="tot">'+(x.lr?x.ev.total:'')+'</td><td class="tot" title="'+esc(tip||'이상 없음')+'">'+(ck.none?'<span class="pill p-mute">– 상담 전</span>':ck.bad?'<span class="pill p-bad">! 확인</span>':ck.warn?'<span class="pill p-warn">… 권장</span>':'<span class="pill p-ok">✓ 정상</span>')+'</td></tr>';
    rowsH.push(h);
  });
  h+=rowsH.slice(0,60).join('')+'</tbody></table></div></div>';
  P.innerHTML=h; bindSheet(P,list);
  progressive(P.querySelector('table.sheet tbody'),rowsH,60);
}
function bindSheet(P,list){
  const F=ST.sheet;
  $('#sh-ban').onchange=e=>{ F.ban=e.target.value; renderSheet(P); };
  bindChips(P,()=>renderSheet(P)); bindHeat(()=>renderSheet(P));
  $('#sh-xls').onclick=()=>exportPickSheet(list||[]);
  $('#sh-up').onclick=()=>$('#f-pick').click();
  /* 십자 강조: 마우스를 올린 칸의 학생 줄 + 과목 열 */
  const tb=P.querySelector('table.sheet');
  if(tb){
    let xs=$('#xh'); if(!xs){ xs=document.createElement('style'); xs.id='xh'; document.head.appendChild(xs); }
    let last=null;
    tb.onmouseover=e=>{ const c=e.target.closest('[data-c]'); const k=c?c.dataset.c:null; if(k===last) return; last=k;
      xs.textContent=k==null?'':'table.sheet [data-c="'+k+'"]{box-shadow:inset 0 0 0 999px rgba(107,123,224,.13);} table.sheet tbody tr:hover td[data-c="'+k+'"]{outline:2px solid var(--acc);outline-offset:-2px;}'; };
    tb.onmouseleave=()=>{ last=null; xs.textContent=''; };
  }
  P.onclick=e=>{ const a=e.target.closest('[data-go]'); if(!a) return; e.preventDefault(); ST.stuSel=a.dataset.go; setTab('student'); };
}

const CHECK_TYPES={sum:'과목 수·학점 기준',ifthen:'조건 선택',career:'진로 연계 권장'};
function renderCheck(P){
  if(!CUR){ P.innerHTML='<div class="card empty-msg">교육과정이 없습니다. 「교육과정 설정」에서 먼저 불러와 주세요.</div>'; return; }
  const F=ST.check=ST.check||{ban:DB.settings.ban||'',only:false};
  const bans=bansOf(DB.students);
  const all=studentMatrix(F.ban).map(x=>Object.assign(x,{ck:checkOf(x)}));
  const ckSt=x=>stOf(x);   /* 다른 탭과 같은 상태 기준 (상담 전은 따로 셈) */
  const SO={bad:0,warn:1,ok:2,none:3};
  const list=sortList(all.filter(x=>chipPass('ck',ckSt(x))),'ck',{no:x=>BANNO(x.s),name:x=>x.s.name,date:x=>x.lr?x.lr.date:'',n:x=>x.lr?x.ids.size:'',cr:x=>x.lr?x.ev.total:'',st:x=>SO[ckSt(x)]});
  const rules=curRules(), checks=curChecks();
  const failN=c=>all.filter(x=>!x.ck.none&&x.ev.rules.some(r=>r.rule===c&&!r.ok&&!r.na)).length;
  const nNone=all.filter(x=>x.ck.none).length, nPre=all.filter(x=>!x.ck.none&&x.ck.pre.length).length, nGrp=all.filter(x=>!x.ck.none&&x.ck.grp.length).length, nBad=all.filter(x=>x.ck.bad).length, nWarn=all.filter(x=>x.ck.warn).length;
  const unk=[...new Set(CX.rows.flatMap(r=>r.preExt||[]))];

  /* 검증 규칙 관리 */
  let h='<div class="card"><h2>검증 규칙 <span class="small muted">기본 검증(선이수 위계 · 묶음 선택 개수)에 더해, 필요한 규칙을 직접 만들어 넣을 수 있습니다</span>'
    +'<span class="tail"><button class="btn" id="ck-mgr">'+(F.mgr?'접기':'규칙 관리 ('+checks.length+')')+'</button><button class="btn pri" id="ck-add">+ 새 검증 규칙</button></span></h2>';
  if(!F.mgr){
    h+='<div class="row">'+(checks.length?checks.map(c=>'<span class="pill '+(c.on===false?'p-mute':c.level==='warn'?'p-warn':'p-acc')+'" title="'+esc(checkDesc(c))+'">'+(c.on===false?'⏸ ':'')+esc(c.name)+'</span>').join(''):'<span class="small muted">아직 직접 만든 규칙이 없습니다. 「+ 새 검증 규칙」으로 추가해 보세요.</span>')+'</div>';
  }else{
    h+='<div class="row" style="margin-bottom:10px"><span class="small muted" style="font-weight:700">빠른 추가:</span>'
      +'<button class="btn" data-preset="sum">과목 수·학점 기준</button><button class="btn" data-preset="ifthen">A를 고르면 B도 필요</button><button class="btn" data-preset="none">동시 선택 금지</button><button class="btn" data-preset="career">진로 연계 권장</button></div>'
      +'<div class="scroll-x"><table class="tbl"><thead><tr><th style="width:44px">사용</th><th>규칙 이름</th><th>종류</th><th>내용</th><th>중요도</th><th class="num">해당 학생</th><th></th></tr></thead><tbody>'
      +'<tr class="muted"><td>✔</td><td><b>선이수(위계)</b></td><td>기본</td><td class="small">교육과정의 선이수과목을 고르지 않고 상위 과목을 고른 경우</td><td><span class="pill p-bad">위반</span></td><td class="num">'+nPre+'</td><td class="small">교육과정 양식에서 설정</td></tr>'
      +'<tr class="muted"><td>✔</td><td><b>묶음 선택 개수</b></td><td>기본</td><td class="small">학기 묶음마다 필요개수만큼 골랐는지</td><td><span class="pill p-bad">위반</span></td><td class="num">'+nGrp+'</td><td class="small">교육과정 양식에서 설정</td></tr>'
      +checks.map((c,i)=>'<tr'+(c.on===false?' style="opacity:.55"':'')+'><td><input type="checkbox" class="sw" data-on="'+i+'"'+(c.on===false?'':' checked')+' title="켜기/끄기"></td><td><b>'+esc(c.name)+'</b>'+(c.origin==='file'?'<br><span class="small muted">양식에서 불러옴</span>':'')+'</td><td class="small">'+esc(CHECK_TYPES[c.type||'sum'])+'</td><td class="small">'+esc(checkDesc(c))+'</td><td>'+(c.level==='warn'?'<span class="pill p-warn">권장</span>':'<span class="pill p-bad">위반</span>')+'</td><td class="num">'+(c.on===false||((c.type==='sum'||!c.type)&&!ruleCond(c))?'-':failN(c))+'</td>'
        +'<td style="white-space:nowrap"><button class="btn ghost" data-ed="'+i+'">수정</button><button class="btn ghost" data-cp="'+i+'">복제</button><button class="btn ghost" data-rm="'+i+'" style="color:var(--bad)">삭제</button></td></tr>').join('')
      +'</tbody></table></div>'
      +'<p class="small muted" style="margin-top:8px">규칙은 이 파일의 교육과정과 함께 저장되어 「배포용 파일 만들기」로 나눠 주는 파일에도 들어갑니다. 「과목 수·학점 기준」 규칙은 교육과정 양식(학점기준 시트)으로도 내려받아집니다. <b>위반</b> 규칙은 「확인 필요」로, <b>권장</b> 규칙은 참고 표시만 합니다.</p>';
  }
  h+='</div>';

  /* 결과 */
  h+='<div class="card"><h2>검증 결과 <span class="small muted">학생마다 가장 최근 상담 기준</span>'
    +'<span class="tail"><select id="ck-ban"><option value="">전체 반</option>'+bans.map(b=>'<option value="'+esc(b)+'"'+(b===F.ban?' selected':'')+'>'+esc(b)+'반</option>').join('')+'</select>'
    +'<button class="btn" id="ck-xls">검증 결과 엑셀로 내려받기</button></span></h2>'
    +statusChips('ck',all.map(ckSt),true,{warn:'미완료·권장',ok:'이상 없음'})
    /* 이유별 내역 — 칩의 「확인 필요」 학생이 어떤 이유인지 (한 학생이 여러 이유에 겹칠 수 있음) */
    +'<p class="small muted ck-why"><b>이유별</b> '+['선이수 위반 '+nPre+'명','묶음 선택 개수 불일치 '+nGrp+'명'].concat(rules.filter(c=>c.type!=='sum'&&c.type||ruleCond(c)).map(c=>esc(c.name)+' '+(c.level==='warn'?'해당 ':'위반 ')+failN(c)+'명')).join(' · ')
    +' <span class="sep">|</span> 칸 색: <span class="lg-c x-bad">위반</span> <span class="lg-c x-warn">권장</span> <span class="lg-c x-grp">묶음 개수</span> <span class="lg-c x-none">상담 전</span></p>'
    +(unk.length?'<p class="small muted" style="margin-bottom:6px">※ 선이수과목 중 교육과정 목록에 없어 검증에서 제외된 이름: '+unk.map(n=>'['+esc(n)+']').join(' ')+'</p>':'');
  if(!list.length){ P.innerHTML=h+'<div class="empty-msg">'+(all.length?'조건에 맞는 학생이 없습니다.':'아직 학생이 없습니다.')+'</div></div>'; bindCheck(P,list); return; }
  h+='<div class="scroll-x"><table class="tbl ck"><thead><tr>'+sortTh('ck','no','반')+'<th>번호</th>'+sortTh('ck','name','이름')+sortTh('ck','date','최근 상담')+sortTh('ck','n','선택<br>과목 수','num')+sortTh('ck','cr','선택<br>총 학점','num')
    +rules.map(c=>(c.type==='sum'||!c.type)?'<th class="num">'+esc(c.name)+'<br><span class="small muted">'+esc([c.base?'기본 '+c.base+' 포함':'',ruleCond(c)].filter(Boolean).join(' · ')||ruleUnit(c)+' 합계')+'</span></th>'
      :'<th>'+esc(c.name)+'<br><span class="small muted">'+esc(CHECK_TYPES[c.type])+'</span></th>').join('')
    +'<th>선이수(위계) 검증</th><th>묶음 선택 개수 점검<br><span class="small muted">학기 묶음: 선택/필요</span></th>'+sortTh('ck','st','종합')+'</tr></thead><tbody>';
  const rowsC=[];
  list.forEach(x=>{
    const c=x.ck, ev=x.ev;
    rowsC.push('<tr><td>'+esc(x.s.b||'')+'</td><td>'+esc(x.s.no||'')+'</td><td style="white-space:nowrap"><a href="#" data-go="'+esc(x.s.id)+'"><b>'+esc(dn(x.s.name))+'</b></a></td><td style="white-space:nowrap">'+esc(x.lr?x.lr.date:'-')+'</td>'
      +'<td class="num">'+x.ids.size+'</td><td class="num">'+ev.total+'</td>'
      +ev.rules.map(r=>{ const f=!c.none&&!r.ok&&!r.na; const cls=f?(r.level==='warn'?' x-warn':' x-bad'):'';
        return r.val!=null?'<td class="num'+cls+'" title="'+esc(r.why)+'">'+r.val+'</td>':'<td class="small'+cls+'">'+esc(c.none?'-':f?r.why:r.na?'해당 없음':'충족')+'</td>'; }).join('')
      +'<td class="'+(c.none?'x-none':c.pre.length?'x-bad':'')+'">'+esc(c.none?'판단 불가 (상담 전)':c.pre.length?c.pre.join(' / '):'충족')+'</td>'
      +'<td class="'+(c.none?'x-none':c.grp.length?'x-grp':'')+'">'+esc(c.none?'선택한 과목 없음':c.grp.length?c.grp.join(' / '):'정상')+'</td>'
      +'<td>'+(st=>st==='none'?'<span class="pill p-mute">– 상담 전</span>':st==='bad'?'<span class="pill p-bad">! 확인 필요</span>':st==='warn'?(ev.nUnder?'<span class="pill p-warn">… 미완료</span>':'<span class="pill p-warn">… 권장 확인</span>'):'<span class="pill p-ok">✓ 이상 없음</span>')(ckSt(x))+'</td></tr>');
  });
  h+=rowsC.slice(0,60).join('')+'</tbody></table></div></div>';
  P.innerHTML=h; bindCheck(P,list);
  const tbs=P.querySelectorAll('table.tbl tbody'); progressive(tbs[tbs.length-1],rowsC,60);
}
function bindCheck(P,list){
  const F=ST.check;
  $('#ck-ban').onchange=e=>{ F.ban=e.target.value; renderCheck(P); };
  bindChips(P,()=>renderCheck(P)); bindSort(P,()=>renderCheck(P));
  $('#ck-xls').onclick=()=>exportCheck(list);
  $('#ck-mgr').onclick=()=>{ F.mgr=!F.mgr; renderCheck(P); };
  $('#ck-add').onclick=()=>openCheckEditor(null,'sum');
  $$('[data-preset]').forEach(b=>b.onclick=()=>openCheckEditor(null,b.dataset.preset));
  const C=curChecks();
  $$('[data-on]').forEach(b=>b.onchange=()=>{ C[+b.dataset.on].on=b.checked; save(); renderCheck(P); });
  $$('[data-ed]').forEach(b=>b.onclick=()=>openCheckEditor(+b.dataset.ed));
  $$('[data-cp]').forEach(b=>b.onclick=()=>{ const c=JSON.parse(JSON.stringify(C[+b.dataset.cp])); c.id=uid('k'); c.name+=' (복사)'; c.origin='user'; C.splice(+b.dataset.cp+1,0,c); save(); renderCheck(P); toast('복제했습니다'); });
  $$('[data-rm]').forEach(b=>b.onclick=async()=>{ const c=C[+b.dataset.rm]; if(!(await ask({title:'검증 규칙 삭제',msg:'<p>「'+esc(c.name)+'」 규칙을 삭제할까요?</p>',ok:'삭제',danger:true}))) return; const snap=snapDB(); C.splice(+b.dataset.rm,1); save(); renderCheck(P); undoToast('「'+c.name+'」 규칙을 삭제했습니다',snap); });
  P.onclick=e=>{ const a=e.target.closest('[data-go]'); if(!a) return; e.preventDefault(); ST.stuSel=a.dataset.go; setTab('student'); };
}

/* ---------- 검증 규칙 편집기 ---------- */
function pickerHtml(id,sel){
  const S=new Set((sel||[]).map(normName));
  const ups=[]; CX.rows.forEach(r=>{ if(!ups.includes(r.up)) ups.push(r.up); });
  return '<div class="picker" id="'+id+'"><div class="pk-quick"><span class="small muted">계열로 한 번에:</span>'+ups.map(u=>'<button type="button" class="btn ghost pk-up" data-up="'+esc(u)+'">'+esc(u)+'</button>').join('')
    +'<button type="button" class="btn ghost pk-clear" style="color:var(--bad)">모두 해제</button><span class="pk-count small"></span></div>'
    +'<div class="pk-grid">'+CX.sems.map(k=>'<div class="pk-col"><b>'+semLabel(k)+'</b>'+CX.rows.filter(r=>semKey(r.y,r.s)===k).map(r=>'<label class="pk-it"><input type="checkbox" value="'+esc(r.n)+'" data-up="'+esc(r.up)+'"'+(S.has(normName(r.n))?' checked':'')+'> '+esc(r.n)+'</label>').join('')+'</div>').join('')+'</div></div>';
}
function bindPicker(root,onChange){
  const boxes=()=>[...root.querySelectorAll('input[type=checkbox]')];
  const upd=()=>{ const n=new Set(boxes().filter(b=>b.checked).map(b=>b.value)).size; root.querySelector('.pk-count').textContent=n+'과목 선택'; onChange&&onChange(); };
  boxes().forEach(b=>b.onchange=()=>{ boxes().filter(x=>x.value===b.value).forEach(x=>x.checked=b.checked); upd(); });
  root.querySelectorAll('.pk-up').forEach(btn=>btn.onclick=()=>{ const L=boxes().filter(b=>b.dataset.up===btn.dataset.up); const on=!L.every(b=>b.checked); L.forEach(b=>b.checked=on); upd(); });
  root.querySelector('.pk-clear').onclick=()=>{ boxes().forEach(b=>b.checked=false); upd(); };
  upd();
}
function pickerVal(root){ return [...new Set([...root.querySelectorAll('input[type=checkbox]')].filter(b=>b.checked).map(b=>b.value))]; }
function openCheckEditor(idx,preset){
  const C=curChecks(); if(!CUR.checks) CUR.checks=C;
  const isNew=idx==null;
  const base={sum:{type:'sum',name:'',level:'bad',measure:'credit',subjects:[],base:0,lo:'',loStrict:false,hi:''},
    ifthen:{type:'ifthen',name:'',level:'bad',subjects:[],then:[],mode:'all'},
    none:{type:'ifthen',name:'동시 선택 금지',level:'bad',subjects:[],then:[],mode:'none'},
    career:{type:'career',name:'',level:'warn',keywords:'',then:[],mode:'any'}};
  const c=JSON.parse(JSON.stringify(isNew?base[preset||'sum']:C[idx]));
  const num=v=>v==null?'':v;
  const body='<div class="ce">'
    +'<div class="form-grid"><div class="fld c6"><label>규칙 이름</label><input id="ce-name" value="'+esc(c.name)+'" placeholder="예: 국영수 15학점 이하, 과학 진로선택 2과목 이상"></div>'
    +'<div class="fld c3"><label>종류</label><select id="ce-type">'+Object.entries(CHECK_TYPES).map(([k,v])=>'<option value="'+k+'"'+(k===(c.type||'sum')?' selected':'')+'>'+v+'</option>').join('')+'</select></div>'
    +'<div class="fld c3"><label>중요도</label><select id="ce-level"><option value="bad"'+(c.level!=='warn'?' selected':'')+'>위반 (확인 필요로 집계)</option><option value="warn"'+(c.level==='warn'?' selected':'')+'>권장 (참고 표시)</option></select></div></div>'
    /* sum */
    +'<div class="ce-sec" data-sec="sum"><p class="ce-h">① 대상 과목을 고르세요</p>'+pickerHtml('pk-sum',c.type==='sum'?c.subjects:[])
    +'<p class="ce-h">② 기준</p><div class="row"><select id="ce-measure"><option value="credit"'+(c.measure!=='count'?' selected':'')+'>학점 합</option><option value="count"'+(c.measure==='count'?' selected':'')+'>과목 수</option></select>'
    +'<span class="small">기본값</span><input id="ce-base" type="number" style="width:70px" value="'+esc(num(c.base))+'" title="이미 이수한 공통과목 학점 등, 합계에 더할 값">'
    +'<span class="small">최소</span><input id="ce-lo" type="number" style="width:70px" value="'+esc(num(c.lo))+'"><select id="ce-strict"><option value="0"'+(c.loStrict?'':' selected')+'>이상</option><option value="1"'+(c.loStrict?' selected':'')+'>초과</option></select>'
    +'<span class="small">최대</span><input id="ce-hi" type="number" style="width:70px" value="'+esc(num(c.hi))+'"><span class="small">이하</span></div>'
    +'<p class="small muted" style="margin-top:4px">비워 둔 칸은 판정하지 않습니다. 예) 국영수 과목 학점 합 최대 15 · 과학 진로선택 과목 수 최소 2 · 기본값 = 이미 이수한 학점(예: 공통과목 4)</p></div>'
    /* ifthen */
    +'<div class="ce-sec" data-sec="ifthen"><p class="ce-h">① 조건 과목 — 이 중 하나라도 고르면</p>'+pickerHtml('pk-if',c.type==='ifthen'?c.subjects:[])
    +'<p class="ce-h">② 그러면 아래 과목을 <select id="ce-mode-if"><option value="all"'+(c.mode==='all'?' selected':'')+'>모두 골라야 함</option><option value="any"'+(c.mode==='any'?' selected':'')+'>하나 이상 골라야 함</option><option value="none"'+(c.mode==='none'?' selected':'')+'>고르면 안 됨 (동시 선택 금지)</option></select></p>'
    +pickerHtml('pk-then',c.type==='ifthen'?c.then:[])+'</div>'
    /* career */
    +'<div class="ce-sec" data-sec="career"><p class="ce-h">① 희망 진로·학과에 이 낱말이 들어 있으면 (쉼표로 여러 개)</p><input id="ce-kw" style="width:100%" value="'+esc(c.keywords||'')+'" placeholder="예: 간호, 의예, 약학, 보건">'
    +'<p class="ce-h">② 아래 과목을 <select id="ce-mode-car"><option value="any"'+(c.mode!=='all'?' selected':'')+'>하나 이상</option><option value="all"'+(c.mode==='all'?' selected':'')+'>모두</option></select> 고르도록 권장</p>'
    +pickerHtml('pk-car',c.type==='career'?c.then:[])+'</div>'
    +'<div class="ce-preview" id="ce-prev"></div></div>';
  const M=modal(isNew?'새 검증 규칙':'검증 규칙 수정',body,[{label:'취소'},{label:'저장',cls:'pri',fn:()=>{
    const r=collect(); const err=validate(r); if(err){ toast(err); return false; }
    if(isNew) C.push(r); else C[idx]=r;
    save(); render(); toast('「'+r.name+'」 규칙을 저장했습니다');
  }}],{wide:true});
  const root=M.el;
  const collect=()=>{
    const t=root.querySelector('#ce-type').value;
    const r={id:c.id||uid('k'),name:root.querySelector('#ce-name').value.trim(),on:c.on!==false,level:root.querySelector('#ce-level').value,type:t,origin:c.origin||'user'};
    const nv=id=>{ const v=root.querySelector(id).value.trim(); return v===''?null:+v; };
    if(t==='sum') Object.assign(r,{subjects:pickerVal(root.querySelector('#pk-sum')),measure:root.querySelector('#ce-measure').value,base:nv('#ce-base')||0,lo:nv('#ce-lo'),loStrict:root.querySelector('#ce-strict').value==='1',hi:nv('#ce-hi')});
    if(t==='ifthen') Object.assign(r,{subjects:pickerVal(root.querySelector('#pk-if')),then:pickerVal(root.querySelector('#pk-then')),mode:root.querySelector('#ce-mode-if').value});
    if(t==='career') Object.assign(r,{keywords:root.querySelector('#ce-kw').value.trim(),then:pickerVal(root.querySelector('#pk-car')),mode:root.querySelector('#ce-mode-car').value});
    return r;
  };
  const validate=r=>{
    if(!r.name) return '규칙 이름을 적어 주세요';
    if(C.some((x,i)=>i!==idx&&x.name===r.name)) return '같은 이름의 규칙이 이미 있습니다';
    if(r.type==='sum'&&!r.subjects.length) return '대상 과목을 하나 이상 고르세요';
    if(r.type==='ifthen'&&(!r.subjects.length||!r.then.length)) return '조건 과목과 대상 과목을 모두 고르세요';
    if(r.type==='career'&&(!r.keywords||!r.then.length)) return '낱말과 권장 과목을 적어 주세요';
    return '';
  };
  const preview=()=>{
    const r=collect(); const box=root.querySelector('#ce-prev');
    const err=validate(Object.assign({},r,{name:r.name||'x'}));
    if(err&&err!=='같은 이름의 규칙이 이미 있습니다'){ box.innerHTML='<span class="muted">'+esc(err)+'</span>'; return; }
    const rows=studentMatrix('').filter(x=>x.lr&&x.ids.size);
    const hits=rows.filter(x=>{ const selRows=[...x.ids].map(id=>CX.byId[id]); const o=evalCheck(r,new Set(selRows.map(q=>normName(q.n))),selRows,{career:x.lr.career,major:x.lr.major}); return !o.ok&&!o.na; });
    box.innerHTML='<b>'+esc(checkDesc(r))+'</b><br>지금 기록 기준 '+(r.level==='warn'?'권장 대상':'위반')+' <b style="color:'+(hits.length?'var(--bad)':'var(--ok)')+'">'+hits.length+'명</b> / 상담한 학생 '+rows.length+'명'
      +(hits.length?' <span class="small muted">('+hits.slice(0,8).map(x=>esc(stuNo(x.s)+' '+dn(x.s.name))).join(', ')+(hits.length>8?' 외':'')+')</span>':'');
  };
  const showSec=()=>{ const t=root.querySelector('#ce-type').value; root.querySelectorAll('.ce-sec').forEach(d=>d.style.display=d.dataset.sec===t?'':'none'); preview(); };
  ['#pk-sum','#pk-if','#pk-then','#pk-car'].forEach(id=>bindPicker(root.querySelector(id),preview));
  root.querySelectorAll('.ce input, .ce select').forEach(el=>{ if(!el.closest('.picker')){ el.addEventListener('input',preview); el.addEventListener('change',preview); } });
  root.querySelector('#ce-type').addEventListener('change',showSec);
  showSec();
}
