/* =====================================================================
   엑셀 입출력 · 파일 합치기 · 배포본 · 인쇄
   ===================================================================== */
async function loadWB(file){
  return withBusy('「'+file.name+'」 읽는 중…',async()=>{
    const wb=new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    return wb;
  });
}
async function downloadWB(wb,fname){
  const buf=await withBusy('엑셀 파일 만드는 중…',()=>wb.xlsx.writeBuffer());
  downloadBlob(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),fname);
}
function downloadBlob(blob,fname){
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fname;
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500);
}
const XS={
  head:{font:{bold:true,color:{argb:'FFFFFFFF'},size:10},fill:{type:'pattern',pattern:'solid',fgColor:{argb:'FF2B56C6'}},alignment:{vertical:'middle',horizontal:'center',wrapText:true}},
  border:{top:{style:'thin',color:{argb:'FFCFD4DC'}},left:{style:'thin',color:{argb:'FFCFD4DC'}},bottom:{style:'thin',color:{argb:'FFCFD4DC'}},right:{style:'thin',color:{argb:'FFCFD4DC'}}}
};
function styleHeader(row){ row.eachCell(c=>{ c.font=XS.head.font; c.fill=XS.head.fill; c.alignment=XS.head.alignment; c.border=XS.border; }); row.height=22; }
function addTable(ws,headers,rows,widths){
  styleHeader(ws.addRow(headers));
  rows.forEach(r=>{ const row=ws.addRow(r); row.eachCell({includeEmpty:true},c=>{ c.border=XS.border; c.alignment={vertical:'top',wrapText:true}; }); });
  (widths||[]).forEach((w,i)=>ws.getColumn(i+1).width=w);
  ws.views=[{state:'frozen',ySplit:ws.lastRow?1:0}];
}

/* ---------- 교육과정 양식 ---------- */
const TPL_COLS=[
  ['과목명',24,'필수'],['학년',7,'필수 · 1~3'],['학기',7,'필수 · 1~2'],['학점',7,'필수 · 숫자'],
  ['선택그룹',18,'필수 · 같은 학기에 함께 고르는 묶음 이름'],['필요개수',9,'필수 · 그 묶음에서 고를 개수'],
  ['유형',11,'비우면 자동'],['계열(상위)',11,'비우면 자동'],['계열(하위)',11,'비우면 자동'],
  ['연계과목',22,'쉼표로 구분 · 한쪽만 적어도 양쪽 표시'],['선이수과목',24,'쉼표로 구분 · 먼저 들어야 하는 과목'],['학점기준 영역',16,'쉼표로 구분 · 「학점기준」 시트의 영역 이름'],['비고',16,'자유 메모']
];
async function exportCurTemplate(filled){
  const wb=new ExcelJS.Workbook(); wb.creator=APP_NAME;
  /* 안내 */
  const g=wb.addWorksheet('안내',{properties:{tabColor:{argb:'FF2B56C6'}}});
  g.getColumn(1).width=4; g.getColumn(2).width=110;
  const lines=[
    [APP_NAME+' — 교육과정 양식 작성 안내',1],
    ['※ 나이스(교육과정 → 입학생학교교육과정관리 → 입학생학교교육과정등록/검증 → 입학생 학교 교육과정 조회)에서 내려받은 엑셀은 이 양식에 옮겨 적지 않고 앱에 그대로 올려도 됩니다. 과목당 학점만 화면에서 확인하면 됩니다.',0],
    ['',0],
    ['① 「교육과정」 시트의 1행 제목과 2행 학교명을 적습니다. 제목은 화면 위쪽에 표시되고, 학교명을 비워 두면 앱의 「교육과정 설정 → 학교 정보」에 적힌 학교명을 그대로 씁니다.',0],
    ['② 6행부터 과목을 한 줄에 하나씩 적습니다. 필수: 과목명 · 학년 · 학기 · 학점 · 선택그룹 · 필요개수',0],
    ['③ 선택그룹: 같은 학기에 함께 놓고 고르는 과목 묶음의 이름입니다 (예: 국영수, 탐구, 정보/한문/교양).',0],
    ['    같은 학기·같은 학점·같은 선택그룹의 과목이 하나의 「택N」 묶음이 됩니다. 같은 학기 안에서 고를 개수가 다르면 그룹 이름을 다르게 적어 주세요 (예: 탐구A, 탐구B).',0],
    ['④ 필요개수: 그 묶음에서 골라야 하는 과목 수입니다. 같은 묶음의 모든 행에 같은 숫자를 적어 주세요.',0],
    ['⑤ 유형·계열(상위)·계열(하위)는 비워 두면 「과목마스터(참고)」 시트의 2022 개정 과목 목록에서 자동으로 채웁니다. 목록에 없는 과목만 직접 적으면 됩니다.',0],
    ['⑥ 연계과목: 함께 들으면 좋은 과목을 쉼표로 적습니다. 한쪽에만 적어도 양쪽 과목 모두에 표시됩니다.',0],
    ['⑦ 선이수과목: 이 과목을 고르려면 먼저 들어야 하는 과목을 쉼표로 적습니다. 상담할 때 미선택이면 빨간색으로 알려 줍니다.',0],
    ['⑧ 5행 머리글의 이름은 바꾸지 마세요. 열 순서를 바꾸거나 다른 열을 추가하는 것은 괜찮습니다.',0],
    ['⑨ 과목명은 띄어쓰기·로마숫자(Ⅰ/1)가 달라도 같은 과목으로 인식합니다.',0],
    ['⑩ (선택) 학점 기준: 「학점기준」 시트에 영역 이름과 기준(최소·초과·최대 학점, 기본학점)을 적고, 교육과정 시트의 「학점기준 영역」 열에 그 과목이 속한 영역 이름을 적습니다.',0],
    ['    예) 국영수 — 최대 15 → 국영수 영역 과목 학점 합이 15를 넘으면 위반 / 정보/한문/교양 — 초과 8 → 8학점보다 많아야 충족 / 과학·정보 — 기본학점 4 (이미 이수한 공통과목 학점 포함)',0],
    ['    「검증 결과」 탭과 상담 화면에서 학생별 영역 학점과 위반 여부를 보여 줍니다.',0],
    ['    「조건 선택(A를 고르면 B 필요·동시 선택 금지)」「진로 연계 권장」 규칙은 앱의 「검증 결과 → 검증 규칙」에서 만들며, 양식을 다시 올려도 그대로 유지됩니다.',0],
    ['',0],
    ['예시',1]
  ];
  lines.forEach(([t,b])=>{ const r=g.addRow(['',t]); r.getCell(2).font={bold:!!b,size:b?13:10.5}; r.getCell(2).alignment={wrapText:true,vertical:'top'}; });
  const ex=[['과목명','학년','학기','학점','선택그룹','필요개수','연계과목','선이수과목'],['물리학',2,1,3,'탐구',3,'',''],['화학',2,1,3,'탐구',3,'',''],['역학과 에너지',2,2,3,'탐구',3,'','물리학'],['전자기와 양자',3,1,3,'탐구',3,'','물리학, 역학과 에너지'],['주제 탐구 독서',2,1,3,'국영수',1,'독서 토론과 글쓰기','']];
  ex.forEach((r,i)=>{ const row=g.addRow(['',r.join('   |   ')]); row.getCell(2).font={name:'Consolas',size:10,bold:i===0,color:{argb:i===0?'FF2B56C6':'FF333333'}}; });

  /* 교육과정 */
  const ws=wb.addWorksheet('교육과정',{properties:{tabColor:{argb:'FFF2B33D'}}});
  ws.getCell('A1').value='제목'; ws.getCell('B1').value=filled&&CUR?CUR.title:'2027학년도 2학년 선택과목 상담';
  ws.getCell('A2').value='학교명'; ws.getCell('B2').value=schoolName();
  ['A1','A2'].forEach(a=>{ const c=ws.getCell(a); c.font={bold:true}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE8EEFB'}}; c.alignment={horizontal:'center'}; });
  ws.mergeCells('B1:F1'); ws.mergeCells('B2:F2');
  ['B1','B2'].forEach(a=>{ const c=ws.getCell(a); c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF6D8'}}; c.font={bold:true,size:12}; });
  ws.getCell('A3').value='※ 5행 머리글 이름은 바꾸지 마세요. 필수 열: 과목명·학년·학기·학점·선택그룹·필요개수 (유형·계열은 비우면 자동)';
  ws.getCell('A3').font={size:9,color:{argb:'FF8A6100'}};
  const hint=ws.getRow(4); TPL_COLS.forEach((c,i)=>{ const cell=hint.getCell(i+1); cell.value=c[2]; cell.font={size:8.5,color:{argb:'FF68707D'}}; cell.alignment={wrapText:true,vertical:'bottom'}; });
  hint.height=34;
  const hr=ws.getRow(5); TPL_COLS.forEach((c,i)=>{ hr.getCell(i+1).value=c[0]; ws.getColumn(i+1).width=c[1]; });
  styleHeader(hr);
  [7,8,9,10,11,12,13].forEach(i=>hr.getCell(i).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF7C8BB0'}});
  const data=filled&&CUR?CX.rows.map(r=>[r.n,r.y,r.s,r.c,r.g,r.need,r.t==='미분류'?'':r.t,r.up==='미분류'?'':r.up,r.lo==='미분류'?'':r.lo,(r.link||[]).join(', '),(r.pre||[]).concat(r.preExt||[]).join(', '),curChecks().filter(c=>c.type==='sum'&&(c.subjects||[]).some(n=>normName(n)===normName(r.n))).map(c=>c.name).join(', '),r.note||'']):[];
  const last=Math.max(300,data.length+100);
  for(let i=0;i<last;i++){
    const row=ws.getRow(6+i);
    if(data[i]) data[i].forEach((v,ci)=>row.getCell(ci+1).value=v===''?null:v);
    for(let ci=1;ci<=TPL_COLS.length;ci++){ row.getCell(ci).border=XS.border; }
  }
  const L=5+last;
  ws.dataValidations.add('B6:B'+L,{type:'list',allowBlank:true,formulae:['"1,2,3"'],showErrorMessage:true,errorTitle:'학년',error:'1, 2, 3 중에서 고르세요'});
  ws.dataValidations.add('C6:C'+L,{type:'list',allowBlank:true,formulae:['"1,2"'],showErrorMessage:true,errorTitle:'학기',error:'1 또는 2를 고르세요'});
  ws.dataValidations.add('D6:D'+L,{type:'whole',operator:'between',allowBlank:true,formulae:[1,10],showErrorMessage:true,errorTitle:'학점',error:'1~10 사이 숫자를 적으세요'});
  ws.dataValidations.add('F6:F'+L,{type:'whole',operator:'between',allowBlank:true,formulae:[1,20],showErrorMessage:true,errorTitle:'필요개수',error:'1 이상 숫자를 적으세요'});
  ws.dataValidations.add('G6:G'+L,{type:'list',allowBlank:true,formulae:['"일반선택,진로선택,융합선택"']});
  ws.views=[{state:'frozen',ySplit:5}];

  /* 학점 기준 */
  const rs=wb.addWorksheet('학점기준',{properties:{tabColor:{argb:'FF17784A'}}});
  rs.getCell('A1').value='학점 기준 (선택) — 영역별 학점 하한·상한 점검'; rs.getCell('A1').font={bold:true,size:13};
  rs.getCell('A2').value='교육과정 시트 「학점기준 영역」 열에 적은 이름과 같게 적으세요. 학생이 고른 과목 중 그 영역 과목의 학점 합(+기본학점)을 기준과 비교합니다. 비워 두면 점검하지 않습니다.';
  rs.getCell('A2').font={size:9.5,color:{argb:'FF68707D'}};
  rs.getCell('A3').value='예) 국영수 | 0 | | | 15   ·   정보/한문/교양 | 0 | | 8 |   ·   과학·정보 | 4 | 20 | |';
  rs.getCell('A3').font={size:9.5,color:{argb:'FF8A6100'}};
  const RH=['영역 이름','기본학점','최소(이상)','초과(이 값보다 커야 함)','최대(이하)','세는 방법(학점/과목 수)','설명'];
  const rh=rs.getRow(5); RH.forEach((t,i)=>rh.getCell(i+1).value=t); styleHeader(rh);
  [18,10,11,20,11,14,44].forEach((w,i)=>rs.getColumn(i+1).width=w);
  const nn=v=>v===''||v==null?null:+v;
  const rr=filled&&CUR?curChecks().filter(c=>c.type==='sum'||!c.type).map(c=>[c.name,c.base||null,c.loStrict?null:nn(c.lo),c.loStrict?nn(c.lo):null,nn(c.hi),c.measure==='count'?'과목 수':'학점',c.on===false?'(꺼 둔 규칙)':null]):[];
  for(let i=0;i<Math.max(12,rr.length+5);i++){ const row=rs.getRow(6+i); if(rr[i]) rr[i].forEach((v,ci)=>row.getCell(ci+1).value=v); for(let ci=1;ci<=7;ci++) row.getCell(ci).border=XS.border; }
  rs.dataValidations.add('F6:F40',{type:'list',allowBlank:true,formulae:['"학점,과목 수"']});

  /* 과목 마스터 */
  const m=wb.addWorksheet('과목마스터(참고)');
  m.getCell('A1').value='2022 개정 교육과정 선택과목 목록 (참고용 · 이 시트는 수정해도 앱에 반영되지 않습니다)'; m.getCell('A1').font={bold:true};
  m.addRow([]);
  addTable(m,['과정구분','교과군','계열(상위)','계열(하위)','과목명','유형'],MASTER,[10,12,12,12,26,8]);
  m.views=[{state:'frozen',ySplit:3}];
  wb.views=[{activeTab:1}];
  await downloadWB(wb,filled?'curriculum_current.xlsx':'curriculum_template.xlsx');
  toast(filled?'현재 교육과정을 양식으로 내려받았습니다':'빈 양식을 내려받았습니다');
}

/* ---------- 교육과정 올리기 ---------- */
$('#f-cur').onchange=async e=>{
  const f=e.target.files[0]; e.target.value=''; if(!f) return;
  let wb; try{ wb=await loadWB(f); }catch(err){ console.warn(err); modal('파일을 읽지 못했습니다',(/\.xls$/i.test(f.name)?'예전 엑셀 형식(.xls) 파일입니다. 엑셀에서 열고 「다른 이름으로 저장 → Excel 통합 문서(.xlsx)」로 저장한 뒤 올려 주세요.':'엑셀(.xlsx/.xlsm) 파일인지 확인해 주세요.')+'<br><span class="small muted">'+esc(err.message||err)+'</span>'); return; }
  if(tryBackup(wb,f.name)) return;
  const nz=detectNeis(wb); if(nz){ neisFlow(nz,wb,f.name); return; }
  showCurResult(parseCurriculum(wb,f.name),wb,f.name);
};
function showCurResult(res,wb,fname){
  if(!res.ok){ modal('교육과정을 인식하지 못했습니다','<p>'+esc(res.msg)+'</p><p class="small muted" style="margin-top:8px">「빈 양식 내려받기」로 받은 양식을 쓰거나, 머리글 행에 과목명·학년·학기·학점·선택그룹·필요개수가 있는지 확인해 주세요.</p>'); return; }
  const c=res.cur; const ci=curIndex(c);
  const nE=c.issues.filter(x=>x.lv==='e').length, nW=c.issues.filter(x=>x.lv==='w').length;
  const dbSheet=findDbSheet(wb);
  const merged=mergeChecks(c);
  modal('교육과정 인식 결과',
    '<dl class="kv" style="margin-bottom:10px"><dt>제목</dt><dd>'+esc(c.title)+'</dd>'+((c.school||schoolName())?'<dt>학교</dt><dd>'+esc(c.school||schoolName())+(c.school?'':' <span class="muted">(설정값 유지)</span>')+'</dd>':'')+'<dt>과목</dt><dd>'+c.rows.length+'개 · 선택 묶음 '+Object.keys(ci.groups).length+'개</dd><dt>학기</dt><dd>'+ci.sems.map(semLabel).join(', ')+'</dd></dl>'
    +(nE||nW?'<p class="small" style="margin-bottom:6px">'+(nE?'<span class="pill p-bad">오류 '+nE+'</span> ':'')+(nW?'<span class="pill p-warn">확인 '+nW+'</span>':'')+' 아래 내용을 확인하세요. 엑셀에서 고쳐 다시 올려도 됩니다.</p>':'<p class="small" style="margin-bottom:6px"><span class="pill p-ok">문제 없음</span></p>')
    +issuesHtml(c.issues)
    +(DB.records.length?'<p class="small muted" style="margin-top:10px">기존 상담 기록 '+DB.records.length+'건은 그대로 두고, 과목 이름으로 새 교육과정에 다시 맞춥니다.</p>':'')
    +(dbSheet?'<p class="small" style="margin-top:8px">📎 이 파일에 상담 기록 시트(「'+esc(dbSheet.ws.name)+'」)도 있습니다. 적용 후 가져올지 묻겠습니다.</p>':''),
    [{label:'취소'},{label:'이 교육과정 적용',cls:'pri',fn:()=>{
      let keep=null; if(DRAFT){ keep=selToPicks([...DRAFT.sel],DRAFT.extra); }
      c.checks=merged; keepSchool(c);
      if(c.school&&!DB.settings.school) DB.settings.school=c.school;
      setCur(c);
      if(DRAFT&&keep){ const {ids,extra}=picksToSel(keep); DRAFT.sel=new Set(ids); DRAFT.extra=extra; }
      save(); render(); toast('교육과정을 적용했습니다');
      setTimeout(()=>askImportDb(wb,fname),300);
    }}]);
}

/* 새 교육과정을 올려도 앱에서 만든 규칙은 유지 (같은 이름이 양식에 있으면 양식 값 우선) */
function mergeChecks(nc){
  const out=(nc.checks||[]).slice();
  const ci=curIndex(nc); const has=n=>!!ci.byName[normLoose(n)];
  const oldOn={}; curChecks().forEach(o=>oldOn[normName(o.name)]=o);
  out.forEach(x=>{ const o=oldOn[normName(x.name)]; if(o){ if(o.on===false) x.on=false; if(o.level) x.level=o.level; } });
  let lost=0;
  curChecks().filter(o=>o.origin==='user'&&!out.some(x=>normName(x.name)===normName(o.name))).forEach(o=>{
    const k=JSON.parse(JSON.stringify(o));
    ['subjects','then'].forEach(f=>{ if(k[f]){ const b=k[f].length; k[f]=k[f].filter(has).map(n=>ci.byName[normLoose(n)][0].n); lost+=b-k[f].length; } });
    out.push(k);
  });
  const kept=out.length-(nc.checks||[]).length;
  if(kept) nc.issues.push({lv:lost?'w':'i',msg:'앱에서 만든 검증 규칙 '+kept+'개를 그대로 이어서 씁니다'+(lost?' (새 교육과정에 없는 과목 '+lost+'개는 규칙에서 뺐습니다)':'')+'.'});
  return out;
}

/* ---------- 상담 기록 엑셀 가져오기 ---------- */
const DB_HEAD={date:['상담일시','상담일','상담 일시','날짜'],name:['학생 이름','학생이름','이름','성명'],y:['학년'],b:['반'],no:['번호'],counselor:['상담자','상담교사'],
  career:['희망 진로','희망진로'],major:['희망 학과','희망학과'],content:['상담 내용','주요 상담 내용','상담내용'],plan:['추후 계획','추후 상담 계획','추후계획'],
  picks:['선택 과목 목록','선택과목 목록','선택 과목','선택과목'],credits:['총 학점','총학점'],method:['상담 방법','상담방법'],id:['기록ID','기록 ID']};
function findDbSheet(wb){
  let found=null;
  wb.eachSheet(ws=>{
    if(found) return;
    const R=sheetRows(ws);
    for(let r=0;r<Math.min(R.length,10);r++){
      const row=(R[r]||[]).map(cellText); const col={};
      row.forEach((v,ci)=>{ for(const k in DB_HEAD){ if(col[k]==null&&matchHead(v,DB_HEAD[k])) col[k]=ci; } });
      if(col.name!=null&&col.picks!=null){ found={ws,R,hr:r,col}; return; }
    }
  });
  return found;
}
function excelDate(v){
  if(v instanceof Date) return cellText(v);
  if(typeof v==='number'&&v>20000&&v<80000){ const d=new Date(Math.round((v-25569)*86400000)); return cellText(d); }
  const t=cellText(v).trim(); const m=t.match(/(\d{4})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/);
  return m?m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0'):t;
}
function recSig(r){ return r.sid+'|'+r.date+'|'+r.picks.map(p=>normName(p.n)).sort().join(',')+'|'+String(r.content||'').slice(0,40); }
function importDbFromWB(wb,srcName){
  const F=findDbSheet(wb);
  if(!F){ const P=findPickSheet(wb); if(P) return importPickSheet(P,srcName);
    return {ok:false,msg:'기록 시트를 찾지 못했습니다. 상담 기록(머리글에 「학생 이름」「선택 과목 목록」) 또는 학생입력 형식(머리글에 「학번」·「이름」과 과목명)이어야 합니다.'}; }
  const {R,hr,col}=F;
  const sigs=new Set(DB.records.map(recSig));
  let added=0,dup=0,skip=0,updated=0; const newStu=new Set();
  const before=new Set(DB.students.map(s=>s.id));
  for(let r=hr+1;r<R.length;r++){
    const a=R[r]||[]; const g=k=>col[k]==null?'':a[col[k]];
    const name=cellText(g('name')).trim(); if(!name){ continue; }
    const s=ensureStudent(cellText(g('y')).trim(),cellText(g('b')).trim(),cellText(g('no')).trim(),name);
    if(!before.has(s.id)) newStu.add(s.id);
    const picks=parsePicksText(cellText(g('picks')));
    const rid=cellText(g('id')).trim();
    if(rid&&DB.tomb[rid]){ skip++; continue; }
    const rec={id:rid||uid('r'),sid:s.id,date:excelDate(g('date'))||'',counselor:cellText(g('counselor')).trim(),method:cellText(g('method')).trim()||'',career:cellText(g('career')).trim(),major:cellText(g('major')).trim(),
      content:cellText(g('content')).trim(),plan:cellText(g('plan')).trim(),picks,credits:picksCredits(picks),src:srcName,createdAt:Date.now()+r,updatedAt:Date.now()};
    if(rid){ const ex=DB.records.find(x=>x.id===rid); if(ex){ if(recSig(ex)!==recSig(rec)){ Object.assign(ex,rec,{createdAt:ex.createdAt}); updated++; } else dup++; continue; } }
    const sg=recSig(rec); if(sigs.has(sg)){ dup++; continue; }
    sigs.add(sg); DB.records.push(rec); added++;
  }
  return {ok:true,added,dup,skip,updated,newStu:newStu.size,sheet:F.ws.name};
}
function importSummary(r){ return '기록 '+r.added+'건 추가'+(r.empty?' · 과목 미입력 '+r.empty+'명(학생만 추가)':'')+(r.updated?' · '+r.updated+'건 갱신':'')+(r.dup?' · 중복 '+r.dup+'건 건너뜀':'')+(r.skip?' · 삭제된 기록 '+r.skip+'건 제외':'')+(r.newStu?' · 새 학생 '+r.newStu+'명':''); }
function askImportDb(wb,fname){
  const F=findDbSheet(wb), P=F?null:findPickSheet(wb); if(!F&&!P) return;
  const msg=F?'「'+esc(F.ws.name)+'」 시트에 상담 기록 '+F.R.slice(F.hr+1).filter(a=>a&&cellText(a[F.col.name]).trim()).length+'건이 있습니다. 이 앱으로 옮겨올까요?'
    :'「'+esc(P.ws.name)+'」 시트에 학생 '+P.n+'명의 과목 선택 자료(1 표시)가 있습니다. 학생마다 「수강신청 자료」 기록으로 옮겨올까요?';
  modal('기록도 가져올까요?','<p>'+msg+'</p>',
    [{label:'아니요'},{label:'가져오기',cls:'pri',fn:()=>{ const r=importDbFromWB(wb,fname); save(); render(); toast(importSummary(r)); }}]);
}
$('#f-db').onchange=async e=>{
  const f=e.target.files[0]; e.target.value=''; if(!f) return;
  let wb; try{ wb=await loadWB(f); }catch(err){ modal('파일을 읽지 못했습니다',esc(err.message||err)); return; }
  if(tryBackup(wb,f.name)) return;
  const r=importDbFromWB(wb,f.name);
  if(!r.ok){ modal('가져오지 못했습니다',esc(r.msg)); return; }
  save(); render();
  modal('가져오기 완료','<p>「'+esc(r.sheet)+'」 시트에서 '+esc(importSummary(r))+'</p><p class="small muted" style="margin-top:8px">현재 교육과정에 없는 과목은 「현재 교육과정에 없는 과목」으로 표시됩니다.</p>');
};

/* ---------- 학생입력 형식 (학번·이름 + 과목별 1) ---------- */
function findPickSheet(wb){
  if(!CUR) return null;
  let found=null;
  wb.eachSheet(ws=>{
    if(found) return;
    const R=sheetRows(ws);
    for(let r=0;r<Math.min(R.length,12);r++){
      const row=(R[r]||[]).map(cellText);
      const hb=row.findIndex(v=>/^학번$/.test(v.replace(/\s+/g,''))), nm=row.findIndex(v=>/^(이름|성명|학생이름)$/.test(v.replace(/\s+/g,'')));
      if(hb<0&&nm<0) continue;
      const subj=[]; row.forEach((v,ci)=>{ if(ci!==hb&&ci!==nm&&CX.byName[normLoose(v)]) subj.push(ci); });
      if(subj.length<3) continue;
      const ban=row.findIndex(v=>v.replace(/\s+/g,'')==='반'), no=row.findIndex(v=>v.replace(/\s+/g,'')==='번호'), kind=row.findIndex(v=>v.replace(/\s+/g,'')==='구분'), yy=row.findIndex(v=>v.replace(/\s+/g,'')==='학년');
      /* 머리글 위쪽 행에서 학기 이름 찾기 (병합 칸은 왼쪽 값 이어받기) */
      const semOf={};
      for(let up=0;up<r;up++){ let last=''; const ur=R[up]||[]; for(let ci=0;ci<row.length;ci++){ const t=cellText(ur[ci]); const m=t.match(/(\d)\s*학년\s*(\d)\s*학기/); if(m) last=m[1]+'-'+m[2]; if(last&&subj.includes(ci)) semOf[ci]=last; } }
      let n=0; for(let k=r+1;k<R.length;k++){ const a=R[k]||[]; if(cellText(a[hb>=0?hb:nm]).trim()) n++; }
      found={ws,R,hr:r,hb,nm,ban,no,kind,yy,subj,semOf,head:row,n}; return;
    }
  });
  return found;
}
function importPickSheet(P,srcName){
  const plan=pickPlan(P); const r=applyPickPlan(plan,srcName,'수강신청 자료');
  return {ok:true,added:r.added,dup:plan.same,skip:0,updated:0,newStu:r.newStu,sheet:P.ws.name,empty:plan.empty};
}

/* ---------- 파일 합치기 (학년 취합) ---------- */
function mergeDb(inc,label){
  const res={added:0,updated:0,dup:0,del:0,newStu:0};
  const sigs=new Set(DB.records.map(recSig));
  (inc.students||[]).forEach(s=>{ if(!s||!s.name) return; if(!DB.students.find(x=>x.id===s.id)){ DB.students.push(Object.assign({id:s.id||stuId(s.y,s.b,s.no,s.name),y:s.y||'',b:s.b||'',no:s.no||'',name:s.name},s.demo?{demo:true}:{})); res.newStu++; } });
  Object.entries(inc.tomb||{}).forEach(([id,ts])=>{
    const i=DB.records.findIndex(r=>r.id===id);
    if(i>=0&&(DB.records[i].updatedAt||0)<=ts){ DB.records.splice(i,1); res.del++; }
    if(!DB.tomb[id]||DB.tomb[id]<ts) DB.tomb[id]=ts;
  });
  (inc.records||[]).forEach(r=>{
    if(!r||!r.id||DB.tomb[r.id]) return;
    const ex=DB.records.find(x=>x.id===r.id);
    const rr=Object.assign({},r,{src:r.src||label});
    if(ex){ if((r.updatedAt||0)>(ex.updatedAt||0)){ Object.assign(ex,rr); res.updated++; } else res.dup++; return; }
    if(sigs.has(recSig(rr))){ res.dup++; return; }
    if(!DB.students.find(x=>x.id===rr.sid)) return;
    DB.records.push(rr); sigs.add(recSig(rr)); res.added++;
  });
  return res;
}
$('#f-merge').onchange=async e=>{
  const files=[...e.target.files]; e.target.value=''; if(!files.length) return;
  const log=[]; busy(true,'파일 합치는 중…');
  for(const [fi,f] of files.entries()){
    busy(false); busy(true,'파일 합치는 중… ('+(fi+1)+'/'+files.length+')'); await new Promise(r=>setTimeout(r,20));
    try{
      if(/\.html?$/i.test(f.name)){
        const txt=await f.text();
        if(!isAppHtml(txt)){ log.push({f:f.name,ok:false,msg:APP_SHORT+' HTML 파일이 아닙니다'}); continue; }
        const inc=extractBlock(txt,'J-DB');
        if(!inc||!Array.isArray(inc.records)){ log.push({f:f.name,ok:false,msg:'저장된 기록을 읽지 못했습니다'}); continue; }
        if(inc.fileId===DB.fileId&&!inc.records.length){ log.push({f:f.name,ok:true,msg:'기록 없음'}); continue; }
        const icur=extractBlock(txt,'J-CUR');
        const r=mergeDb(inc,f.name.replace(/\.html?$/i,''));
        log.push({f:f.name,ok:true,msg:importSummary(r)+(r.del?' · 삭제 반영 '+r.del+'건':'')+(icur&&CUR&&icur.sig&&icur.sig!==CUR.sig?' · ⚠ 이 파일의 교육과정이 지금 것과 다릅니다(과목은 이름으로 맞춤)':'')});
      }else{
        const wb=await loadWB(f);
        const bp=readBackup(wb);
        if(bp&&!bp.err){ const r=mergeDb(fixDB(bp.db),'백업 '+String(bp.at).slice(0,10)); log.push({f:f.name,ok:true,msg:'백업 파일 — '+importSummary(r)}); continue; }
        const r=importDbFromWB(wb,f.name.replace(/\.[^.]+$/,''));
        log.push({f:f.name,ok:r.ok,msg:r.ok?importSummary(r):r.msg});
      }
    }catch(err){ console.warn(err); log.push({f:f.name,ok:false,msg:'읽는 중 오류: '+(err.message||err)}); }
  }
  busy(false); save();
  ST.mergeLog='<div class="issues" style="margin-top:8px">'+log.map(x=>'<div class="iss '+(x.ok?'i':'e')+'"><span class="lv">'+(x.ok?'완료':'실패')+'</span><span><b>'+esc(x.f)+'</b> — '+esc(x.msg)+'</span></div>').join('')+'</div>';
  if(ST.tab!=='grade') setTab('grade'); else render(); toast(files.length+'개 파일을 처리했습니다 — 결과는 「학년 현황」 맨 위에 있습니다');
};

/* ---------- 엑셀 내보내기 ---------- */
const REC_HEAD=['상담일시','학생 이름','학년','반','번호','상담자','희망 진로','희망 학과','상담 내용','추후 계획','선택 과목 목록','총 학점','상담 방법','상태','기록ID','확인할 내용'];
function recRow(r){
  const s=DB.students.find(x=>x.id===r.sid)||{};
  const st={ok:'선택 완료',warn:'미완료',bad:'확인 필요',none:'선택 없음'}[evalStatus(recEval(r))];
  const num=v=>v!==''&&!isNaN(+v)?+v:v;
  return [r.date,s.name||'',num(s.y||''),num(s.b||''),num(s.no||''),r.counselor||'',r.career||'',r.major||'',r.content||'',r.plan||'',picksText(r.picks),picksCredits(r.picks),r.method||'',st,r.id,issueList(recEval(r)).map(x=>x.t).join('\n')];
}
async function exportRecords(list,fname){
  if(!list.length){ toast('내보낼 기록이 없습니다'); return; }
  const wb=new ExcelJS.Workbook();
  const ws=wb.addWorksheet('선택과목 상담DB');
  addTable(ws,REC_HEAD,list.map(recRow),[11,10,6,6,6,10,14,16,40,28,34,8,9,10,16,48]);
  await downloadWB(wb,fname); toast('엑셀 파일을 내려받았습니다 ('+list.length+'건)');
}
async function exportGrade(){
  if(!CUR){ toast('교육과정이 없습니다'); return; }
  const D=gradeData(''); const bans=bansOf(DB.students);
  const wb=new ExcelJS.Workbook();
  /* 과목별 인원 */
  const a=wb.addWorksheet('과목별 인원');
  const rows=[];
  Object.values(CX.groups).forEach(g=>g.rows.forEach(r=>{
    const L=D.cnt[r.id]||[];
    rows.push([semLabel(semKey(g.y,g.s)),g.g,g.c,g.need,r.n,r.t,L.length].concat(bans.map(b=>L.filter(s=>s.b===b).length)));
  }));
  addTable(a,['학기','선택그룹','학점','택','과목명','유형','전체'].concat(bans.map(b=>b+'반')),rows,[13,16,6,5,24,9,7].concat(bans.map(()=>6)));
  /* 학생별 선택 (매트릭스) */
  const m=wb.addWorksheet('학생별 선택');
  const subj=CX.rows.slice().sort((x,y)=>x.y-y.y||x.s-y.s||CX.rows.indexOf(x)-CX.rows.indexOf(y));
  addTable(m,['학년','반','번호','이름','최근 상담일','총 학점','상태'].concat(subj.map(r=>r.y+'-'+r.s+' '+r.n)),
    D.rows.map(x=>{ const sel=x.lr?new Set(picksToSel(x.lr.picks).ids):new Set();
      return [x.s.y,x.s.b,x.s.no,x.s.name,x.lr?x.lr.date:'',x.lr?picksCredits(x.lr.picks):'',{ok:'선택 완료',warn:'미완료',bad:'확인 필요',none:'상담 전'}[x.st]].concat(subj.map(r=>sel.has(r.id)?'O':'')); }),
    [6,6,6,10,11,8,10].concat(subj.map(()=>5)));
  m.getRow(1).height=110; m.getRow(1).eachCell((c,ci)=>{ if(ci>7) c.alignment={textRotation:90,vertical:'bottom',horizontal:'center'}; });
  /* 확인 필요 */
  const c=wb.addWorksheet('확인 필요');
  addTable(c,['학년','반','번호','이름','상태','내용','최근 상담일'],D.rows.filter(x=>x.st==='bad'||x.st==='warn').map(x=>[x.s.y,x.s.b,x.s.no,x.s.name,x.st==='bad'?'확인 필요':'미완료',issueList(x.ev).map(i=>i.t).join('\n'),x.lr.date]),[6,6,6,10,10,80,11]);
  /* 반별 진행 */
  const p=wb.addWorksheet('반별 진행');
  addTable(p,['반','학생','상담한 학생','선택 완료','미완료','확인 필요'],bans.map(b=>{ const L=D.rows.filter(x=>x.s.b===b); return [b,L.length,L.filter(x=>x.lr).length,L.filter(x=>x.st==='ok').length,L.filter(x=>x.st==='warn').length,L.filter(x=>x.st==='bad').length]; }),[8,8,11,10,9,10]);
  /* 전체 기록 */
  const r=wb.addWorksheet('선택과목 상담DB');
  addTable(r,REC_HEAD,DB.records.slice().sort((x,y)=>String(x.date).localeCompare(String(y.date))).map(recRow),[11,10,6,6,6,10,14,16,40,28,34,8,9,10,16,48]);
  await downloadWB(wb,'grade_summary_'+today().replace(/-/g,'')+'.xlsx'); toast('학년 현황 엑셀을 내려받았습니다');
}

/* ---------- 학생입력 형식 / 검증결과 엑셀 ---------- */
function argb(hex){ return 'FF'+hex.replace('#','').toUpperCase(); }
function fillOf(hex){ return {type:'pattern',pattern:'solid',fgColor:{argb:argb(hex)}}; }
async function exportPickSheet(list){
  if(!list.length){ toast('내보낼 학생이 없습니다'); return; }
  const {cols,sems,grps}=sheetCols();
  const wb=new ExcelJS.Workbook(); const ws=wb.addWorksheet('학생입력');
  const C0=5, last=4+list.length, LC=C0+cols.length-1;
  const center={horizontal:'center',vertical:'middle',wrapText:true};
  ws.mergeCells(1,1,2,4); ws.getCell(1,1).value='학생 정보';
  let c=C0;
  sems.forEach(x=>{ if(x.n>1) ws.mergeCells(1,c,1,c+x.n-1); ws.getCell(1,c).value=semLabel(x.k); for(let k=c;k<c+x.n;k++){ ws.getCell(1,k).fill=fillOf(semBg(x.k)); ws.getCell(2,k).fill=fillOf(semBg(x.k)); ws.getCell(4,k).fill=fillOf(semBg(x.k)); } c+=x.n; });
  c=C0; grps.forEach(x=>{ if(x.n>1) ws.mergeCells(2,c,2,c+x.n-1); ws.getCell(2,c).value=grpShort(x.g); c+=x.n; });
  ws.mergeCells(3,1,3,4); ws.getCell(3,1).value='선택 인원';
  cols.forEach((col,i)=>{ const L=ws.getColumn(C0+i).letter; ws.getCell(3,C0+i).value={formula:'COUNTIF('+L+'5:'+L+Math.max(last,5)+',1)',result:list.filter(x=>x.ids.has(col.r.id)).length}; });
  ['반','학번','이름','구분'].concat(cols.map(x=>x.r.n)).forEach((t,i)=>ws.getCell(4,i+1).value=t);
  list.forEach((x,i)=>{
    const s=x.s, hb=stuHakbun(s), row=ws.getRow(5+i);
    row.getCell(1).value=/^\d+$/.test(s.b)?+s.b:s.b; row.getCell(2).value=/^\d+$/.test(hb)?+hb:hb; row.getCell(3).value=s.name===hb?null:s.name; row.getCell(4).value=s.k||null;
    cols.forEach((col,j)=>{ if(x.ids.has(col.r.id)) row.getCell(C0+j).value=1; });
  });
  for(let r=1;r<=Math.max(last,4);r++){ for(let k=1;k<=LC;k++){ const cell=ws.getCell(r,k); cell.border=XS.border; cell.alignment=center; if(r<=4){ cell.font={bold:true,size:r===4?9:10}; if(k<=4) cell.fill=fillOf('#d9ead3'); } } }
  ws.getRow(4).height=84; ws.getRow(2).height=30;
  [5,7,10,9].forEach((w,i)=>ws.getColumn(i+1).width=w); for(let k=C0;k<=LC;k++) ws.getColumn(k).width=6.5;
  ws.views=[{state:'frozen',xSplit:4,ySplit:4}];
  ws.autoFilter={from:{row:4,column:1},to:{row:4,column:LC}};
  await downloadWB(wb,'student_picks_'+today().replace(/-/g,'')+'.xlsx');
  toast('학생입력 형식으로 내려받았습니다 ('+list.length+'명)');
}
async function exportCheck(list){
  if(!list.length){ toast('내보낼 학생이 없습니다'); return; }
  const rules=curRules();
  const wb=new ExcelJS.Workbook(); const ws=wb.addWorksheet('검증결과');
  const nBad=list.filter(x=>x.ck.bad).length;
  ws.getCell('A1').value=(schoolName()?schoolName()+' ':'')+((CUR&&CUR.title)||'').replace(/\s*선택과목\s*상담.*$/,'')+' 선택과목 학점·선이수 검증 결과'; ws.getCell('A1').font={bold:true,size:15};
  ws.getCell('A2').value='생성 '+new Date().toLocaleString('ko-KR')+'  ·  학생 '+list.length+'명  ·  학생마다 가장 최근 상담 기록 기준'; ws.getCell('A2').font={color:{argb:'FF808080'}};
  ws.getCell('A3').value=rules.map(r=>r.name+(r.level==='warn'?' 해당: ':' 위반: ')+list.filter(x=>!x.ck.none&&x.ev.rules.some(b=>b.rule===r&&!b.ok&&!b.na)).length+'명').concat([
    '선이수 위반: '+list.filter(x=>!x.ck.none&&x.ck.pre.length).length+'명','선택 개수 불일치: '+list.filter(x=>!x.ck.none&&x.ck.grp.length).length+'명','상담 전: '+list.filter(x=>x.ck.none).length+'명']).join('   ·   ');
  ws.getCell('A3').font={bold:true};
  const nNoneX=list.filter(x=>x.ck.none).length;
  ws.getCell('A4').value='▶ 확인이 필요한 학생: '+nBad+'명'+(nNoneX?' (상담 전 '+nNoneX+'명 포함)':'')+'   (빨간 칸 = 기준 위반, 주황 칸 = 묶음 선택 개수 불일치, 회색 칸 = 상담 전이라 판단 불가)'; ws.getCell('A4').font={color:{argb:'FFC00000'}};
  const unk=[...new Set(CX.rows.flatMap(r=>r.preExt||[]))];
  if(unk.length){ ws.getCell('A5').value='※ 선이수과목 중 교육과정 목록에 없어 검증에서 제외된 이름: '+unk.map(n=>'['+n+']').join(' '); ws.getCell('A5').font={color:{argb:'FF808080'}}; }
  const H=['반','학번','이름','구분','최근 상담','선택\n과목 수','선택\n총 학점'].concat(rules.map(r=>(r.type==='sum'||!r.type)?r.name+'\n('+([r.base?'기본 '+r.base+' 포함':'',ruleCond(r)].filter(Boolean).join(', ')||ruleUnit(r)+' 합계')+')':r.name+'\n('+CHECK_TYPES[r.type]+(r.level==='warn'?' · 권장':'')+')'),['선이수(위계) 검증','묶음 선택 개수 점검\n(학기 묶음: 선택/필요)','종합']);
  const hr=ws.getRow(6); H.forEach((t,i)=>hr.getCell(i+1).value=t);
  hr.eachCell(c=>{ c.font={bold:true}; c.alignment={horizontal:'center',vertical:'middle',wrapText:true}; c.fill=fillOf('#d9ead3'); c.border=XS.border; }); hr.height=48;
  const red=c=>{ c.fill=fillOf('#cc0000'); c.font={bold:true,color:{argb:'FFFFFFFF'}}; };
  list.forEach((x,i)=>{
    const ck=x.ck, row=ws.getRow(7+i), hb=stuHakbun(x.s);
    const vals=[/^\d+$/.test(x.s.b)?+x.s.b:x.s.b,/^\d+$/.test(hb)?+hb:hb,x.s.name===hb?'':x.s.name,x.s.k||'',x.lr?x.lr.date:'',x.ids.size,x.ev.total]
      .concat(x.ev.rules.map(r=>r.val!=null?r.val:(ck.none?'':(!r.ok&&!r.na?r.why:r.na?'해당 없음':'충족'))),[ck.none?'판단 불가 (상담 전)':ck.pre.length?ck.pre.join(' / '):'충족',ck.none?'선택한 과목 없음':ck.grp.length?ck.grp.join(' / '):'정상',ck.bad?'확인 필요':ck.warn?'권장 확인':'이상 없음']);
    vals.forEach((v,k)=>{ const c=row.getCell(k+1); c.value=v===''?null:v; c.border=XS.border; c.alignment={vertical:'middle',horizontal:(k<7||k===vals.length-1||(k<7+rules.length&&typeof v==='number'))?'center':'left',wrapText:true}; });
    x.ev.rules.forEach((r,k)=>{ if(!ck.none&&!r.ok&&!r.na){ if(r.level==='warn') row.getCell(8+k).fill=fillOf('#fff2cc'); else red(row.getCell(8+k)); } });
    const cp=row.getCell(8+rules.length), cg=row.getCell(9+rules.length), ct=row.getCell(10+rules.length);
    if(ck.none){ [cp,cg].forEach(c=>{ c.fill=fillOf('#d9d9d9'); c.font={color:{argb:'FF595959'}}; }); }
    else{ if(ck.pre.length) red(cp); if(ck.grp.length) cg.fill=fillOf('#f8cbad'); }
    if(ck.bad){ ct.fill=fillOf('#ffc7ce'); ct.font={bold:true,color:{argb:'FF9C0006'}}; } else if(ck.warn){ ct.fill=fillOf('#fff2cc'); ct.font={color:{argb:'FF7F6000'}}; } else ct.font={color:{argb:'FF006100'}};
  });
  [6,8,10,10,11,8,8].concat(rules.map(r=>r.type==='sum'||!r.type?14:30),[46,46,11]).forEach((w,i)=>ws.getColumn(i+1).width=w);
  ws.views=[{state:'frozen',xSplit:3,ySplit:6}];
  ws.autoFilter={from:{row:6,column:1},to:{row:6,column:H.length}};
  await downloadWB(wb,'check_result_'+today().replace(/-/g,'')+'.xlsx');
  toast('검증 결과를 내려받았습니다 ('+list.length+'명)');
}

/* ---------- 배포용 파일 ---------- */
async function makeDist(){
  if(!CUR){ toast('교육과정을 먼저 불러와 주세요'); return; }
  const tpl=await getTemplate(); if(!tpl) return;
  const d=emptyDB();
  const cur=Object.assign({},CUR,{sample:false,school:schoolName()});
  const fn='선택과목_상담일지_도우미_'+today().replace(/-/g,'')+'.html';
  const html=buildHtml(tpl,d,cur);
  downloadBlob(new Blob([html],{type:'text/html'}),fn);
  modal('배포용 파일을 만들었습니다','<p>내려받은 <b>'+esc(fn)+'</b>에는 지금 교육과정만 들어 있고 학생 기록은 비어 있습니다.</p><p class="small muted" style="margin-top:8px">파일 이름을 반별로 바꿔(예: 상담일지_2-3.html) 담임 선생님께 나눠 드리세요. 각 담임 선생님은 파일을 연 뒤 「파일에 저장 연결」로 자기 파일에 기록을 저장합니다.</p>');
}

/* ---------- 인쇄 ---------- */
function printRecord(rec,isDraft){
  $('#print').innerHTML=recordPrintHtml(rec,isDraft);
  setTimeout(()=>window.print(),50);
}
function recordPrintHtml(rec,isDraft){
  const s=DB.students.find(x=>x.id===rec.sid)||{name:''};
  const ev=recEval(rec);
  const by={}; rec.picks.forEach(p=>{ const k=p.y?semKey(p.y,p.s):'?'; (by[k]=by[k]||[]).push(p); });
  const sems=[...new Set(CX.sems.concat(Object.keys(by)))].filter(k=>by[k]||CX.sems.includes(k)).sort();
  return (schoolName()?'<div style="font-size:11px;color:#555;margin-bottom:2px">'+esc(schoolName())+'</div>':'')+'<h1>'+esc((CUR&&CUR.title)||'선택과목 상담 기록')+'</h1>'
    +'<table><tr><th>학생</th><td>'+esc(stuLabel(s))+'</td><th>상담일</th><td>'+esc(rec.date)+'</td><th>상담자</th><td>'+esc(rec.counselor||'')+' ('+esc(rec.method||'')+')</td></tr>'
    +'<tr><th>희망 진로</th><td colspan="2">'+esc(rec.career||'')+'</td><th>희망 학과</th><td colspan="2">'+esc(rec.major||'')+'</td></tr></table>'
    +'<table><tr>'+sems.map(k=>'<th>'+(k==='?'?'학기 미상':semLabel(k))+' ('+(by[k]||[]).reduce((a,p)=>a+(+p.c||0),0)+'학점)</th>').join('')+'</tr><tr>'
    +sems.map(k=>'<td>'+(by[k]||[]).map(p=>esc(p.n)+' <small>('+esc(typeShort(p.t))+')</small>').join('<br>')+'</td>').join('')+'</tr></table>'
    +'<table><tr><th style="width:90px">총 학점</th><td>'+picksCredits(rec.picks)+'학점 · '+rec.picks.length+'과목</td></tr>'
    +(ev.rules.length?'<tr><th>검증 규칙</th><td>'+ev.rules.filter(r=>r.val!=null||!r.na).map(r=>esc(r.val!=null?r.rule.name+' '+r.val+ruleUnit(r.rule)+(ruleCond(r.rule)?' ('+ruleCond(r.rule)+')':'')+(r.ok?'':' ✗'):r.rule.name+(r.ok?' 충족':' ✗ '+r.why))).join(' · ')+'</td></tr>':'')
    +'<tr><th>확인 사항</th><td>'+(issueList(ev).map(i=>esc(i.t)).join('<br>')||'없음')+(Object.keys(ev.link).length?'<br>연계 권장: '+esc(Object.keys(ev.link).map(id=>CX.byId[id].n+' → '+ev.link[id].join(', ')).join(' / ')):'')+'</td></tr>'
    +'<tr><th>상담 내용</th><td class="pv-txt">'+esc(rec.content||'')+'</td></tr><tr><th>추후 계획</th><td class="pv-txt">'+esc(rec.plan||'')+'</td></tr></table>'
    /* 보관용: 확인란 + 출력 정보 */
    +'<table class="pv-sign"><tr><th>담임 확인</th><td>'+esc(rec.counselor||'')+'</td><td class="sg">(서명)</td><th>학생 확인</th><td>'+esc(dn(s.name||''))+'</td><td class="sg">(서명)</td></tr></table>'
    +'<p class="pv-foot">출력일 '+today()+(schoolName()?' · '+esc(schoolName()):'')+' · '+esc(APP_NAME)+'</p>'
    +(isDraft?'<p style="font-size:9px;color:#666">※ 저장 전 화면을 인쇄했습니다.</p>':'');
}

/* ---------- 시작 ---------- */
function init(){   /* 모든 파일을 읽은 뒤 맨 끝에서 호출 */
  if(DB.settings.ban) ST.fBan=DB.settings.ban;
  render(); initPlus();
  if(DB.updatedAt) $('#save-ind').textContent='마지막 저장 '+new Date(DB.updatedAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
  if(!CUR) setTab('cur');
  else if(!DB.students.length&&!DB.records.length) setTab('help');   /* 처음 연 파일이면 간단 사용법부터 */
}
