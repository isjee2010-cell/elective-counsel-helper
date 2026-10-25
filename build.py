"""선택과목 상담일지 작성 도우미 — 단일 HTML 빌드
사용: python3 build.py [출력경로]
- src/ 의 화면·코드와 vendor/exceljs.min.js 를 한 파일로 합칩니다.
- 실행되는 스크립트마다 SHA-256 해시를 계산해 CSP(Content-Security-Policy)에 넣습니다.
  → 이 파일은 인터넷으로 아무것도 보내거나 받을 수 없고, 파일에 없던 스크립트는 실행되지 않습니다.
"""
import json, sys, secrets, pathlib, hashlib, base64, re

B = pathlib.Path(__file__).resolve().parent
src = B / 'src'

def first(*cands):
    for c in cands:
        if c.exists(): return c
    raise SystemExit('찾을 수 없음: ' + ', '.join(map(str, cands)))

def j(o):
    return json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')

FILES = ['app1_core.js', 'app2_ui.js', 'app2c_kit.js', 'app2d_plus.js', 'app2b_views.js', 'app3_io.js',
         'app3b_backup.js', 'app3c_neis.js', 'app3d_demo.js', 'app3e_pickup.js']
shell = (src / 'shell.html').read_text(encoding='utf-8')
css = (src / 'app.css').read_text(encoding='utf-8')
app = '\n'.join((src / f).read_text(encoding='utf-8') for f in FILES) + '\ninit();\n'
assert '</script' not in app.lower(), 'script close tag in app'
exceljs = first(B / 'vendor/exceljs.min.js', B / 'node_modules/exceljs/dist/exceljs.min.js').read_text(encoding='utf-8')
assert '</script' not in exceljs.lower()
master = json.load(open(first(B / 'data/master.json', B / 'master.json'), encoding='utf-8'))
cur_path = first(B / 'data/sample_curriculum.json', B / 'sample_cur_parsed.json')
cur = json.load(open(cur_path, encoding='utf-8')) if '--nocur' not in sys.argv else None
if cur: cur['school'] = ''  # 학교명은 사용자가 설정에서 입력
# --release: 같은 소스 → 언제나 같은 파일(재현 가능한 빌드). 누구나 다시 빌드해 해시를 비교할 수 있음.
#            (모든 사람이 같은 파일 번호를 갖지만, 앱이 처음 「파일에 저장 연결」할 때 사본마다 새 번호를 붙임)
VER = re.search(r"APP_VERSION='([^']+)'", (src / 'app1_core.js').read_text(encoding='utf-8')).group(1)
FILE_ID = ('f' + hashlib.sha256(('release-' + VER).encode()).hexdigest()[:12]) if '--release' in sys.argv else ('f' + secrets.token_hex(6))
db = {"v": 1, "fileId": FILE_ID, "updatedAt": 0,
      "settings": {"counselor": "", "ban": "", "school": ""}, "students": [], "records": [], "tomb": {}}
out = (shell.replace('/*@@CSS@@*/', css)
       .replace('/*@@MASTER@@*/', j(master))
       .replace('/*@@CUR@@*/', j(cur) if cur else 'null')
       .replace('/*@@DB@@*/', j(db))
       .replace('/*@@EXCELJS@@*/', exceljs)
       .replace('/*@@APP@@*/', app))

# 실행 스크립트(<script> — type 없는 것)만 해시. 데이터 블록(type="application/json")은 실행되지 않으므로 제외
hashes = ["'sha256-" + base64.b64encode(hashlib.sha256(m.group(1).encode('utf-8')).digest()).decode() + "'"
          for m in re.finditer(r'<script>([\s\S]*?)</script>', out)]
assert len(hashes) == 2, hashes
csp = ("default-src 'none'; script-src " + ' '.join(hashes) +
       "; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; "
       "form-action 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'none'")
out = out.replace('<!--@@CSP@@-->', '<meta http-equiv="Content-Security-Policy" content="' + csp + '">')
assert 'http-equiv="Content-Security-Policy"' in out

args = [a for a in sys.argv[1:] if not a.startswith('--')]
dst = pathlib.Path(args[0] if args else B / 'dist.html')
dst.write_bytes(out.encode('utf-8'))   # 줄바꿈을 그대로(LF) 써서 운영체제와 관계없이 같은 해시
print(dst, len(out), 'sha256=' + hashlib.sha256(out.encode('utf-8')).hexdigest())
