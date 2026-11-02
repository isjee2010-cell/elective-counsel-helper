/* =====================================================================
   반별 파일로 나누기 — 학년 전체 파일에서 반마다 그 반 학생·상담 기록만 담은 HTML을 만든다
   · 교육과정·검증 규칙·학교명은 함께, 연수용 예시 학생은 빼고
   · 파일마다 고유 번호(fileId) → 같은 PC에서 여러 반 파일을 열어도 섞이지 않음
   · 크롬·엣지: 폴더를 고르면 한꺼번에 저장 / 그 밖: 하나씩 내려받기
   · 담임이 고친 파일은 「학년 현황 → 합치기」로 다시 모은다 (기록 id·수정 시각 그대로)
   ===================================================================== */
function splitSafe(t){ return String(t||'').replace(/[^0-9A-Za-z가-힣]/g,''); }
function splitGroups(){
  const G={};
  DB.students.filter(s=>!s.demo&&String(s.b||'').trim()).forEach(s=>{
    const k=(s.y||'')+'|'+s.b; (G[k]=G[k]||{y:String(s.y||''),b:String(s.b),students:[]}).students.push(s);
  });
  return Object.values(G).map(g=>{
    const ids=new Set(g.students.map(s=>s.id));
    g.records=DB.records.filter(r=>ids.has(r.sid)&&!r.demo);
    g.label=(g.y?g.y+'학년 ':'')+g.b+'반';
    g.fname=(splitSafe(g.y)?splitSafe(g.y)+'학년':'')+(splitSafe(g.b)||'반없음')+'반_선택과목상담.html';
    return g;
  }).sort((a,b)=>(+a.y||0)-(+b.y||0)||(+a.b||0)-(+b.b||0)||a.b.localeCompare(b.b));
}
function splitDB(g){
  const d=emptyDB();
  d.updatedAt=Date.now();
  d.settings=Object.assign({},d.settings,{ban:g.b,y:g.y,school:schoolName(),counselor:''});
  d.students=JSON.parse(JSON.stringify(g.students));
  d.records=JSON.parse(JSON.stringify(g.records));
  d.tomb=JSON.parse(JSON.stringify(DB.tomb||{}));
  return d;
}
function splitModal(){
  if(!CUR){ toast('교육과정을 먼저 불러와 주세요'); return; }
  const groups=splitGroups();
  const noBan=DB.students.filter(s=>!s.demo&&!String(s.b||'').trim()).length, demoN=DB.students.filter(s=>s.demo).length;
  if(!groups.length){ toast(DB.students.length?'반 정보가 있는 학생이 없습니다':'학생이 없습니다. 먼저 학생을 넣어 주세요'); return; }
  const folder=!!window.showDirectoryPicker;
  const body='<p class="small" style="margin-bottom:8px">반마다 <b>그 반 학생과 상담 기록만</b> 담긴 파일을 만듭니다. 교육과정·검증 규칙·학교명도 함께 들어갑니다. 담임 선생님은 자기 반 파일로 현황을 보고 고치며, 나중에 「파일 선택해서 합치기」로 다시 모을 수 있습니다.</p>'
    +'<div class="scroll-x"><table class="tbl compact" id="sp-tbl"><thead><tr><th style="width:44px"><input type="checkbox" class="sw" id="sp-all" checked aria-label="모두 선택"></th><th>반</th><th class="num">학생</th><th class="num">상담 기록</th><th>파일 이름</th></tr></thead><tbody>'
    +groups.map((g,i)=>'<tr><td><input type="checkbox" class="sw sp-on" data-i="'+i+'" checked aria-label="'+esc(g.label)+' 넣기"></td><td><b>'+esc(g.label)+'</b></td><td class="num">'+g.students.length+'</td><td class="num">'+g.records.length+'</td><td class="small">'+esc(g.fname)+'</td></tr>').join('')
    +'</tbody></table></div>'
    +(noBan||demoN?'<p class="small muted" style="margin-top:8px">'+(noBan?'반이 비어 있는 학생 '+noBan+'명은 넣지 않습니다. ':'')+(demoN?'연수용 예시 학생 '+demoN+'명은 넣지 않습니다.':'')+'</p>':'')
    +'<p class="small muted" style="margin-top:8px">'+(folder?'다음 단계에서 <b>저장할 폴더</b>를 고르면 선택한 반 파일이 그 폴더에 한꺼번에 저장됩니다.':'이 브라우저는 폴더 저장을 지원하지 않아 파일을 하나씩 내려받습니다. 「여러 파일 다운로드 허용」을 물으면 허용해 주세요.')+'</p>'
    +'<div class="qg-box warn small" style="margin-top:10px">파일마다 학생 개인정보가 들어 있습니다. 담임 선생님께는 학교가 정한 방법으로 <b>그 반 파일만</b> 보내 주세요.</div>';
  const m=modal('반별 파일로 나누기',body,[{label:'취소'},{label:folder?'폴더 골라 저장':'내려받기',cls:'pri',fn:async()=>{
    const pick=[...document.querySelectorAll('#dim .sp-on')].filter(x=>x.checked).map(x=>groups[+x.dataset.i]);
    if(!pick.length){ toast('나눌 반을 하나 이상 골라 주세요'); return false; }
    setTimeout(()=>splitRun(pick),0);
  }}],{wide:true});
  const all=m.el.querySelector('#sp-all'), ons=[...m.el.querySelectorAll('.sp-on')];
  all.onchange=()=>ons.forEach(x=>x.checked=all.checked);
  ons.forEach(x=>x.onchange=()=>{ all.checked=ons.every(y=>y.checked); });
}
async function splitRun(pick){
  const hadTpl=!!selfTpl;
  const tpl=await getTemplate(); if(!tpl) return;
  const cur=Object.assign({},CUR,{sample:false,school:schoolName()});
  let dir=null;
  if(window.showDirectoryPicker){
    /* 파일 고르기 창을 거쳤으면 브라우저가 다음 창을 막으므로, 한 번 더 눌러 폴더 창을 엶 */
    if(!hadTpl&&!(await ask({title:'저장할 폴더 고르기',msg:'<p>이제 반별 파일을 저장할 폴더를 고릅니다.</p>',ok:'폴더 고르기'}))) return;
    try{ dir=await window.showDirectoryPicker({id:'ecs-split',mode:'readwrite'}); }
    catch(e){ if(e&&e.name==='AbortError') return; console.warn(e); toast('폴더를 열지 못해 하나씩 내려받습니다'); dir=null; }
    if(dir){
      const exist=[];
      for(const g of pick){ try{ await dir.getFileHandle(g.fname); exist.push(g.fname); }catch(e){} }
      if(exist.length&&!(await ask({title:'같은 이름의 파일이 있습니다',msg:'<p>고른 폴더에 <b>'+exist.length+'개</b>가 이미 있습니다.</p><p class="small muted" style="margin-top:6px">'+exist.slice(0,6).map(esc).join('<br>')+(exist.length>6?'<br>…':'')+'</p><p style="margin-top:8px">새 파일로 바꿔 저장할까요? 담임 선생님이 이미 고친 파일이라면 먼저 「합치기」로 모은 뒤 나누세요.</p>',ok:'바꿔 저장'}))) return;
    }
  }
  const done=[], fail=[];
  await withBusy('반별 파일을 만드는 중…',async()=>{
    for(const g of pick){
      const html=buildHtml(tpl,splitDB(g),cur);
      try{
        if(dir){ const h=await dir.getFileHandle(g.fname,{create:true}); const w=await h.createWritable(); await w.write(html); await w.close(); }
        else{ downloadBlob(new Blob([html],{type:'text/html'}),g.fname); await new Promise(r=>setTimeout(r,450)); }
        done.push(g);
      }catch(e){ console.warn(e); fail.push(g); }
    }
  });
  modal('반별 파일을 만들었습니다',
    '<p><b>'+done.length+'개 반</b> 파일을 '+(dir?'고른 폴더 「'+esc(dir.name)+'」에 저장했습니다.':'내려받았습니다.')+'</p>'
    +(done.length?'<div class="row" style="margin-top:8px">'+done.map(g=>'<span class="pill p-acc">'+esc(g.fname)+' · '+g.students.length+'명</span>').join('')+'</div>':'')
    +(fail.length?'<p class="small" style="margin-top:8px;color:var(--bad)">저장하지 못한 반: '+fail.map(g=>esc(g.label)).join(', ')+'</p>':'')
    +'<div class="qg-box" style="margin-top:12px"><div class="qg-t">담임 선생님께 전할 안내</div><ol class="small" style="margin:4px 0 0;padding-left:18px">'
    +'<li>받은 파일을 <b>내 폴더에 먼저 저장</b>한 뒤 크롬·엣지로 엽니다.</li>'
    +'<li>오른쪽 위 빨간 점 「<b>파일에 저장 연결</b>」 → 방금 연 그 파일을 고릅니다.</li>'
    +'<li>자기 반 현황을 보고 상담 기록을 고치거나 더합니다.</li>'
    +'<li>모을 때가 되면 그 파일을 다시 보내 주세요. 「학년 현황 → 파일 선택해서 합치기」로 모읍니다.</li></ol></div>',
    [{label:'닫기',cls:'pri'}]);
}
