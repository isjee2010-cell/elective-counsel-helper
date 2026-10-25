"""공개 저장소 안전 점검 — 커밋 전·CI에서 실행
python3 scripts/check_repo.py

1) 학생 개인정보가 들어 있을 수 있는 파일(엑셀·한글·PDF·이미지·dist 밖 HTML)이 저장소에 없는지
2) 배포 파일(dist/*.html)이 소스에서 그대로 다시 만들어지는지(재현 빌드) — 해시 비교
3) 배포 파일에 CSP 잠금이 있고, 학생 기록이 비어 있는지
"""
import hashlib, json, pathlib, re, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
BAD_EXT = {'.xlsx', '.xlsm', '.xls', '.csv', '.hwp', '.hwpx', '.pdf', '.png', '.jpg', '.jpeg', '.zip', '.docx', '.pptx'}
SKIP_DIRS = {'.git', 'node_modules'}
problems = []

def tracked_files():
    try:
        out = subprocess.run(['git', 'ls-files', '-co', '--exclude-standard'], cwd=ROOT, capture_output=True, text=True, check=True).stdout
        return [ROOT / l for l in out.splitlines() if l.strip()]
    except Exception:
        return [p for p in ROOT.rglob('*') if p.is_file() and not (set(p.relative_to(ROOT).parts) & SKIP_DIRS)]

for p in tracked_files():
    rel = p.relative_to(ROOT).as_posix()
    if p.suffix.lower() in BAD_EXT:
        problems.append(f'개인정보가 들어 있을 수 있는 파일 형식: {rel}')
    if p.suffix.lower() in {'.html', '.htm'} and not rel.startswith('dist/') and rel != 'src/shell.html':
        problems.append(f'dist/ 밖의 HTML(기록이 저장된 사본일 수 있음): {rel}')

for html in sorted((ROOT / 'dist').glob('*.html')):
    txt = html.read_text(encoding='utf-8')
    if 'http-equiv="Content-Security-Policy"' not in txt or "connect-src 'none'" not in txt:
        problems.append(f'CSP 잠금이 없음: {html.name}')
    m = re.search(r'<script id="J-DB" type="application/json">([\s\S]*?)</script>', txt)
    db = json.loads(m.group(1)) if m else None
    if not db or db.get('students') or db.get('records') or db.get('settings', {}).get('school'):
        problems.append(f'배포 파일에 학생·기록·학교명이 들어 있음: {html.name}')
    ver = re.search(r'-v([0-9.]+)\.html$', html.name)
    if ver:
        with tempfile.TemporaryDirectory() as td:
            out = pathlib.Path(td) / 'rebuild.html'
            subprocess.run([sys.executable, str(ROOT / 'build.py'), '--release', str(out)], check=True, capture_output=True)
            a = hashlib.sha256(html.read_bytes()).hexdigest(); b = hashlib.sha256(out.read_bytes()).hexdigest()
            if a != b and ver.group(1) in out.read_text(encoding='utf-8'):
                problems.append(f'재현 빌드 해시가 다름(소스와 배포 파일이 일치하지 않음): {html.name}\n  배포 {a}\n  다시 빌드 {b}')

sums = ROOT / 'dist' / 'SHA256SUMS.txt'
if sums.exists():
    for line in sums.read_text(encoding='utf-8').splitlines():
        if not line.strip(): continue
        h, name = line.split(None, 1)
        f = ROOT / 'dist' / name.strip()
        if not f.exists(): problems.append(f'SHA256SUMS에 있는 파일이 없음: {name}')
        elif hashlib.sha256(f.read_bytes()).hexdigest() != h: problems.append(f'SHA256SUMS와 해시가 다름: {name}')

if problems:
    print('✗ 점검 실패'); [print(' -', p) for p in problems]; sys.exit(1)
print('✓ 점검 통과: 개인정보 의심 파일 없음 · CSP 잠금 확인 · 배포 파일 비어 있음 · 재현 빌드 일치 · 해시 일치')
