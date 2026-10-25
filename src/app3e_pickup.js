/* =====================================================================
   선택 현황표 엑셀 올리기 — 「학생입력」 모양(1 표시) 엑셀을 올리면
   학생마다 가장 최근 기록과 비교해, 과목이 바뀐 학생만 오늘 날짜 상담일지를 새로 만든다(과목 목록만).
   ===================================================================== */
function pickPlan(P){
  const {R,hr,hb,nm,ban,no,kind,yy,subj,semOf,head}=P;
  const colRow=subj.map(ci=>{ const nmK=normLoose(head[ci]); const cand=CX.byName[nmK]||[]; const sk=semOf[ci]; return (sk&&cand.find(r=>semKey(r.y,r.s)===sk))||cand[0]; });
  const plan={changes:[],same:0,empty:0,emptyNew:[],seen:new Set()};
  for(let k=hr+1;k<R.length;k++){
    const a=R[k]||[];
    const h=hb>=0?cellText(a[hb]).trim():''; const name=(nm>=0?cellText(a[nm]).trim():'')||h;
    if(!name) continue;
    const ph=parseHakbun(h)||{};
    const y=String((yy>=0?cellText(a[yy]).trim():'')||ph.y||''), b=String((ban>=0?cellText(a[ban]).trim():'')||ph.b||''), n2=String((no>=0?cellText(a[no]).trim():'')||ph.no||'');
    const id=stuId(y,b,n2,name); if(plan.seen.has(id)) continue; plan.seen.add(id);
    const ids=[]; subj.forEach((ci,j)=>{ if(colRow[j]&&isOnMark(a[ci])&&!ids.includes(colRow[j].id)) ids.push(colRow[j].id); });
    const s=DB.students.find(x=>x.id===id);
    if(!ids.length){ plan.empty++; if(!s) plan.emptyNew.push({y,b,no:n2,name,hb:h.replace(/\D/g,''),k:kind>=0?cellText(a[kind]).trim():''}); continue; }
    const last=s?latestRec(s.id):null;
    const prev=last?picksToSel(last.picks).ids:[];
    const add=ids.filter(i=>!prev.includes(i)), del=prev.filter(i=>!ids.includes(i));
    if(last&&!add.length&&!del.length){ plan.same++; continue; }
    plan.changes.push({id,y,b,no:n2,name,hb:h.replace(/\D/g,''),k:kind>=0?cellText(a[kind]).trim():'',ids,add,del,isNew:!s,hadRec:!!last});
  }
  return plan;
}
function applyPickPlan(plan,srcName,method){
  const d=today(), now=Date.now(); let n=0, newS=0;
  plan.emptyNew.forEach(c=>{ const s=ensureStudent(c.y,c.b,c.no,c.name); if(c.hb&&!s.hb) s.hb=c.hb; if(c.k) s.k=c.k; newS++; });   /* 1 표시 없는 새 학생은 명단에만 */
  plan.changes.forEach((c,i)=>{
    let s=DB.students.find(x=>x.id===c.id);
    if(!s){ s=ensureStudent(c.y,c.b,c.no,c.name); newS++; }
    if(c.hb&&!s.hb) s.hb=c.hb; if(c.k) s.k=c.k;
    const picks=selToPicks(c.ids,[]);
    DB.records.push({id:uid('r'),sid:s.id,date:d,counselor:'',method:method||'',career:'',major:'',content:'',plan:'',picks,credits:picksCredits(picks),src:srcName,createdAt:now+i,updatedAt:now+i});
    n++;
  });
  return {added:n,newStu:newS};
}
const subjTag=id=>{ const r=CX.byId[id]; return r?r.y+'-'+r.s+' '+r.n:id; };
async function pickUpload(f){
  if(!CUR){ toast('먼저 교육과정을 불러와 주세요'); return; }
  let wb; try{ wb=await loadWB(f); }catch(err){ modal('파일을 읽지 못했습니다',(/\.xls$/i.test(f.name)?'예전 엑셀 형식(.xls) 파일입니다. 엑셀에서 「Excel 통합 문서(.xlsx)」로 저장한 뒤 올려 주세요.':esc(err.message||err))); return; }
  const P=findPickSheet(wb);
  if(!P){ modal('선택 현황표 모양을 찾지 못했습니다','<p>「'+esc(f.name)+'」에서 <b>반·학번(또는 이름)</b> 머리글과 과목 이름 열을 찾지 못했습니다.</p><p class="small muted" style="margin-top:8px">이 화면의 「학생입력 형식 엑셀로 내려받기」로 받은 파일에 1을 표시해 올리는 것이 가장 정확합니다. 과목 이름은 지금 교육과정과 같아야 합니다.</p>'); return; }
  const plan=pickPlan(P);
  const src='현황표 엑셀 '+today();
  const L=plan.changes;
  const row=c=>'<tr><td class="nw">'+esc([c.b?c.b+'반':'',c.no?c.no+'번':''].filter(Boolean).join(' '))+'</td><td class="nw"><b>'+esc(dn(c.name))+'</b>'+(c.isNew?' <span class="pill p-acc">새 학생</span>':!c.hadRec?' <span class="pill p-mute">첫 기록</span>':'')+'</td>'
    +'<td class="small">'+(c.add.length?'<span style="color:#2f8a57;font-weight:700">+ '+esc(c.add.map(subjTag).join(', '))+'</span>':'')+(c.add.length&&c.del.length?'<br>':'')+(c.del.length?'<span style="color:var(--bad);font-weight:700;text-decoration:line-through">− '+esc(c.del.map(subjTag).join(', '))+'</span>':'')+'</td></tr>';
  const body='<p class="small" style="margin-bottom:8px">「'+esc(P.ws.name)+'」 시트에서 학생 '+(L.length+plan.same+plan.empty)+'명을 읽어, 학생마다 <b>가장 최근 상담 기록의 과목</b>과 비교했습니다.</p>'
    +'<div class="row" style="gap:6px;margin-bottom:10px;flex-wrap:wrap"><span class="pill p-acc">과목이 바뀐 학생 '+L.length+'명</span><span class="pill p-mute">그대로 '+plan.same+'명</span>'+(plan.empty?'<span class="pill p-mute">1 표시가 하나도 없어 건너뜀 '+plan.empty+'명'+(plan.emptyNew.length?' (새 학생 '+plan.emptyNew.length+'명은 명단에만 추가)':'')+'</span>':'')+'</div>'
    +(L.length?'<div class="scroll-x" style="max-height:320px;overflow:auto"><table class="tbl"><thead><tr><th>반·번호</th><th>이름</th><th>바뀐 과목 (+ 새로 고름 · − 뺌)</th></tr></thead><tbody>'+L.map(row).join('')+'</tbody></table></div>'
      +'<p class="small muted" style="margin-top:10px">아래 「'+L.length+'명 상담일지 만들기」를 누르면 바뀐 학생마다 <b>오늘('+today()+') 날짜의 상담일지</b>가 하나씩 생기고, 과목 목록만 들어갑니다. 상담 내용·희망 진로 등은 「학생별 기록 → 수정」에서 채우면 됩니다. 기존 상담일지는 그대로 남습니다.</p>'
      :'<p class="small muted">바뀐 학생이 없어 새로 만들 상담일지가 없습니다.</p>');
  modal('선택 현황표 엑셀 반영',body,(L.length||plan.emptyNew.length)?[{label:'취소'},{label:L.length?L.length+'명 상담일지 만들기':'새 학생 명단에 추가',cls:'pri',fn:()=>{
    const snap=snapDB(); const r=applyPickPlan(plan,src,'');
    save(); ST.chip=ST.chip||{}; render();
    undoToast('학생 '+r.added+'명의 상담일지를 오늘 날짜로 만들었습니다'+(r.newStu?' (새 학생 '+r.newStu+'명)':''),snap);
  }}]:[{label:'닫기'}],{wide:true});
}

$('#f-pick').onchange=e=>{ const f=e.target.files[0]; e.target.value=''; if(f) pickUpload(f); };
