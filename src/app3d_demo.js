/* =====================================================================
   연수용 예시 데이터 — 지금 교육과정에 맞춰 가상 학생·상담 기록을 만들고, 예시만 골라 지운다
   학생·기록에 demo:true 표시 · 이름 끝에 (예시) · 배포용 파일에는 들어가지 않음
   ===================================================================== */
const DEMO_N=16;
const DEMO_PROF=[
  {career:'간호사',major:'간호학과',kw:['과학','생명','화학','보건']},
  {career:'소프트웨어 개발자',major:'컴퓨터공학과',kw:['정보','수학','인공지능','기술']},
  {career:'수학 교사',major:'수학교육과',kw:['수학','교육']},
  {career:'기계 엔지니어',major:'기계공학과',kw:['물리','수학','역학','과학']},
  {career:'경영 컨설턴트',major:'경영학과',kw:['사회','경제','수학','영어']},
  {career:'시각 디자이너',major:'시각디자인학과',kw:['미술','예술','매체','디자인']},
  {career:'약사',major:'약학과',kw:['화학','생명','과학']},
  {career:'기자',major:'미디어커뮤니케이션학과',kw:['국어','사회','매체','독서']}
];
const DEMO_SUR=['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황'];
const DEMO_GIVEN=['하늘','바다','누리','가람','나래','다온','라온','마루','보람','새봄','슬기','아라','온유','한결','해솔','도담'];
function demoRng(seed){ let a=seed>>>0; return ()=>{ a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
function demoCount(){ return {s:DB.students.filter(s=>s.demo).length,r:DB.records.filter(r=>r.demo).length}; }
function dayShift(d){ const t=new Date(); t.setDate(t.getDate()+d); return t.getFullYear()+'-'+pad2(t.getMonth()+1)+'-'+pad2(t.getDate()); }

/* 한 학생의 선택: 학기 순서대로, 선이수를 지킨 과목·진로 낱말에 맞는 과목을 먼저 고름 */
function demoPick(rnd,prof,opt){
  const sel=new Set(); const chosen=new Set();
  const groups=Object.values(CX.groups).sort((a,b)=>a.y-b.y||a.s-b.s);
  groups.forEach((g,gi)=>{
    if(opt.upto&&semKey(g.y,g.s)>opt.upto) return;
    let need=g.need;
    if(opt.short===gi) need=Math.max(0,need-1);          /* 묶음 덜 고름 → 미완료 */
    if(opt.over===gi) need=Math.min(g.rows.length,need+1); /* 묶음 더 고름 → 초과 */
    const score=r=>{
      const okPre=(r.pre||[]).every(n=>chosen.has(normName(n)));
      const txt=[r.n,r.up,r.lo].join(' ');
      const fit=prof.kw.some(k=>txt.includes(k));
      return (okPre?4:0)+(fit?2:0)+rnd()*1.5;
    };
    const order=g.rows.slice().sort((a,b)=>score(b)-score(a));
    order.slice(0,need).forEach(r=>{ sel.add(r.id); chosen.add(normName(r.n)); });
  });
  if(opt.breakPre){ /* 선이수 위반 하나 만들기: 선이수가 있는 과목을 고르고, 그 선이수 과목은 뺌 */
    const t=CX.rows.find(r=>(r.pre||[]).length&&sel.has(r.id));
    if(t){
      const preNames=t.pre.map(normName);
      CX.rows.forEach(r=>{ if(!preNames.includes(normName(r.n))||!sel.has(r.id)) return;
        sel.delete(r.id);   /* 같은 묶음의 다른 과목으로 채워 개수는 맞춤 */
        const alt=CX.groups[grpKey(r)].rows.find(x=>!sel.has(x.id)&&!preNames.includes(normName(x.n)));
        if(alt) sel.add(alt.id); });
    }
  }
  return [...sel];
}
const DEMO_CONTENT=[
  '희망 진로({c})를 바탕으로 관련 과목 위주로 고름. 과목별 학습량과 평가 방법을 함께 확인함.',
  '{c} 진로를 생각하고 있어 {m} 진학에 도움이 되는 과목을 우선 선택함. 부모님과도 상의했다고 함.',
  '진로가 아직 확정되지 않았으나 {c}에 관심이 많음. 기초 과목을 빠뜨리지 않도록 안내함.',
  '1차 상담 때보다 진로가 구체화됨({c}). 선택한 과목의 선이수 관계를 함께 점검함.'
];
const DEMO_PLAN=['수강신청 전 최종 선택 확인','방학 중 관련 독서 후 진로 재점검','학부모 상담 후 2차 상담 예정','선택 과목 변경 여부 2주 뒤 재확인'];

function addDemoData(){
  if(!CUR){ toast('먼저 교육과정을 불러와 주세요'); return; }
  if(demoCount().s){ toast('예시 학생이 이미 들어 있습니다'); return; }
  const rnd=demoRng(20261020);
  const y0=Math.max(1,Math.min(...CX.sems.map(k=>+String(k).split('-')[0]))-1);
  const ng=Object.keys(CX.groups).length, now=Date.now();
  const lastSem=CX.sems[CX.sems.length-1], firstSem=CX.sems[0];
  let nRec=0;
  for(let i=0;i<DEMO_N;i++){
    const b=String(1+Math.floor(i/8)), no=String(i%8+1);
    const name=DEMO_SUR[i%DEMO_SUR.length]+DEMO_GIVEN[(i*7)%DEMO_GIVEN.length]+'(예시)';
    const s=ensureStudent(String(y0),b,no,name); if(!s) continue; s.demo=true;
    if(i===6||i===13) continue;                     /* 상담 전 */
    const prof=DEMO_PROF[i%DEMO_PROF.length];
    const opt={};
    if(i===3) opt.short=Math.min(ng-1,1);           /* 미완료 */
    if(i===9) opt.breakPre=true;                     /* 선이수 위반 */
    if(i===11) opt.over=0;                           /* 묶음 초과 */
    const mk=(ids,date,k,ord)=>{
      const picks=selToPicks(ids,[]);
      DB.records.push({id:uid('r'),sid:s.id,date,counselor:'예시 담임',method:METHODS[(i+k)%3],career:prof.career,major:prof.major,
        content:DEMO_CONTENT[(i+k)%DEMO_CONTENT.length].replace('{c}',prof.career).replace('{m}',prof.major),plan:DEMO_PLAN[(i+k)%DEMO_PLAN.length],
        picks,credits:picksCredits(picks),createdAt:now+ord,updatedAt:now+ord,src:'',demo:true});
      nRec++;
    };
    if(i%4===0&&CX.sems.length>1){                    /* 두 번 상담한 학생: 1차는 앞 학기만 */
      mk(demoPick(rnd,prof,{upto:firstSem}),dayShift(-21-i),0,i*10);
      mk(demoPick(rnd,prof,opt),dayShift(-3-(i%5)),3,i*10+1);
    }else mk(demoPick(rnd,prof,opt),dayShift(-2-(i%9)),1,i*10);
  }
  DRAFT=null; save(); render();
  toast('예시 학생 '+DEMO_N+'명과 상담 기록 '+nRec+'건을 넣었습니다');
}
function removeDemoData(){
  const c=demoCount(); if(!c.s&&!c.r){ toast('지울 예시 데이터가 없습니다'); return; }
  const snap=snapDB(); const ids=new Set(DB.students.filter(s=>s.demo).map(s=>s.id)); const now=Date.now();
  DB.records.filter(r=>r.demo||ids.has(r.sid)).forEach(r=>DB.tomb[r.id]=now);
  DB.records=DB.records.filter(r=>!(r.demo||ids.has(r.sid)));
  DB.students=DB.students.filter(s=>!s.demo);
  if(DRAFT&&ids.has(DRAFT.sid)) DRAFT=null; if(ids.has(ST.sid)) ST.sid=null; if(ids.has(ST.stuSel)) ST.stuSel=null;
  save(); render(); undoToast('예시 학생 '+c.s+'명과 기록 '+c.r+'건을 지웠습니다 (실제 기록은 그대로)',snap,()=>{ const s=JSON.parse(snap); DB.tomb=s.tomb; });
}
function demoCardHtml(){
  const c=demoCount();
  return accCard('demo','연수용 예시 데이터'+(c.s?' <span class="pill p-warn">들어 있음</span>':''),''
    +'<p class="small muted" style="margin-bottom:10px">연수·시연할 때 쓰는 <b>가상의 학생 '+DEMO_N+'명과 상담 기록</b>입니다. 지금 교육과정에 맞춰 만들어지고, 선택 완료·미완료·선이수 위반·상담 전 학생이 골고루 섞여 있어 모든 탭을 바로 보여 줄 수 있습니다. 이름 끝에 「(예시)」가 붙고, 「예시 데이터 빼기」를 누르면 <b>실제 기록은 그대로 두고 예시만</b> 지워집니다. 배포용 파일에는 들어가지 않습니다.</p>'
    +'<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" id="dm-add" '+(CUR&&!c.s?'':'disabled')+'>예시 학생 넣기</button>'
    +'<button class="btn danger" id="dm-del" '+(c.s||c.r?'':'disabled')+'>예시 데이터 빼기</button>'
    +(c.s||c.r?'<span class="small muted">지금 예시 학생 '+c.s+'명 · 기록 '+c.r+'건</span>':'')+'</div>',!!c.s);
}
function bindDemoCard(){
  const a=$('#dm-add'), d=$('#dm-del');
  if(a) a.onclick=addDemoData;
  if(d) d.onclick=async()=>{ const c=demoCount(); if(!(await ask({title:'예시 데이터 빼기',msg:'<p>예시 학생 '+c.s+'명과 상담 기록 '+c.r+'건을 지웁니다. 실제 기록은 지워지지 않습니다.</p>',ok:'예시 빼기',danger:true}))) return; removeDemoData(); };
}
