/* =====================================================================
   나이스 「입학생 학교 교육과정 조회」 편성표 (.xlsx) 바로 읽기
   나이스 → 교육과정 → 입학생학교교육과정관리 → 입학생학교교육과정등록/검증 → 입학생 학교 교육과정 조회 → 엑셀 저장
   표 모양: 구분(학교지정/학생선택) · 교과영역 · 교과(군) · 과목구분 · 과목명 · 학년/학기별 학점 · 이수학점
   학생선택 행: 교과(군) 칸 = 선택 묶음 이름, 학기 칸 = 「택12학점」 (과목별 학점은 표에 없음 → 화면에서 확인)
   ===================================================================== */
function neisSemCols(yr,sr){
  const out=[]; let prev='';
  for(let c=0;c<Math.max(yr.length,sr.length);c++){
    const ym=String(yr[c]||'').match(/([1-3])\s*학년/), sm=String(sr[c]||'').match(/([12])\s*학기/);
    if(!ym||!sm){ prev=''; continue; }
    const k=ym[1]+'-'+sm[1]; if(k!==prev) out.push({c,y:+ym[1],s:+sm[1]}); prev=k;
  }
  return out;
}
function detectNeis(wb){
  let found=null;
  wb.eachSheet(ws=>{
    if(found) return;
    const R=sheetRows(ws);
    for(let r=0;r<Math.min(R.length,40);r++){
      const raw=(R[r]||[]).map(cellText), row=raw.map(t=>t.replace(/\s+/g,''));
      const iN=row.indexOf('과목명'), iG=row.indexOf('교과(군)'), iK=row.indexOf('구분');
      if(iN<0||iG<0||iK<0) continue;
      const sems=neisSemCols(raw,(R[r+1]||[]).map(cellText));
      if(sems.length<2) continue;
      found={ws,R,hr:r,iN,iG,iK,iT:row.indexOf('과목구분'),sems}; return;
    }
  });
  return found;
}
function parseNeis(N){
  const {R,hr,iN,iG,iK,iT,sems}=N;
  const groups={}, order=[], fixed=[], noPick=[], schools={};
  let title='';
  for(let r=0;r<R.length;r++){
    const a=(R[r]||[]).map(v=>cellText(v).trim());
    a.forEach(t=>{
      if(t.length<=30&&/(고등학교|학교)$/.test(t)&&!/지정|선택|^학교$/.test(t)) schools[t]=(schools[t]||0)+1;
      if(!title&&/편[성제]표|교육과정/.test(t)&&/학년도/.test(t)) title=t;
    });
    if(r<=hr+1) continue;
    const nm=(a[iN]||'').replace(/\s+/g,' ').trim();
    const kind=(a[iK]||'').replace(/\s+/g,'');
    if(!nm||nm.replace(/\s/g,'')==='과목명'||/소계|합계/.test(kind)) continue;
    if(/학교지정/.test(kind)){ if(!fixed.includes(nm)) fixed.push(nm); continue; }
    if(!/학생선택/.test(kind)) continue;
    const gname=(a[iG]||'').trim()||'학생선택';
    let hit=false;
    sems.forEach(sm=>{
      const m=(a[sm.c]||'').replace(/\s+/g,'').match(/택(\d+(?:\.\d+)?)(학점|과목|개)?/);
      if(!m) return;
      hit=true;
      const key=sm.y+'-'+sm.s+'|'+gname;
      let g=groups[key];
      if(!g){ g=groups[key]={key,y:sm.y,s:sm.s,g:gname,total:+m[1],unit:m[2]==='학점'?'credit':'count',subs:[]}; order.push(key); }
      if(!g.subs.some(x=>normName(x.n)===normName(nm))) g.subs.push({n:nm,t:normType(a[iT]||'')});
    });
    if(!hit&&!noPick.includes(nm)) noPick.push(nm);
  }
  const list=order.map(k=>groups[k]).sort((x,y)=>x.y-y.y||x.s-y.s);
  list.forEach(g=>{
    if(g.unit==='count'){ g.need=g.total; g.c=3; }
    else{ g.c=[3,4,2,5,1,6].find(c=>g.total%c===0&&g.total/c<=g.subs.length)||g.total; g.need=g.total/g.c; }
  });
  const school=Object.keys(schools).sort((x,y)=>schools[y]-schools[x])[0]||'';
  title=title?title.replace(/\s*(\d+\s*개년\s*)?교육과정\s*편[성제]표\s*$/,'').trim()+' 선택과목 상담':'';
  return {list,fixed,noPick,school,title};
}

function neisFlow(N,wb,fname){
  const P=parseNeis(N);
  if(!P.list.length){
    modal('나이스 편성표에서 선택 묶음을 찾지 못했습니다','<p>나이스 편성표 모양은 맞지만 「학생선택」 행에서 <b>택○학점</b> 표시를 찾지 못했습니다.</p><p class="small muted" style="margin-top:8px">「빈 양식 내려받기」로 받은 양식에 직접 적어 올려 주세요.</p>');
    return;
  }
  const row=(g,i)=>'<tr data-i="'+i+'"><td><input type="checkbox" class="nz-on sw" checked aria-label="넣기"></td><td><b>'+g.y+'-'+g.s+'</b></td><td>'+esc(g.g)+'</td>'
    +'<td class="small">택'+g.total+(g.unit==='credit'?'학점':'과목')+'</td>'
    +'<td class="small" title="'+esc(g.subs.map(x=>x.n).join(', '))+'">'+g.subs.length+'개 <span class="muted">('+esc(nameList(g.subs.map(x=>x.n),3))+')</span></td>'
    +'<td><input type="number" class="nz-c" min="1" max="12" step="1" value="'+g.c+'" style="width:58px"></td>'
    +'<td class="nz-need" style="white-space:nowrap"></td></tr>';
  const body='<p class="small" style="margin-bottom:8px">나이스 「입학생 학교 교육과정 조회」 편성표입니다. <b>학생선택 묶음 '+P.list.length+'개</b>를 찾았습니다'
      +(P.school?' · 학교: <b>'+esc(P.school)+'</b>':'')+'.</p>'
    +'<p class="small" style="margin-bottom:10px;background:var(--warn-bg,#fff7e0);padding:8px 10px;border-radius:8px">나이스 표에는 묶음 전체 학점(택12학점 등)만 있고 <b>과목 하나의 학점</b>은 없습니다. 「과목당 학점」을 확인해 주세요. 고를 과목 수는 자동으로 계산됩니다.</p>'
    +'<div class="scroll-x"><table class="tbl"><thead><tr><th>넣기</th><th>학기</th><th>선택 묶음</th><th>나이스 표시</th><th>과목</th><th>과목당 학점</th><th>고를 과목 수</th></tr></thead><tbody>'
    +P.list.map(row).join('')+'</tbody></table></div>'
    +'<p class="small muted" style="margin-top:10px">· 「학교지정」 과목 '+P.fixed.length+'개('+esc(nameList(P.fixed,3))+')는 모든 학생이 듣는 과목이라 상담 선택 목록에서 뺐습니다.'
    +(P.noPick.length?'<br>· 학생선택 행이지만 「택○학점」 표시가 없어 뺀 과목: '+esc(P.noPick.join(', ')):'')
    +'<br>· 이미 지난 학기 묶음은 「넣기」를 끄면 상담 화면에서 빠집니다.'
    +'<br>· 과목당 학점·택 수·선이수과목은 적용한 뒤 「과목 표 → 표에서 바로 고치기」에서도 고칠 수 있습니다.</p>';
  const m=modal('나이스 편성표 확인',body,[{label:'취소'},{label:'다음',cls:'pri',fn:(el)=>{
    const picked=[]; let bad='';
    el.querySelectorAll('tbody tr').forEach(tr=>{
      if(!tr.querySelector('.nz-on').checked) return;
      const g=P.list[+tr.dataset.i]; const c=+tr.querySelector('.nz-c').value;
      const need=g.unit==='credit'?g.total/c:g.total;
      if(!(c>0)||!Number.isInteger(need)||need<1||need>g.subs.length){ bad=bad||g.y+'-'+g.s+' 「'+g.g+'」'; return; }
      picked.push(Object.assign({},g,{c,need}));
    });
    if(bad){ toast(bad+' 묶음의 과목당 학점을 확인해 주세요 (고를 과목 수가 맞지 않음)'); return false; }
    if(!picked.length){ toast('넣을 묶음을 하나 이상 골라 주세요'); return false; }
    setTimeout(()=>neisApply(P,picked,wb,fname),0);
  }}],{wide:true});
  const paint=()=>m.el.querySelectorAll('tbody tr').forEach(tr=>{
    const g=P.list[+tr.dataset.i]; const c=+tr.querySelector('.nz-c').value; const on=tr.querySelector('.nz-on').checked;
    const need=g.unit==='credit'?g.total/c:g.total;
    const ok=c>0&&Number.isInteger(need)&&need>=1&&need<=g.subs.length;
    tr.style.opacity=on?'':'.45';
    tr.querySelector('.nz-need').innerHTML=!on?'<span class="muted">빼기</span>':ok?'<b>'+need+'과목</b>'+(g.unit==='credit'?' <span class="muted small">('+need+'×'+c+'='+g.total+')</span>':''):'<span class="pill p-bad">안 맞음</span>';
  });
  m.el.querySelectorAll('.nz-c,.nz-on').forEach(x=>x.oninput=x.onchange=paint);
  paint();
}

/* 확인한 묶음 → 이 앱 양식(교육과정 시트) 모양의 워크북으로 바꿔 기존 인식 과정을 그대로 탐 */
function neisApply(P,picked,wb,fname){
  const w2=new ExcelJS.Workbook(); const ws=w2.addWorksheet('교육과정');
  ws.getRow(1).values=['제목',P.title||String(fname||'').replace(/\.[^.]+$/,'')];
  ws.getRow(2).values=['학교명',schoolName()||P.school];
  ws.getRow(5).values=['과목명','학년','학기','학점','선택그룹','필요개수','유형','비고'];
  let r=6;
  picked.forEach(g=>g.subs.forEach(x=>{ ws.getRow(r++).values=[x.n,g.y,g.s,g.c,g.g,g.need,x.t||null,'나이스: 택'+g.total+(g.unit==='credit'?'학점':'과목')]; }));
  const res=parseCurriculum(w2,fname);
  if(res.ok){
    res.cur.sheet='나이스 편성표';
    /* 행 번호는 내부 변환표 기준이라 지우고, 안내 문구를 나이스 사용자에 맞게 */
    res.cur.issues=res.cur.issues.filter(x=>!/시트 \d+행을 머리글로 인식/.test(x.msg)).map(x=>Object.assign({},x,{msg:x.msg.replace(/^\d+행 /,'').replace('양식에 직접 적어 주세요.','필요하면 2단계 「양식으로 받기」로 받아 적어 주세요.')}));
    res.cur.issues.unshift({lv:'i',msg:'나이스 편성표에서 학생선택 묶음 '+picked.length+'개를 읽었습니다 (학교지정 과목 '+P.fixed.length+'개는 제외).'});
  }
  showCurResult(res,wb,fname);
}
