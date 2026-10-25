/* =====================================================================
   백업 · 이 PC 기록 지우기 · 백업으로 되살리기
   백업 엑셀 = 사람이 읽는 시트(안내 · 학생명단 · 선택과목 상담DB) + 숨김 시트 _backup(전체 데이터 JSON)
   ===================================================================== */
const BK_MARK='ELECTIVE-COUNSEL-BACKUP';
function stamp(){ const d=new Date(); return today().replace(/-/g,'')+'_'+String(d.getHours()).padStart(2,'0')+String(d.getMinutes()).padStart(2,'0'); }
async function exportBackup(){
  const wb=new ExcelJS.Workbook(); wb.creator=APP_NAME;
  const at=new Date();
  const g=wb.addWorksheet('안내',{properties:{tabColor:{argb:'FF17784A'}}});
  g.getColumn(1).width=110;
  [[APP_NAME+' — 기록 백업'+(schoolName()?' ('+schoolName()+')':''),true],['만든 때: '+at.toLocaleString('ko-KR')+'  ·  앱 버전 '+APP_VERSION,false],
   ['교육과정: '+((CUR&&CUR.title)||'-')+'  ·  학생 '+DB.students.length+'명  ·  상담 기록 '+DB.records.length+'건  ·  검증 규칙 '+curChecks().length+'개',false],['',false],
   ['되살리는 방법: 앱 상단 「🔒 백업·지우기」 → 「백업 파일로 되살리기」에서 이 파일을 고르세요. (「상담 기록 엑셀 가져오기」나 「파일 합치기」로 올려도 됩니다)',false],
   ['되살릴 때는 숨김 시트 「_backup」의 전체 데이터를 씁니다. 이 시트를 지우거나 고치지 마세요. 다른 시트에서 고친 내용은 되살릴 때 반영되지 않습니다.',false],
   ['⚠ 이 파일에는 학생 개인정보(이름·선택 과목·상담 내용)가 들어 있습니다. 학교 개인정보 지침에 따라 보관하고, 필요 없어지면 지워 주세요.',false]]
   .forEach(([t,b])=>{ const r=g.addRow([t]); r.getCell(1).font={bold:b,size:b?14:10.5,color:{argb:/^⚠/.test(t)?'FFC00000':'FF1D2430'}}; r.getCell(1).alignment={wrapText:true}; });
  const sl=wb.addWorksheet('학생명단');
  addTable(sl,['학년','반','번호','이름','학번','구분','상담 횟수','최근 상담일'],sortStudents(DB.students).map(s=>{ const L=recsOf(s.id); return [s.y,s.b,s.no,s.name,stuHakbun(s),s.k||'',L.length,L.length?L[L.length-1].date:'']; }),[6,6,6,12,8,10,9,12]);
  const r=wb.addWorksheet('선택과목 상담DB');
  addTable(r,REC_HEAD,DB.records.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(recRow),[11,10,6,6,6,10,14,16,40,28,34,8,9,10,16,48]);
  const bk=wb.addWorksheet('_backup'); bk.state='hidden';
  const json=JSON.stringify({mark:BK_MARK,v:1,ver:APP_VERSION,at:at.toISOString(),db:DB,cur:CUR});
  bk.getCell('A1').value=BK_MARK; bk.getCell('A2').value=1; bk.getCell('A3').value=at.toISOString(); bk.getCell('A4').value=json.length;
  for(let i=0,row=5;i<json.length;i+=30000,row++) bk.getCell('A'+row).value=json.slice(i,i+30000);
  const fname='counsel_backup_'+stamp()+'.xlsx';
  await downloadWB(wb,fname);
  return fname;
}
function readBackup(wb){
  const ws=wb.getWorksheet('_backup'); if(!ws) return null;
  if(cellText(ws.getCell('A1').value)!==BK_MARK) return {err:'백업 표시가 없습니다'};
  const len=+cellText(ws.getCell('A4').value)||0; let txt='';
  for(let row=5;row<=ws.rowCount;row++) txt+=cellText(ws.getCell('A'+row).value);
  if(len&&txt.length!==len) return {err:'백업 데이터가 잘렸거나 바뀌었습니다'};
  try{ const p=JSON.parse(txt); if(!p||p.mark!==BK_MARK||!p.db) return {err:'백업 데이터를 읽지 못했습니다'}; return p; }catch(e){ return {err:'백업 데이터를 읽지 못했습니다'}; }
}
/* 엑셀 업로드 경로 어디서든 백업 파일이면 되살리기로 안내 */
function tryBackup(wb,fname){
  const p=readBackup(wb); if(!p) return false;
  if(p.err){ modal('백업 파일을 되살리지 못했습니다','<p>'+esc(p.err)+'.</p><p class="small muted" style="margin-top:8px">「선택과목 상담DB」 시트만이라도 가져오려면 「상담 기록 엑셀 가져오기」를 이용하세요.</p>'); return true; }
  restoreModal(p,fname); return true;
}
function restoreModal(p,fname){
  const d=fixDB(JSON.parse(JSON.stringify(p.db)));
  const c=p.cur&&p.cur.rows?p.cur:null;
  const defCur=!!c&&(!CUR||CUR.sample||!DB.records.length);
  modal('백업 파일로 되살리기',
    '<dl class="kv" style="margin-bottom:10px"><dt>백업 파일</dt><dd>'+esc(fname)+'</dd><dt>만든 때</dt><dd>'+esc(new Date(p.at).toLocaleString('ko-KR'))+(p.ver?' · 버전 '+esc(p.ver):'')+'</dd>'
    +'<dt>들어 있는 것</dt><dd>학생 '+d.students.length+'명 · 상담 기록 '+d.records.length+'건'+(c?' · 교육과정 「'+esc(c.title||'')+'」 · 검증 규칙 '+((c.checks||[]).length)+'개':'')+'</dd></dl>'
    +'<p class="small">지금 화면의 기록(학생 '+DB.students.length+'명 · 기록 '+DB.records.length+'건)에 <b>합쳐서</b> 되살립니다. 같은 기록은 한 번만 들어가고, 더 최근에 고친 기록이 남습니다.</p>'
    +(c?'<label class="small row" style="margin-top:10px;gap:6px"><input type="checkbox" class="sw" id="rs-cur"'+(defCur?' checked':'')+'> 교육과정과 검증 규칙도 백업에 있던 것으로 바꾸기'+(CUR&&c.sig===CUR.sig?' <span class="muted">(지금 것과 과목 구성이 같음)</span>':'')+'</label>':''),
    [{label:'취소'},{label:'되살리기',cls:'pri',fn:(el)=>{
      const useCur=c&&el.querySelector('#rs-cur')&&el.querySelector('#rs-cur').checked;
      if(useCur){ setCur(keepSchool(JSON.parse(JSON.stringify(c)))); DRAFT=null; }
      const r=mergeDb(d,'백업 '+String(p.at).slice(0,10));
      if(!DB.settings.counselor&&d.settings.counselor) DB.settings.counselor=d.settings.counselor;
      if(!DB.settings.ban&&d.settings.ban) DB.settings.ban=d.settings.ban;
      if(!DB.settings.school&&d.settings.school) DB.settings.school=d.settings.school;
      d.students.forEach(s=>{ const x=DB.students.find(t=>t.id===s.id); if(x){ if(s.hb&&!x.hb) x.hb=s.hb; if(s.k&&!x.k) x.k=s.k; } });
      save(); render();
      setTimeout(()=>modal('되살렸습니다','<p>'+esc(importSummary(r))+(r.del?' · 삭제 반영 '+r.del+'건':'')+(useCur?' · 교육과정도 바꿨습니다':'')+'.</p>'
        +(selfHandle?'':'<p class="small muted" style="margin-top:8px">지금은 이 브라우저에만 임시 저장되어 있습니다. 상단 「파일에 저장 연결」로 파일에 저장해 두세요.</p>')),60);
    }}]);
}

/* ---------- 🔒 백업·지우기 창 ---------- */
function privacyModal(){
  const has=lsHas(), others=lsOtherKeys();
  const st=[
    ['파일 연결',selfHandle?'<span class="pill p-ok">연결됨</span> 기록은 HTML 파일에 저장되고, 브라우저에는 사본을 남기지 않습니다':'<span class="pill p-warn">연결 안 됨</span> 기록이 이 브라우저에 임시 저장됩니다'],
    ['이 PC 브라우저 사본',has?'<span class="pill p-warn">있음</span>':'<span class="pill p-ok">없음</span>'],
    ['기억해 둔 파일 연결',savedHandle?'<span class="pill p-mute">있음</span> 「'+esc(savedHandle.name)+'」':'<span class="pill p-ok">없음</span>']
  ];
  modal('백업 · 이 PC 기록 지우기',
    '<dl class="kv" style="margin-bottom:12px">'+st.map(([k,v])=>'<dt>'+k+'</dt><dd style="font-weight:500">'+v+'</dd>').join('')+'</dl>'
    +'<div class="steps" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">'
    +'<div class="step"><span class="t">엑셀로 백업만 받기</span><span class="d">학생 '+DB.students.length+'명 · 기록 '+DB.records.length+'건을 엑셀 한 파일로 내려받습니다.</span><button class="btn" id="pv-bk">백업 받기</button></div>'
    +'<div class="step"><span class="t">백업 받고 이 PC 기록 지우기</span><span class="d">백업 엑셀을 내려받은 뒤, 이 브라우저에 남은 사본과 파일 연결 기억을 지우고 화면을 비웁니다.</span><button class="btn danger" id="pv-clear">백업 받고 지우기</button></div>'
    +'<div class="step"><span class="t">백업 파일로 되살리기</span><span class="d">백업 엑셀을 올리면 학생·기록·교육과정·검증 규칙이 그대로 돌아옵니다.</span><button class="btn pri" id="pv-restore">백업 파일 올리기</button></div>'
    +'</div>'
    +(others.length?'<label class="small row" style="margin-top:10px;gap:6px"><input type="checkbox" class="sw" id="pv-others"> 이 PC에 있는 <b>다른 '+APP_SHORT+' 파일의 임시 기록 '+others.length+'개</b>도 함께 지우기 (백업에는 들어가지 않습니다)</label>':'')
    +'<p class="small" style="margin-top:10px">📦 <b>새 버전 파일로 옮길 때</b>도 이 백업을 씁니다: 쓰던 파일에서 「백업 받기」 → 새 파일에서 「백업 파일로 되살리기」.</p>'
    +'<p class="small muted" style="margin-top:6px">※ 「지우기」는 이 브라우저에 남은 사본만 지웁니다. 기록이 저장된 <b>HTML 파일</b>과 내려받은 <b>백업 엑셀</b>은 파일이므로, 필요 없으면 직접 지우거나 안전한 곳에 보관해 주세요.</p>',
    [{label:'닫기'}]);
  $('#pv-bk').onclick=async()=>{ const f=await exportBackup(); toast('백업을 내려받았습니다: '+f); };
  $('#pv-restore').onclick=()=>{ $('#dim').classList.add('hide'); $('#f-restore').click(); };
  $('#pv-clear').onclick=async()=>{
    const alsoOthers=$('#pv-others')&&$('#pv-others').checked;
    let fname='';
    if(DB.students.length||DB.records.length) fname=await exportBackup();
    modal('백업 파일을 확인해 주세요',
      (fname?'<p>백업 파일 <b>'+esc(fname)+'</b>을(를) 내려받았습니다. 다운로드 폴더에 파일이 있는지 확인한 뒤 「지우기」를 누르세요.</p>':'<p>백업할 기록이 없습니다.</p>')
      +'<p class="small muted" style="margin-top:8px">지운 뒤에는 화면이 '+(selfHandle?'연결한 HTML 파일에 저장된 상태':'이 HTML 파일을 처음 연 상태')+'로 다시 열립니다. 백업 파일을 올리면 언제든 되살릴 수 있습니다.</p>',
      [{label:'취소'},{label:'이 PC 기록 지우기',cls:'danger',fn:async()=>{
        lsClear(); if(alsoOthers) lsOtherKeys().forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} });
        await idbDel('h:'+DB.fileId);
        fileDirty=false; if(DRAFT) DRAFT.dirty=false;
        clearTimeout(saveT);
        toast('이 PC에 남은 기록을 지웠습니다');
        setTimeout(()=>location.reload(),400);
      }}]);
  };
}
$('#b-priv').onclick=privacyModal;
$('#f-restore').onchange=async e=>{
  const f=e.target.files[0]; e.target.value=''; if(!f) return;
  let wb; try{ wb=await loadWB(f); }catch(err){ modal('파일을 읽지 못했습니다',esc(err.message||err)); return; }
  if(!tryBackup(wb,f.name)) modal('백업 파일이 아닙니다','<p>이 파일에는 백업 데이터(숨김 시트 「_backup」)가 없습니다.</p><p class="small muted" style="margin-top:8px">상담 기록 엑셀이라면 「교육과정 설정 → 상담 기록 엑셀 가져오기」로 올려 주세요.</p>');
};
