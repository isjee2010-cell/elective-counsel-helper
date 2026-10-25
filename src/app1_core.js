'use strict';
/* =====================================================================
   선택과목 상담일지 작성 도우미 — 핵심 (데이터 · 정규화 · 교육과정 인식 · 판정 · 저장)
   ===================================================================== */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function uid(p){ return (p||'x')+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function today(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function readBlock(id){ try{ const t=document.getElementById(id).textContent.trim(); return t?JSON.parse(t):null; }catch(e){ return null; } }

const APP_VERSION='1.5', APP_DATE='2026-10-24';
const APP_NAME='선택과목 상담일지 작성 도우미', APP_SHORT='상담일지 도우미';
const MASTER = readBlock('J-MASTER') || [];   /* [과정구분, 교과군, 계열(상위), 계열(하위), 과목명, 유형] */
const TYPES = ['일반선택','진로선택','융합선택'];
const METHODS = ['면대면','전화','온라인','기타'];

/* ---------- 이름 정규화 (원본 VBA NormName / NormLoose / EngToKor 이식) ---------- */
function normName(s){
  return String(s==null?'':s).replace(/\s+/g,'')
    .replace(/Ⅰ/g,'1').replace(/Ⅱ/g,'2').replace(/Ⅲ/g,'3').replace(/Ⅳ/g,'4')
    .replace(/([가-힣])(IV)$/,'$14').replace(/([가-힣])(III)$/,'$13').replace(/([가-힣])(II)$/,'$12').replace(/([가-힣])(I)$/,'$11')
    .trim();
}
const KEYMAP={r:'ㄱ',R:'ㄲ',s:'ㄴ',e:'ㄷ',E:'ㄸ',f:'ㄹ',a:'ㅁ',q:'ㅂ',Q:'ㅃ',t:'ㅅ',T:'ㅆ',d:'ㅇ',w:'ㅈ',W:'ㅉ',c:'ㅊ',z:'ㅋ',x:'ㅌ',v:'ㅍ',g:'ㅎ',
  k:'ㅏ',o:'ㅐ',i:'ㅑ',O:'ㅒ',j:'ㅓ',p:'ㅔ',u:'ㅕ',P:'ㅖ',h:'ㅗ',y:'ㅛ',n:'ㅜ',b:'ㅠ',m:'ㅡ',l:'ㅣ'};
const CHO=['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG=['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG=['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG2={'ㅗㅏ':'ㅘ','ㅗㅐ':'ㅙ','ㅗㅣ':'ㅚ','ㅜㅓ':'ㅝ','ㅜㅔ':'ㅞ','ㅜㅣ':'ㅟ','ㅡㅣ':'ㅢ'};
const JONG2={'ㄱㅅ':'ㄳ','ㄴㅈ':'ㄵ','ㄴㅎ':'ㄶ','ㄹㄱ':'ㄺ','ㄹㅁ':'ㄻ','ㄹㅂ':'ㄼ','ㄹㅅ':'ㄽ','ㄹㅌ':'ㄾ','ㄹㅍ':'ㄿ','ㄹㅎ':'ㅀ','ㅂㅅ':'ㅄ'};
function engToKor(src){
  const J=[...src].map(ch=>KEYMAP[ch]||ch);
  const isC=x=>CHO.includes(x), isV=x=>JUNG.includes(x);
  let out='',i=0;
  while(i<J.length){
    const c=J[i];
    if(!isC(c)||i+1>=J.length||!isV(J[i+1])){ out+=c; i++; continue; }
    let v=J[i+1], p=i+2;
    if(p<J.length&&isV(J[p])&&JUNG2[v+J[p]]){ v=JUNG2[v+J[p]]; p++; }
    let t='';
    if(p<J.length&&isC(J[p])&&!(p+1<J.length&&isV(J[p+1]))){
      if(p+1<J.length&&isC(J[p+1])&&JONG2[J[p]+J[p+1]]&&!(p+2<J.length&&isV(J[p+2]))){ t=JONG2[J[p]+J[p+1]]; p+=2; }
      else if(JONG.includes(J[p])){ t=J[p]; p++; }
    }
    out+=String.fromCharCode(0xAC00+CHO.indexOf(c)*588+JUNG.indexOf(v)*28+JONG.indexOf(t));
    i=p;
  }
  return out;
}
function normLoose(s){
  let t=normName(s);
  if(/^[A-Za-z]+$/.test(t)) t=engToKor(t);
  return t.toLowerCase();
}
function normType(t){
  t=String(t||'').replace(/\s+/g,'');
  if(!t) return '';
  if(/^일반/.test(t)) return '일반선택';
  if(/^진로/.test(t)) return '진로선택';
  if(/^융합/.test(t)) return '융합선택';
  return t;
}
function typeCls(t){ return TYPES.includes(t)?('tt-'+t):'tt-etc'; }
function typeShort(t){ return ({'일반선택':'일반','진로선택':'진로','융합선택':'융합'})[t]||t||'-'; }
const MASTER_IDX=(()=>{ const m={}; MASTER.forEach(r=>{ const k=normLoose(r[4]); if(k&&!m[k]) m[k]=r; }); return m; })();

/* ---------- 교육과정 모델 ----------
   CUR = {title, school, src, at, sample, sig, rows:[{id,n,y,s,c,g,need,t,up,lo,link[],pre[],preExt[],note}], issues:[{lv,msg}]} */
function semKey(y,s){ return y+'-'+s; }
function semLabel(k){ const [y,s]=String(k).split('-'); return y+'학년 '+s+'학기'; }
function grpKey(r){ return semKey(r.y,r.s)+'|'+r.c+'|'+r.g; }
function grpLabel(r){ return r.y+'학년 '+r.s+'학기 · '+r.c+'학점 '+r.g; }
function rowKey(r){ return semKey(r.y,r.s)+'|'+r.g+'|'+normName(r.n); }

function curIndex(cur){
  const C=cur||{rows:[]};
  const rows=C.rows||[];
  const byId={}, byKey={}, byName={};
  rows.forEach(r=>{ byId[r.id]=r; byKey[rowKey(r)]=r; const nk=normLoose(r.n); (byName[nk]=byName[nk]||[]).push(r); });
  const sems=[...new Set(rows.map(r=>semKey(r.y,r.s)))].sort((a,b)=>{ const [ay,as]=a.split('-').map(Number),[by,bs]=b.split('-').map(Number); return ay-by||as-bs; });
  const pools=[]; rows.forEach(r=>{ if(!pools.includes(r.g)) pools.push(r.g); });
  const groups={}; rows.forEach(r=>{ const k=grpKey(r); if(!groups[k]) groups[k]={key:k,y:r.y,s:r.s,c:r.c,g:r.g,need:r.need,rows:[]}; groups[k].rows.push(r); });
  return {rows,byId,byKey,byName,sems,pools,groups};
}
let CUR=null, CX=curIndex(null);
function setCur(c){ if(c&&!c.checks) c.checks=rulesToChecks(c.rules||[],c.rows||[]); if(c){ delete c.rules; (c.rows||[]).forEach(r=>delete r.f); } CUR=c; CX=curIndex(c); }
/* 학교명: 교육과정에 함께 담아 배포용 파일로 전달 + 내 설정에도 보관 (교육과정을 새로 올려 학교명이 비어 있으면 이어받음) */
function schoolName(){ return String((CUR&&CUR.school)||(DB&&DB.settings&&DB.settings.school)||'').trim(); }
function setSchool(v){ v=String(v||'').trim(); DB.settings.school=v; if(CUR) CUR.school=v; save(); }
function keepSchool(c){ if(c&&!String(c.school||'').trim()) c.school=schoolName(); return c; }

function curSig(rows){
  let h=0; const s=rows.map(r=>rowKey(r)+'|'+r.need).join(';');
  for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; }
  return (h>>>0).toString(36)+'-'+rows.length;
}

/* ---------- 엑셀 셀 → 문자열 ---------- */
function cellText(v){
  if(v==null) return '';
  if(v instanceof Date) return v.getUTCFullYear()+'-'+String(v.getUTCMonth()+1).padStart(2,'0')+'-'+String(v.getUTCDate()).padStart(2,'0');
  if(typeof v==='object'){
    if(v.richText) return v.richText.map(t=>t.text).join('');
    if('result' in v) return cellText(v.result);
    if(v.text!=null) return String(v.text);
    if(v.error) return '';
    return '';
  }
  return String(v);
}
function sheetRows(ws){ /* 2차원 배열 (1-base 행/열 그대로 → 0-base로) */
  const out=[];
  ws.eachRow({includeEmpty:true},(row,rn)=>{
    const a=[]; row.eachCell({includeEmpty:true},(cell,cn)=>{ a[cn-1]=cell.value; });
    out[rn-1]=a;
  });
  return out;
}
function toInt(v){ const t=cellText(v).replace(/[^0-9.\-]/g,''); if(t==='') return NaN; const n=Number(t); return Number.isFinite(n)?n:NaN; }
function splitList(s){ return String(s||'').split(/[,，、;\n]/).map(x=>x.trim()).filter(Boolean); }

/* ---------- 교육과정 시트 인식 ----------
   이 앱 양식(교육과정 시트), 원본 상담툴(셋팅 시트), 수강신청 점검 도구(교육과정설정 시트) 모두 읽는다. */
const CUR_HEAD={
  n:['과목명','과목'], y:['학년'], s:['학기'], c:['학점','단위','이수학점'], g:['선택그룹','선택 그룹','선택묶음','그룹명','그룹'],
  need:['필요개수','필요 개수','택수','선택개수','선택 개수'], t:['유형','과목유형','과목 유형'],
  up:['계열(상위)','상위계열','계열 (상위)','교과(군)','교과군'], lo:['계열(하위)','하위계열','계열 (하위)'],
  link:['연계과목','연계 과목'], pre:['선이수과목','선이수 과목','선수과목','선수과목(이과목을고르면함께골라야하는과목)'], note:['비고','비고(선택)','메모'],
  rules:['학점기준 영역','학점기준영역','학점 기준 영역','점검 영역','점검영역','학점기준']
};
const CUR_NAMES={n:'과목명',y:'학년',s:'학기',c:'학점',g:'선택그룹',need:'필요개수',t:'유형',up:'계열(상위)',lo:'계열(하위)',link:'연계과목',pre:'선이수과목',note:'비고'};
function matchHead(txt,list){ const t=String(txt||'').replace(/\s+/g,''); return list.some(h=>{ const k=h.replace(/\s+/g,''); return k===t||(k.length>=4&&t.startsWith(k+'(')); }); }
function isOnMark(v){ const t=cellText(v).trim().toUpperCase(); return t==='1'||t==='O'||t==='○'||t==='V'||t==='Y'||t==='✓'||t==='TRUE'; }

/* 머리글 → 열 번호 (별칭은 앞에 적힌 것이 우선) */
function headCols(row,HEAD){
  const col={}, used=new Set();
  for(const k in HEAD){
    for(const alias of HEAD[k]){
      const ci=row.findIndex((v,i)=>!used.has(i)&&matchHead(v,[alias]));
      if(ci>=0){ col[k]=ci; used.add(ci); break; }
    }
  }
  return col;
}
function findCurSheet(wb){
  let found=null;
  wb.eachSheet(ws=>{
    if(found) return;
    const R=sheetRows(ws);
    for(let r=0;r<Math.min(R.length,30);r++){
      const row=(R[r]||[]).map(cellText);
      const col=headCols(row,CUR_HEAD);
      if(col.n!=null&&col.g!=null&&col.c!=null&&(col.need!=null||col.y!=null||col.s!=null)){ found={ws,R,hr:r,col,head:row}; return; }
    }
  });
  return found;
}
function findLabelValue(R,upto,labels){
  for(let r=0;r<upto;r++){
    const row=R[r]||[];
    for(let c=0;c<row.length;c++){
      const t=cellText(row[c]).replace(/\s+/g,'');
      if(labels.some(l=>t===l||t.startsWith(l+'('))){
        const lab=cellText(row[c]).trim(); for(let k=c+1;k<row.length;k++){ const v=cellText(row[k]).trim(); if(v&&v!==lab&&!/^↑|^※/.test(v)) return v; }
      }
    }
  }
  return '';
}
/* 학년·학기: 숫자 또는 "2학년 1학기" 글자 */
function parseSem(yv,sv){
  let y=toInt(yv), s=NaN; const st=cellText(sv);
  const m=st.match(/(\d)\s*학년\s*(\d)\s*학기/);
  if(m){ y=+m[1]; s=+m[2]; } else { const m2=st.match(/(\d)\s*-\s*(\d)/); if(m2&&!(y>0)){ y=+m2[1]; s=+m2[2]; } else s=toInt(sv); }
  return {y,s};
}

/* ---------- 학점 기준(영역별 학점 하한·상한) ----------
   rule = {name, base, lo, loStrict, hi}  · 과목 행의 f = [영역 이름…] */
function ruleKey(n){ return normName(String(n||'').replace(/\(.*?\)/g,'')); }
function ruleUnit(c){ return c&&c.measure==='count'?'과목':'학점'; }
function ruleCond(c){
  if(!c||(c.type&&c.type!=='sum')) return '';
  const u=ruleUnit(c), a=[];
  if(c.lo!=null&&c.lo!=='') a.push(c.lo+u+(c.loStrict?' 초과':' 이상'));
  if(c.hi!=null&&c.hi!=='') a.push(c.hi+u+' 이하');
  return a.join(' · ');
}
function readRuleSheet(wb){
  let out=null;
  wb.eachSheet(ws=>{
    if(out) return;
    const R=sheetRows(ws);
    for(let r=0;r<Math.min(R.length,15);r++){
      const row=(R[r]||[]).map(cellText); const col={};
      row.forEach((v,ci)=>{ const t=v.replace(/\s+/g,'');
        if(col.name==null&&/^(영역이름|영역|기준이름|기준명|학점기준영역)$/.test(t)) col.name=ci;
        else if(col.base==null&&/^기본학점/.test(t)) col.base=ci;
        else if(col.lo==null&&/^최소/.test(t)) col.lo=ci;
        else if(col.gt==null&&/^초과/.test(t)) col.gt=ci;
        else if(col.hi==null&&/^최대/.test(t)) col.hi=ci;
        else if(col.ms==null&&/^(세는방법|기준단위|단위)/.test(t)) col.ms=ci; });
      if(col.name!=null&&(col.lo!=null||col.hi!=null||col.base!=null)){
        out=[];
        for(let k=r+1;k<R.length;k++){ const a=R[k]||[]; const nm=cellText(a[col.name]).trim(); if(!nm) continue;
          const num=c=>{ if(c==null) return null; const v=toInt(a[c]); return Number.isFinite(v)?v:null; };
          const rule={name:nm,base:num(col.base)||0,lo:num(col.lo),loStrict:false,hi:num(col.hi),measure:col.ms!=null&&/과목|개수/.test(cellText(a[col.ms]))?'count':'credit'};
          const gt=num(col.gt); if(gt!=null&&rule.lo==null){ rule.lo=gt; rule.loStrict=true; }
          out.push(rule); }
        return;
      }
    }
  });
  return out;
}
/* 점검 도구식 설정 칸: "국영수 학점 상한 | 15", "정보/한문/교양 기준 (이 값을 초과해야 충족) | 8", "바이오IT 기본학점 | 4", "바이오IT 최소 학점 | (빈칸)" */
function readRuleLabels(R,upto){
  const rules={};
  const get=nm=>{ const k=ruleKey(nm); return rules[k]=rules[k]||{name:nm.replace(/\(.*?\)/g,'').trim(),base:0,lo:null,loStrict:false,hi:null}; };
  for(let r=0;r<upto;r++){
    const row=R[r]||[];
    for(let c=0;c<row.length;c++){
      const lab=cellText(row[c]).trim(); if(!lab||lab.length>60) continue;
      let v=null; for(let k=c+1;k<row.length;k++){ const t=cellText(row[k]).trim(); if(t!==''&&t!==lab){ v=toInt(row[k]); break; } }
      const plain=lab.replace(/\(.*?\)/g,'').trim();
      let m;
      if((m=plain.match(/^(.+?)\s*기본\s*학점/))){ if(Number.isFinite(v)) get(m[1]).base=v; }
      else if((m=plain.match(/^(.+?)\s*(학점\s*)?(상한|최대)/))){ if(Number.isFinite(v)) get(m[1]).hi=v; }
      else if((m=plain.match(/^(.+?)\s*(최소\s*학점|학점\s*하한|최소)/))){ if(Number.isFinite(v)){ const x=get(m[1]); x.lo=v; x.loStrict=false; } else get(m[1]); }
      else if((m=plain.match(/^(.+?)\s*기준$/))&&/초과/.test(lab)){ if(Number.isFinite(v)){ const x=get(m[1]); x.lo=v; x.loStrict=true; } }
      break;
    }
  }
  return Object.values(rules);
}

function parseCurriculum(wb,fname){
  const F=findCurSheet(wb);
  if(!F) return {ok:false,msg:'교육과정 표를 찾지 못했습니다. 머리글 행에 「과목명」「선택그룹」「학점」「필요개수」가 있어야 합니다.'};
  const {ws,R,hr,col,head}=F;
  const issues=[]; const E=m=>issues.push({lv:'e',msg:m}), W=m=>issues.push({lv:'w',msg:m}), I=m=>issues.push({lv:'i',msg:m});
  const miss=['n','s','c','g','need'].filter(k=>col[k]==null);
  if(miss.length) return {ok:false,msg:'「'+ws.name+'」 시트 머리글에서 다음 항목을 찾지 못했습니다: '+miss.map(k=>CUR_NAMES[k]).join(', ')};

  let title=findLabelValue(R,hr,['제목']);
  if(!title){ const tg=findLabelValue(R,hr,['대상']); if(tg) title=tg+' 선택과목 상담'; }
  if(!title){ const w2=wb.getWorksheet('상담일지 입력'); if(w2) title=cellText(w2.getCell('A1').value).trim(); }
  if(!title) title=String(fname||'').replace(/\.[^.]+$/,'');
  const school=findLabelValue(R,hr,['학교명','학교']);

  /* 학점 기준: 별도 시트 > 머리글 위 설정 칸 */
  let rules=readRuleSheet(wb)||[];
  if(!rules.length) rules=readRuleLabels(R,hr);
  const ruleBy={}; rules.forEach(r=>ruleBy[ruleKey(r.name)]=r);
  /* 영역 표시 열(값이 1/O): 기준 이름과 같은 머리글, 또는 표준 열이 아닌데 값이 전부 1/빈칸인 열 */
  const used=new Set(Object.values(col));
  const flagCols=[];
  head.forEach((h,ci)=>{
    if(used.has(ci)||!String(h).trim()) return;
    const k=ruleKey(h);
    let isFlag=!!ruleBy[k];
    if(!isFlag){
      let ones=0,other=0;
      for(let r=hr+1;r<R.length;r++){ const v=cellText((R[r]||[])[ci]).trim(); if(!v) continue; if(isOnMark(v)||v==='0') ones++; else other++; }
      isFlag=ones>0&&other===0;
    }
    if(isFlag){
      if(!ruleBy[k]){ const nr={name:String(h).replace(/\(.*?\)/g,'').replace(/\s+/g,'').trim(),base:0,lo:null,loStrict:false,hi:null}; rules.push(nr); ruleBy[k]=nr; }
      flagCols.push({ci,rule:ruleBy[k]});
    }
  });

  const rows=[]; let skipped=0, filled=0;
  const prev={y:'',s:'',g:'',need:''};
  for(let r=hr+1;r<R.length;r++){
    const a=R[r]||[]; const g=k=>col[k]==null?'':a[col[k]];
    const n=cellText(g('n')).replace(/\s+/g,' ').trim();
    /* 빈칸은 위 행 값을 이어받음 (학기·그룹명·필요개수) */
    const cur={};
    ['y','s','g','need'].forEach(k=>{ const v=cellText(g(k)).trim(); if(v){ cur[k]=g(k); prev[k]=g(k); } else { cur[k]=prev[k]; if(n&&prev[k]!==''&&col[k]!=null) filled++; } });
    if(!n) continue;
    if(/^(예\)|예시|※)/.test(n)){ continue; }
    const line=(r+1)+'행 「'+n+'」';
    const {y,s}=parseSem(cur.y,cur.s);
    const c=toInt(g('c')), need=toInt(cur.need);
    const pool=cellText(cur.g).trim();
    const bad=[];
    if(!(y>=1&&y<=3)) bad.push('학년'); if(!(s>=1&&s<=2)) bad.push('학기');
    if(!(c>0)) bad.push('학점'); if(!pool) bad.push('선택그룹'); if(!(need>0)) bad.push('필요개수');
    if(bad.length){ E(line+': '+bad.join('·')+' 값이 비었거나 숫자가 아닙니다 → 이 행은 제외했습니다.'); skipped++; continue; }
    let t=normType(cellText(g('t'))), up=cellText(g('up')).trim(), lo=cellText(g('lo')).trim();
    const m=MASTER_IDX[normLoose(n)];
    if(m){
      const mt=normType(m[5]);
      if(!t) t=mt; else if(t!==mt&&TYPES.includes(t)) I(line+': 입력한 유형('+t+')이 마스터('+mt+')와 다릅니다. 입력값을 따릅니다.');
      if(!lo) lo=(!up||normName(up)===normName(m[2]))?m[3]:'';
      if(!up) up=m[2];
    }else if(!t||!up){
      W(line+': 과목 마스터에 없는 과목이라 '+(!t?'유형':'')+(!t&&!up?'·':'')+(!up?'계열':'')+'을(를) 채우지 못했습니다. 양식에 직접 적어 주세요.');
    }
    if(!t) t='미분류'; if(!up) up='미분류'; if(!lo) lo=up;
    if(t&&!TYPES.includes(t)&&t!=='미분류') W(line+': 유형 「'+t+'」은(는) 일반선택/진로선택/융합선택이 아닙니다.');
    const f=[];
    flagCols.forEach(fc=>{ if(isOnMark(a[fc.ci])&&!f.includes(fc.rule.name)) f.push(fc.rule.name); });
    splitList(cellText(g('rules'))).forEach(nm=>{
      let rr=ruleBy[ruleKey(nm)];
      if(!rr){ rr={name:nm,base:0,lo:null,loStrict:false,hi:null}; rules.push(rr); ruleBy[ruleKey(nm)]=rr; I(line+': 학점기준 영역 「'+nm+'」은(는) 기준값이 없어 학점 합계만 보여 줍니다.'); }
      if(!f.includes(rr.name)) f.push(rr.name);
    });
    rows.push({id:'r'+rows.length,n,y,s,c,g:pool,need,t,up,lo,f,linkRaw:splitList(cellText(g('link'))),preRaw:splitList(cellText(g('pre')).replace(/·/g,',')),note:cellText(g('note')).trim(),line});
  }
  if(!rows.length) return {ok:false,msg:'「'+ws.name+'」 시트에서 과목 행을 하나도 읽지 못했습니다.'};
  if(filled) I('빈칸 '+filled+'개는 바로 위 행의 학기·그룹·필요개수를 이어받았습니다.');

  /* 중복 과목 */
  const seen={};
  rows.forEach(r=>{ const k=rowKey(r); if(seen[k]) W(r.line+': 같은 학기·선택그룹에 같은 과목이 두 번 있습니다.'); seen[k]=1; });

  /* 그룹별 필요개수 일관성 */
  const grp={}; rows.forEach(r=>{ (grp[grpKey(r)]=grp[grpKey(r)]||[]).push(r); });
  Object.values(grp).forEach(list=>{
    const cnt={}; list.forEach(r=>cnt[r.need]=(cnt[r.need]||0)+1);
    const vals=Object.keys(cnt).map(Number);
    let need=list[0].need;
    if(vals.length>1){
      need=vals.sort((a,b)=>cnt[b]-cnt[a]||b-a)[0];
      W('「'+grpLabel(list[0])+'」 그룹의 필요개수가 행마다 다릅니다('+vals.join(', ')+') → 가장 많이 적힌 '+need+'개로 맞췄습니다.');
      list.forEach(r=>r.need=need);
    }
    if(need>list.length) E('「'+grpLabel(list[0])+'」 그룹은 과목이 '+list.length+'개인데 필요개수가 '+need+'개입니다.');
  });

  /* 연계(양방향) · 선이수(존재 확인 + 학기 순서) */
  const nameIdx={}; rows.forEach(r=>{ const k=normLoose(r.n); (nameIdx[k]=nameIdx[k]||[]).push(r); });
  rows.forEach(r=>{ r.link=[]; r.pre=[]; r.preExt=[]; });
  rows.forEach(r=>{
    r.linkRaw.forEach(nm=>{
      const t=nameIdx[normLoose(nm)];
      if(!t){ W(r.line+': 연계과목 「'+nm+'」을(를) 교육과정에서 찾지 못해 뺐습니다.'); return; }
      const o=t[0]; if(o===r) return;
      if(!r.link.includes(o.n)) r.link.push(o.n);
      if(!o.link.includes(r.n)) o.link.push(r.n);
      if(normName(nm)!==normName(o.n)) I(r.line+': 연계과목 「'+nm+'」 → 「'+o.n+'」(으)로 맞췄습니다.');
    });
    r.preRaw.forEach(nm=>{
      const t=nameIdx[normLoose(nm)];
      if(!t){ r.preExt.push(nm); W(r.line+': 선이수과목 「'+nm+'」은(는) 이 교육과정 목록에 없어 확인만 표시합니다(자동 판정 제외).'); return; }
      const o=t[0]; if(o===r) return;
      if(!r.pre.includes(o.n)) r.pre.push(o.n);
      if(normName(nm)!==normName(o.n)) I(r.line+': 선이수과목 「'+nm+'」 → 「'+o.n+'」(으)로 맞췄습니다.');
      const before=t.some(x=>x.y*10+x.s<r.y*10+r.s);
      if(!before) W(r.line+': 선이수과목 「'+o.n+'」이(가) 같은 학기이거나 더 늦은 학기에 있습니다.');
    });
  });
  rows.forEach(r=>{ delete r.linkRaw; delete r.preRaw; delete r.line; });
  rules.forEach(rl=>{ const n=rows.filter(r=>r.f.includes(rl.name)).length; I('학점 기준 「'+rl.name+'」: 해당 과목 '+n+'개'+(rl.base?' · 기본 '+rl.base+'학점 포함':'')+(ruleCond(rl)?' · '+ruleCond(rl):' · 기준값 없음(합계만 표시)')); });

  const cur={title,school,src:fname||'',sheet:ws.name,at:new Date().toISOString(),sample:false,rows,issues,checks:rulesToChecks(rules,rows)};
  rows.forEach(r=>delete r.f);
  cur.sig=curSig(rows);
  const ci=curIndex(cur);
  I('「'+ws.name+'」 시트 '+(hr+1)+'행을 머리글로 인식 · 과목 '+rows.length+'개 · 선택 묶음 '+Object.keys(ci.groups).length+'개 · '+ci.sems.map(semLabel).join(', ')+(skipped?' · 제외 '+skipped+'행':''));
  return {ok:true,cur};
}

/* ---------- 검증 규칙 ----------
   check = {id,name,on,level:'bad'|'warn',type,origin:'file'|'user',
     sum   : subjects[], measure:'credit'|'count', base, lo, loStrict, hi      — 대상 과목의 학점(과목 수) 합 기준
     ifthen: subjects[](조건 과목), then[], mode:'all'|'any'|'none'           — A를 고르면 B를 모두/하나 이상/고르면 안 됨
     career: keywords, then[], mode:'all'|'any'                               — 희망 진로·학과에 낱말이 있으면 B 선택 권장 } */
function rulesToChecks(rules,rows){
  return (rules||[]).map((r,i)=>({id:'k'+i+Date.now().toString(36),name:r.name,on:true,level:'bad',type:'sum',origin:'file',
    subjects:(rows||[]).filter(x=>(x.f||[]).includes(r.name)).map(x=>x.n),measure:r.measure||'credit',base:r.base||0,lo:r.lo,loStrict:!!r.loStrict,hi:r.hi}));
}
function curChecks(){ return (CUR&&CUR.checks)||[]; }
function curRules(){ return curChecks().filter(c=>c.on!==false); }
function nameList(a,max){ a=a||[]; max=max||3; return a.length<=max?a.join('·'):a.slice(0,max).join('·')+' 외 '+(a.length-max)+'개'; }
function checkDesc(c){
  if(c.type==='ifthen') return nameList(c.subjects)+' 중 하나라도 고르면 → '+nameList(c.then)+({all:'을(를) 모두 골라야 함',any:' 중 하나 이상 골라야 함',none:'은(는) 함께 고를 수 없음'}[c.mode||'all']);
  if(c.type==='career') return '희망 진로·학과에 「'+String(c.keywords||'').trim()+'」이(가) 있으면 → '+nameList(c.then)+(c.mode==='all'?' 모두 선택':' 중 하나 이상 선택')+' 권장';
  const what=c.measure==='count'?' 중 고른 과목 수':'의 학점 합';
  return nameList(c.subjects,4)+'('+(c.subjects||[]).length+'과목)'+what+(c.base?'(기본 '+c.base+' 포함)':'')+(ruleCond(c)?(c.measure==='count'?'가 ':'이 ')+ruleCond(c):' — 기준값 없음(합계만 표시)');
}
function evalCheck(c,names,selRows,ctx){
  const has=n=>names.has(normName(n));
  const out={rule:c,ok:true,na:false,val:null,why:'',level:c.level||'bad'};
  if(c.type==='ifthen'){
    const trig=(c.subjects||[]).filter(has);
    if(!trig.length){ out.na=true; return out; }
    const B=(c.then||[]).filter(n=>!trig.some(t=>normName(t)===normName(n)));
    if(c.mode==='none'){ const hit=B.filter(has); out.ok=!hit.length; out.why=trig.join('·')+'와(과) '+hit.join('·')+' 함께 선택'; }
    else if(c.mode==='any'){ out.ok=!B.length||B.some(has); out.why=trig.join('·')+' 선택 → '+nameList(B,4)+' 중 하나 필요'; }
    else { const miss=B.filter(n=>!has(n)); out.ok=!miss.length; out.why=trig.join('·')+' 선택 → '+miss.join('·')+' 필요'; }
    return out;
  }
  if(c.type==='career'){
    const txt=normName(((ctx&&ctx.career)||'')+' '+((ctx&&ctx.major)||''));
    const kw=splitList(c.keywords).find(k=>txt&&txt.includes(normName(k)));
    if(!kw){ out.na=true; return out; }
    const B=c.then||[];
    if(c.mode==='all'){ const miss=B.filter(n=>!has(n)); out.ok=!miss.length; out.why='희망 「'+kw+'」 → '+miss.join('·')+' 권장'; }
    else { out.ok=!B.length||B.some(has); out.why='희망 「'+kw+'」 → '+nameList(B,4)+' 중 하나 권장'; }
    return out;
  }
  const S=new Set((c.subjects||[]).map(normName));
  const hit=selRows.filter(r=>S.has(normName(r.n)));
  out.val=(+c.base||0)+(c.measure==='count'?hit.length:hit.reduce((a,r)=>a+r.c,0));
  const u=ruleUnit(c), lo=c.lo===''||c.lo==null?null:+c.lo, hi=c.hi===''||c.hi==null?null:+c.hi;
  const loOk=lo==null||(c.loStrict?out.val>lo:out.val>=lo), hiOk=hi==null||out.val<=hi;
  out.ok=loOk&&hiOk; out.why=!hiOk?(hi+u+' 초과'):!loOk?(lo+u+' '+(c.loStrict?'이하':'미만')):'';
  return out;
}

/* ---------- 선택 판정 ---------- */
function evalSel(selIds,ctx){
  const sel=new Set(selIds);
  const selRows=[...sel].map(id=>CX.byId[id]).filter(Boolean);
  const selNames=new Set(selRows.map(r=>normName(r.n)));
  const groups={}; let total=0; const semCr={};
  Object.values(CX.groups).forEach(g=>{ const cnt=g.rows.filter(r=>sel.has(r.id)).length; groups[g.key]={g,cnt,need:g.need,state:cnt===g.need?'ok':cnt>g.need?'over':cnt===0?'none':'under'}; });
  const pre={}, link={};
  selRows.forEach(r=>{
    total+=r.c; const sk=semKey(r.y,r.s); semCr[sk]=(semCr[sk]||0)+r.c;
    const mp=(r.pre||[]).filter(n=>!selNames.has(normName(n))); if(mp.length) pre[r.id]=mp;
    const ml=(r.link||[]).filter(n=>!selNames.has(normName(n))); if(ml.length) link[r.id]=ml;
  });
  const rules=curRules().map(c=>evalCheck(c,selNames,selRows,ctx));
  const gl=Object.values(groups);
  return {sel,groups,total,semCr,pre,link,rules,
    nOk:gl.filter(x=>x.state==='ok').length, nGroups:gl.length,
    nOver:gl.filter(x=>x.state==='over').length, nUnder:gl.filter(x=>x.state==='under'||x.state==='none').length,
    nPre:Object.keys(pre).length, nLink:Object.keys(link).length,
    nRule:rules.filter(x=>!x.ok&&x.level!=='warn').length, nRuleWarn:rules.filter(x=>!x.ok&&x.level==='warn').length};
}
function evalStatus(ev){
  if(!ev||ev.sel.size===0) return 'none';
  if(ev.nOver||ev.nPre||ev.nRule) return 'bad';
  if(ev.nUnder||ev.nRuleWarn) return 'warn';
  return 'ok';
}

/* ---------- 기록 모델 ----------
   DB = {v, fileId, updatedAt, settings:{counselor, ban}, students:[{id,y,b,no,name}], records:[...], tomb:{recId:ts}}
   record = {id, sid, date, counselor, method, career, major, content, plan, picks:[{y,s,g,n,t,c}], credits, src, createdAt, updatedAt} */
function stuId(y,b,no,name){ return [y||'',b||'',no||'',normName(name)].join('-'); }
function pad2(n){ return String(n).padStart(2,'0'); }
function stuHakbun(s){ if(s.hb) return s.hb; if(/^\d+$/.test(s.y)&&/^\d+$/.test(s.b)&&/^\d+$/.test(s.no)) return s.y+s.b+pad2(+s.no); return ''; }
function parseHakbun(h){ const t=String(h||'').replace(/\D/g,''); if(t.length===4) return {y:t[0],b:String(+t[1]),no:String(+t.slice(2))}; if(t.length===5) return {y:t[0],b:String(+t.slice(1,3)),no:String(+t.slice(3))}; return null; }
function stuLabel(s){ return (s.y?s.y+'학년 ':'')+(s.b?s.b+'반 ':'')+(s.no?s.no+'번 ':'')+dn(s.name); }
function stuNo(s){ return (s.b||'-')+'-'+String(s.no||'-').padStart(2,'0'); }
function emptyDB(){ return {v:1,fileId:uid('f'),updatedAt:0,settings:{counselor:'',ban:'',school:''},students:[],records:[],tomb:{}}; }
function fixDB(d){
  d=d&&typeof d==='object'?d:emptyDB();
  d.v=1; if(!d.fileId) d.fileId=uid('f');
  d.settings=Object.assign({counselor:'',ban:'',school:''},d.settings||{});
  d.students=Array.isArray(d.students)?d.students:[];
  d.records=Array.isArray(d.records)?d.records:[];
  d.tomb=d.tomb&&typeof d.tomb==='object'?d.tomb:{};
  d.updatedAt=d.updatedAt||0;
  return d;
}
function ensureStudent(y,b,no,name){
  name=String(name||'').trim(); if(!name) return null;
  const id=stuId(y,b,no,name);
  let s=DB.students.find(x=>x.id===id);
  if(!s){ s={id,y:String(y||''),b:String(b||''),no:String(no||''),name}; DB.students.push(s); }
  return s;
}
function sortStudents(list){
  return list.slice().sort((a,b)=>(+a.y||0)-(+b.y||0)||(+a.b||0)-(+b.b||0)||String(a.b).localeCompare(String(b.b))||(+a.no||0)-(+b.no||0)||a.name.localeCompare(b.name,'ko'));
}
function recsOf(sid){ return DB.records.filter(r=>r.sid===sid).sort((a,b)=>String(a.date).localeCompare(String(b.date))||(a.createdAt||0)-(b.createdAt||0)); }
function latestRec(sid){ const l=recsOf(sid); return l.length?l[l.length-1]:null; }

/* 기록의 과목 ↔ 현재 교육과정 행 */
function matchPick(p){
  let r=CX.byKey[semKey(p.y,p.s)+'|'+p.g+'|'+normName(p.n)];
  if(r) return r;
  const cand=CX.byName[normLoose(p.n)]||[];
  return cand.find(x=>x.y==p.y&&x.s==p.s) || (p.y?null:cand[0]) || null;
}
function picksToSel(picks){ const ids=[], extra=[]; (picks||[]).forEach(p=>{ const r=matchPick(p); if(r) ids.push(r.id); else extra.push(p); }); return {ids,extra}; }
function selToPicks(ids,extra){
  const ps=ids.map(id=>CX.byId[id]).filter(Boolean).sort((a,b)=>a.y-b.y||a.s-b.s||CX.rows.indexOf(a)-CX.rows.indexOf(b)).map(r=>({y:r.y,s:r.s,g:r.g,n:r.n,t:r.t,c:r.c}));
  return ps.concat(extra||[]);
}
function picksCredits(picks){ return (picks||[]).reduce((a,p)=>a+(+p.c||0),0); }
function picksText(picks){ /* 원본 엑셀 '선택 과목 목록' 형식 */
  const by={}; (picks||[]).forEach(p=>{ const k=(p.y&&p.s)?semKey(p.y,p.s):'?'; (by[k]=by[k]||[]).push(p); });
  return Object.keys(by).sort().map(k=>'['+(k==='?'?'학기 미상':semLabel(k))+']\n'+by[k].map(p=>p.n+' ('+(p.t||'')+')').join('\n')).join('\n\n');
}
function parsePicksText(txt){
  const out=[]; let y=0,s=0;
  String(txt||'').split(/\r?\n/).forEach(line=>{
    line=line.trim(); if(!line) return;
    const m=line.match(/^\[\s*(\d)\s*학년\s*(\d)\s*학기\s*\]$/);
    if(m){ y=+m[1]; s=+m[2]; return; }
    if(/^\[.*\]$/.test(line)) return;
    const mm=line.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
    const n=(mm?mm[1]:line).trim(), t=normType(mm?mm[2]:'');
    if(n) out.push({y,s,g:'',n,t,c:0});
  });
  /* 현재 교육과정으로 보정 (선택그룹·학점·정식 이름) */
  return out.map(p=>{ const r=matchPick(p); return r?{y:r.y,s:r.s,g:r.g,n:r.n,t:r.t,c:r.c}:p; });
}
function recEval(rec){ const {ids}=picksToSel(rec.picks); return evalSel(ids,{career:rec.career,major:rec.major}); }

/* =====================================================================
   저장소 — 이 HTML 파일 자체에 저장 (크롬·엣지) + 브라우저 임시 저장
   ===================================================================== */
const FSA=!!window.showOpenFilePicker;
const SCRIPT_TAG='scr'+'ipt';
function blockRe(id){ return new RegExp('(<'+SCRIPT_TAG+' id="'+id+'" type="application/json">)[\\s\\S]*?(<\\/'+SCRIPT_TAG+'>)'); }
function jsonForHtml(o){ return JSON.stringify(o).replace(/</g,'\\u003c').replace(new RegExp('\\u2028','g'),'\\u2028').replace(new RegExp('\\u2029','g'),'\\u2029'); }
function buildHtml(tpl,db,cur){
  let out=tpl.replace(blockRe('J-DB'),(m,a,b)=>a+jsonForHtml(db)+b);
  out=out.replace(blockRe('J-CUR'),(m,a,b)=>a+jsonForHtml(cur)+b);
  return out;
}
function extractBlock(txt,id){ const m=String(txt).match(blockRe(id)); if(!m) return undefined; const body=m[0].slice(m[1].length,m[0].length-m[2].length).trim(); try{ return body?JSON.parse(body):null; }catch(e){ return undefined; } }
function isAppHtml(txt){ return /data-app="elective-counsel"/.test(txt)&&blockRe('J-DB').test(txt); }

let DB=null, selfHandle=null, selfTpl=null, fileDirty=false, saveT=null, bootMsg='';
(function boot(){
  const embDb=fixDB(readBlock('J-DB')), embCur=readBlock('J-CUR');
  let db=embDb, cur=embCur;
  try{
    const raw=localStorage.getItem('ecs:'+embDb.fileId);
    if(raw){ const p=JSON.parse(raw); if(p&&p.db&&(p.db.updatedAt||0)>(embDb.updatedAt||0)){ db=fixDB(p.db); cur=p.cur||embCur; bootMsg='이 PC에 임시 보관된 더 최신 기록을 불러왔습니다. 「파일에 저장 연결」을 눌러 파일에도 저장해 두세요.'; } }
  }catch(e){}
  DB=db; setCur(cur&&cur.rows?cur:null);
})();
function lsKey(){ return 'ecs:'+DB.fileId; }
function lsClear(){ try{ localStorage.removeItem(lsKey()); }catch(e){} }
function lsHas(){ try{ return !!localStorage.getItem(lsKey()); }catch(e){ return false; } }
function lsOtherKeys(){ try{ return Object.keys(localStorage).filter(k=>k.startsWith('ecs:')&&k!==lsKey()); }catch(e){ return []; } }
/* 같은 파일을 다른 창·다른 사람이 동시에 열어 저장한 경우: 덮어쓰기 전에 파일 쪽 기록을 먼저 합친다 */
let lastWriteMod=0, conflictWarned=false;
async function writeSelf(){
  if(!selfHandle||!selfTpl) return false;
  try{
    if(lastWriteMod){
      const f=await selfHandle.getFile();
      if(f.lastModified>lastWriteMod+1000){
        const inc=extractBlock(await f.text(),'J-DB');
        if(inc&&Array.isArray(inc.records)){
          if(inc.fileId&&inc.fileId!==DB.fileId){
            selfHandle=null; syncLinkUi();
            modal('파일이 다른 파일로 바뀌었습니다','<p>연결해 둔 자리에 <b>다른 '+APP_SHORT+' 파일</b>이 저장되어 있어, 덮어쓰지 않고 자동 저장을 멈췄습니다.</p><p class="small muted" style="margin-top:8px">지금 화면의 기록은 「🔒 백업·지우기 → 백업 받기」로 먼저 받아 두세요.</p>');
            return false;
          }
          const r=mergeDb(inc,'');
          setTimeout(()=>{ render(); if(!conflictWarned){ conflictWarned=true;
            modal('다른 곳에서 이 파일이 바뀌었습니다','<p>같은 파일을 <b>다른 창이나 다른 선생님</b>이 열어 저장한 내용이 있었습니다. 덮어쓰지 않고 <b>양쪽 기록을 합쳐서</b> 저장했습니다'+(r.added||r.updated?' (가져온 기록 '+(r.added+r.updated)+'건)':'')+'.</p><p class="small muted" style="margin-top:8px">한 파일은 한 사람·한 창에서만 열어 주세요. 다른 창은 닫는 것이 안전합니다.</p>'); }
            else toast('다른 곳에서 바뀐 내용을 합쳐 저장했습니다'); },0);
        }
      }
    }
    const w=await selfHandle.createWritable(); await w.write(buildHtml(selfTpl,DB,CUR)); await w.close();
    try{ lastWriteMod=(await selfHandle.getFile()).lastModified; }catch(e){ lastWriteMod=Date.now(); }
    fileDirty=false; return true;
  }catch(e){ console.warn(e); return false; }
}
function save(){
  DB.updatedAt=Date.now(); fileDirty=true;
  clearTimeout(saveT);
  saveT=setTimeout(async()=>{
    let ok=true, toFile=false;
    if(selfHandle) toFile=await writeSelf();
    /* 파일에 저장되면 브라우저 사본은 남기지 않음 (파일 저장 실패 때만 안전용으로 남김) */
    if(toFile) lsClear(); else { try{ localStorage.setItem(lsKey(),JSON.stringify({db:DB,cur:CUR})); }catch(e){ ok=false; } }
    if(selfHandle&&!toFile) ok=false;
    const t=new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
    $('#save-ind').textContent=selfHandle?(toFile?'마지막 저장 '+t:'⚠ 파일 저장 실패 '+t):(ok?'임시 저장 '+t:'⚠ 임시 저장 실패');
    syncLinkUi();
  },350);
}
/* 연결한 파일 핸들은 이 브라우저(IndexedDB)에 기억해 두었다가, 다음에 열 때 버튼 한 번으로 다시 연결 */
function idb(){ return new Promise((res,rej)=>{ const r=indexedDB.open('ecs-handles',1); r.onupgradeneeded=()=>r.result.createObjectStore('h'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
async function idbSet(k,v){ try{ const d=await idb(); await new Promise(res=>{ const t=d.transaction('h','readwrite'); t.objectStore('h').put(v,k); t.oncomplete=res; t.onerror=res; }); }catch(e){} }
async function idbDel(k){ try{ const d=await idb(); await new Promise(res=>{ const t=d.transaction('h','readwrite'); t.objectStore('h').delete(k); t.oncomplete=res; t.onerror=res; }); }catch(e){} }
async function idbGet(k){ try{ const d=await idb(); return await new Promise(res=>{ const q=d.transaction('h').objectStore('h').get(k); q.onsuccess=()=>res(q.result||null); q.onerror=()=>res(null); }); }catch(e){ return null; } }
let savedHandle=null;
async function attachHandle(h){
  const txt=await (await h.getFile()).text();
  if(!isAppHtml(txt)){ toast('이 앱 파일이 아닙니다 — 지금 열려 있는 '+APP_SHORT+' HTML 파일을 선택해 주세요'); return false; }
  const fdb=extractBlock(txt,'J-DB');
  if(fdb&&fdb.fileId&&fdb.fileId!==DB.fileId&&(fdb.records||[]).length){
    if(!(await ask({title:'다른 기록이 든 파일입니다',msg:'<p>선택한 파일에는 다른 기록('+fdb.records.length+'건)이 들어 있습니다. 지금 화면의 기록으로 덮어쓸까요?</p><p class="small muted" style="margin-top:6px">다른 선생님 파일이라면 취소하고 「학년 현황 → 파일 합치기」를 쓰세요.</p>',ok:'덮어쓰기',danger:true}))) return false;
  }else if(fdb&&fdb.fileId===DB.fileId&&(fdb.updatedAt||0)>(DB.updatedAt||0)){
    const pick=await ask({title:'파일에 더 최근 기록이 있습니다',msg:'<p>선택한 파일에 지금 화면보다 <b>더 최근 기록</b>이 있습니다. 어느 쪽을 쓸까요?</p>',ok:'파일의 기록 불러오기',cancel:'지금 화면 기록으로 덮어쓰기',noDismiss:true});
    if(pick){
      DB=fixDB(fdb); const fc=extractBlock(txt,'J-CUR'); if(fc&&fc.rows) setCur(fc); DRAFT=null;
    }
  }
  if((await h.requestPermission({mode:'readwrite'}))!=='granted'){ toast('파일 쓰기 권한이 필요합니다'); return false; }
  /* 공개 배포본(모두 같은 파일 번호)을 처음 연결할 때는 이 사본만의 번호를 새로 붙임
     → 같은 PC의 다른 선생님 사본과 임시 저장·「다시 연결」 기억이 섞이지 않게 */
  let oldKey=null;
  if(fdb&&fdb.fileId===DB.fileId&&!(fdb.records||[]).length&&!(fdb.students||[]).length&&!fdb.updatedAt){ oldKey=lsKey(); DB.fileId=uid('f'); }
  selfHandle=h; selfTpl=txt; savedHandle=h;
  idbSet('h:'+DB.fileId,h);
  const ok=await writeSelf();
  if(ok&&oldKey){ try{ localStorage.removeItem(oldKey); }catch(e){} }
  toast(ok?'연결 완료 — 이제 모든 변경이 이 파일에 자동 저장됩니다':'연결은 됐지만 저장에 실패했습니다');
  save(); if(typeof render==='function') render();
  return ok;
}
async function connectSelf(){
  if(!FSA){ alert('이 브라우저는 파일 자체 저장을 지원하지 않습니다.\n크롬 또는 엣지에서 열어 주세요.\n(지금은 이 PC의 브라우저에만 임시 저장됩니다)'); return; }
  try{
    if(savedHandle){
      try{ if(await attachHandle(savedHandle)) return; }catch(e){ console.warn(e); savedHandle=null; }
      if(selfHandle) return;
    }
    const [h]=await window.showOpenFilePicker({types:[{description:APP_NAME+' HTML',accept:{'text/html':['.html','.htm']}}]});
    await attachHandle(h);
  }catch(e){ if(e&&e.name!=='AbortError'){ console.warn(e); toast('파일 연결에 실패했습니다'); } }
}
function syncLinkUi(){
  const b=$('#b-link');
  /* 저장 상태 단추 하나에 「상태(점·제목) + 마지막 저장 시각」을 함께 보여 줌 */
  const t=b.querySelector('.st-t'), err=/^⚠/.test(($('#save-ind')||{}).textContent||'');
  const set=(cls,txt,tip)=>{ b.className='hbtn st-btn '+cls+(err?' st-err':''); t.textContent=txt; b.title=tip; };
  if(!FSA){ set('st-off','브라우저에만 임시 저장','이 브라우저는 파일 자체 저장을 지원하지 않습니다. 크롬·엣지에서 열면 HTML 파일 안에 저장할 수 있습니다'); return; }
  if(selfHandle) set('st-on','파일에 자동 저장 중','변경할 때마다 이 HTML 파일에 바로 저장됩니다');
  else if(savedHandle) set('st-re','「'+savedHandle.name+'」 다시 연결','지난번에 연결한 파일입니다. 누르면 권한 확인 후 바로 연결됩니다');
  else set('st-no','파일에 저장 연결','아직 파일에 연결되지 않아 이 브라우저에만 임시 저장됩니다. 누르고 지금 열려 있는 이 HTML 파일을 한 번 고르면, 이후 자동으로 파일 안에 저장됩니다');
}
if(FSA) idbGet('h:'+DB.fileId).then(h=>{ if(h&&!selfHandle){ savedHandle=h; syncLinkUi(); } });
window.addEventListener('beforeunload',e=>{
  if((FSA&&!selfHandle&&fileDirty)||(typeof isDraftDirty==='function'&&isDraftDirty())){ e.preventDefault(); e.returnValue=''; }
});
/* 앱 원본 텍스트 확보 (배포본 만들기 등) — 연결된 파일이 있으면 그것을, 없으면 사용자에게 선택 요청 */
function getTemplate(){
  return new Promise((res)=>{
    if(selfTpl) return res(selfTpl);
    const inp=$('#f-self');
    inp.onchange=async()=>{ const f=inp.files[0]; inp.value=''; if(!f) return res(null); const t=await f.text(); if(!isAppHtml(t)){ toast(APP_SHORT+' HTML 파일이 아닙니다'); return res(null); } res(t); };
    toast('지금 열려 있는 '+APP_SHORT+' HTML 파일을 선택해 주세요');
    inp.click();
  });
}
