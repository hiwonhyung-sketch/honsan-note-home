#!/usr/bin/env node
/**
 * build-legal — 앱의 개인정보처리방침·이용약관 원본에서 홈페이지 페이지를 만든다.
 *
 *   원본(정본) : honsan-native/docs/PRIVACY.md · docs/TERMS.md   ← 앱 화면이 읽는 바로 그 파일
 *   산출       : privacy/index.html · terms/index.html           (자동 생성물 — 손으로 고치지 말 것)
 *
 *   node build-legal.cjs           페이지를 만든다
 *   node build-legal.cjs --check   원본·웹 페이지·앱 내장 사본의 해시가 모두 같은지 본다(다르면 exit 1)
 *
 * ★해시 = 앱 생성기(build-privacy-doc.cjs / build-terms-doc.cjs)와 같은 방식(CRLF→LF 뒤 sha256 앞 16자).
 *   그래서 «앱 안 사본 = 웹 페이지 = 원본»을 숫자 하나로 대조할 수 있다.
 * ★정직 한계: 이 검사는 «같은 글인가»만 본다 — 글이 법적으로 맞는지는 모른다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HERE = __dirname;
const APP = path.join(HERE, '..', '..', 'honsan-native');

const DOCS = [
  { key: 'privacy', src: 'docs/PRIVACY.md', gen: 'src/privacyDoc.ts', hashConst: 'PRIVACY_DOC_HASH',
    out: 'privacy/index.html', name: '개인정보 처리방침', other: { href: '/terms/', label: '이용약관' } },
  { key: 'terms', src: 'docs/TERMS.md', gen: 'src/termsDoc.ts', hashConst: 'TERMS_DOC_HASH',
    out: 'terms/index.html', name: '이용약관', other: { href: '/privacy/', label: '개인정보 처리방침' } },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const readNorm = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const hashOf = (md) => crypto.createHash('sha256').update(md).digest('hex').slice(0, 16);

/** 원본 마크다운(부분집합: # ## · 번호목록 · 글머리 · 표 · 문단)을 블록으로 읽는다. 모르는 모양이면 멈춘다. */
function parse(md) {
  const text = md.replace(/<!--[\s\S]*?-->/g, '');
  const lines = text.split('\n');
  const blocks = [];
  let title = '';
  let list = null;
  let tbl = null;
  let h2n = 0;
  const closeList = () => { if (list) { blocks.push(list); list = null; } };
  const closeTbl = () => {
    if (!tbl) return;
    const rows = tbl.filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c)));
    blocks.push({ t: 'table', head: rows[0], rows: rows.slice(1) });
    tbl = null;
  };
  for (const raw of lines) {
    const ln = raw.replace(/\s+$/, '');
    if (!ln.trim()) continue;
    if (/^\|/.test(ln)) {
      closeList();
      const cells = ln.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      (tbl = tbl || []).push(cells);
      continue;
    }
    closeTbl();
    let m;
    if ((m = /^# (.+)$/.exec(ln))) { closeList(); title = m[1].trim(); continue; }
    if ((m = /^## (.+)$/.exec(ln))) { closeList(); h2n += 1; blocks.push({ t: 'h2', text: m[1].trim(), id: 's' + h2n }); continue; }
    if ((m = /^(\d+)\. (.+)$/.exec(ln))) {
      if (!list || list.t !== 'ol') { closeList(); list = { t: 'ol', items: [] }; }
      list.items.push({ n: Number(m[1]), text: m[2].trim() });
      continue;
    }
    if ((m = /^[-*] (.+)$/.exec(ln))) {
      if (!list || list.t !== 'ul') { closeList(); list = { t: 'ul', items: [] }; }
      list.items.push({ text: m[1].trim() });
      continue;
    }
    if (/^\s/.test(raw) || /^#{3,}/.test(ln) || /^>/.test(ln) || /\*\*|`|\]\(/.test(ln)) {
      throw new Error('변환기가 모르는 마크다운 모양입니다 → 변환기를 먼저 고치세요: ' + ln.slice(0, 60));
    }
    closeList();
    blocks.push({ t: 'p', text: ln.trim() });
  }
  closeList();
  closeTbl();
  if (!title) throw new Error('H1 제목이 없습니다');
  return { title, blocks };
}

function bodyHtml(blocks) {
  return blocks.map((b) => {
    if (b.t === 'h2') return '<h2 id="' + b.id + '">' + esc(b.text) + '</h2>';
    if (b.t === 'p') return '<p>' + esc(b.text) + '</p>';
    if (b.t === 'ul') return '<ul>' + b.items.map((i) => '<li>' + esc(i.text) + '</li>').join('') + '</ul>';
    if (b.t === 'ol') return '<ol>' + b.items.map((i) => '<li value="' + i.n + '">' + esc(i.text) + '</li>').join('') + '</ol>';
    if (b.t === 'table') {
      const th = b.head.map((c) => '<th scope="col">' + esc(c) + '</th>').join('');
      const tr = b.rows.map((r) => '<tr>' + r.map((c, k) => (k === 0 ? '<th scope="row">' + esc(c) + '</th>' : '<td data-label="' + esc(b.head[k] || '') + '">' + esc(c) + '</td>')).join('') + '</tr>').join('');
      return '<div class="tw"><table><thead><tr>' + th + '</tr></thead><tbody>' + tr + '</tbody></table></div>';
    }
    return '';
  }).join('\n');
}

const CSS = [
  '@font-face{font-family:"Pretendard KR";src:url(/fonts/pretendard-ks.woff2) format("woff2-variations"),url(/fonts/pretendard-ks.woff2) format("woff2");font-weight:100 900;font-style:normal;font-display:swap;}',
  ':root{color-scheme:light;--paper:#F5F7F6;--raise:#FFFFFF;--ink:#14181B;--ink2:#525960;--ink3:#889097;--line:#E7EBEA;--line2:#D9DFDD;',
  '  --green:#2D7D34;--green-deep:#1B5722;--green-soft:#E9F6EC;--dark:#101613;',
  '  --sans:"Pretendard KR",Pretendard,-apple-system,BlinkMacSystemFont,system-ui,"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif;--edge:clamp(22px,5vw,72px);}',
  '*,*::before,*::after{box-sizing:border-box;}',
  'html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;scroll-padding-top:78px;}',
  'body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.8;word-break:keep-all;overflow-wrap:normal;-webkit-font-smoothing:antialiased;min-height:100vh;display:flex;flex-direction:column;}',
  'h1,h2,p,ul,ol,li{margin:0;padding:0;}',
  'ul,ol{list-style:none;}',
  'a{color:inherit;text-decoration:none;}',
  '::selection{background:var(--green-soft);color:var(--green-deep);}',
  ':focus-visible{outline:2px solid var(--green);outline-offset:3px;border-radius:6px;}',
  '.wrap{width:100%;margin-inline:auto;padding-inline:var(--edge);}',
  '.nav{position:sticky;top:0;z-index:60;background:rgba(245,247,246,.9);backdrop-filter:saturate(180%) blur(14px);-webkit-backdrop-filter:saturate(180%) blur(14px);box-shadow:0 1px 0 var(--line);}',
  '.nav-in{display:flex;align-items:center;height:62px;max-width:1160px;}',
  '.brand{display:flex;align-items:center;gap:9px;font-size:17px;font-weight:800;letter-spacing:-.04em;color:var(--ink);}',
  '.brand svg{width:24px;height:24px;flex:0 0 auto;}',
  '.nav-home{margin-left:auto;display:inline-flex;align-items:center;min-height:44px;font-size:13px;font-weight:700;letter-spacing:-.02em;color:var(--ink2);padding:0 4px 0 12px;}',
  '.nav-home:hover{color:var(--green-deep);}',
  'main{flex:1 0 auto;}',
  '.doc{max-width:760px;padding-block:clamp(40px,7vw,80px) clamp(64px,9vw,112px);}',
  '.dhead h1{font-size:clamp(28px,4.4vw,40px);line-height:1.25;letter-spacing:-.045em;font-weight:800;}',
  '.dhead .meta{margin-top:12px;font-size:14.5px;line-height:1.7;color:var(--ink2);}',
  '.dhead .meta b{color:var(--ink);font-weight:700;}',
  '.toc{margin-top:clamp(24px,4vw,34px);background:var(--raise);border:1px solid var(--line);border-radius:18px;}',
  '.toc summary{cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;min-height:52px;padding:0 clamp(18px,3.4vw,26px);font-size:15px;font-weight:700;letter-spacing:-.02em;}',
  '.toc summary::-webkit-details-marker{display:none;}',
  '.toc summary::after{content:"";width:9px;height:9px;border-right:2px solid var(--ink3);border-bottom:2px solid var(--ink3);transform:rotate(45deg);margin-top:-4px;transition:transform .2s;}',
  '.toc[open] summary::after{transform:rotate(-135deg);margin-top:4px;}',
  '.toc ol{padding:4px clamp(18px,3.4vw,26px) 18px;border-top:1px solid var(--line);}',
  '.toc li a{display:block;padding:7px 0;font-size:14.5px;line-height:1.5;color:var(--ink2);}',
  '.toc li a:hover{color:var(--green-deep);}',
  '.card{margin-top:clamp(20px,3vw,28px);background:var(--raise);border:1px solid var(--line);border-radius:22px;padding:clamp(22px,4.4vw,44px);box-shadow:0 1px 2px rgba(16,22,19,.04),0 10px 30px rgba(16,22,19,.04);}',
  '.body h2{margin-top:2.1em;font-size:clamp(18px,2.4vw,21px);line-height:1.4;letter-spacing:-.03em;font-weight:800;}',
  '.body h2:first-child,.body > :first-child{margin-top:0;}',
  '.body p{margin-top:.8em;font-size:15.5px;line-height:1.85;color:var(--ink2);}',
  '.body ol,.body ul{margin-top:.8em;}',
  '.body li{position:relative;margin-top:.55em;padding-left:1.9em;font-size:15.5px;line-height:1.85;color:var(--ink2);}',
  '.body ol li::before{content:attr(value) ".";position:absolute;left:0;top:0;width:1.6em;text-align:right;font-variant-numeric:tabular-nums;font-weight:700;color:var(--ink);}',
  '.body ul li::before{content:"";position:absolute;left:.55em;top:.95em;width:5px;height:5px;border-radius:50%;background:var(--ink3);}',
  '.tw{margin-top:1em;border:1px solid var(--line);border-radius:14px;overflow:hidden;}',
  '.tw table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:13.5px;line-height:1.65;}',
  '.tw th,.tw td{padding:11px 12px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line);color:var(--ink2);overflow-wrap:anywhere;}',
  '.tw thead th:first-child,.tw tbody th{width:19%;}',
  '.tw thead th{background:#F5F7F6;color:var(--ink);font-weight:700;white-space:nowrap;}',
  '.tw tbody th{color:var(--ink);font-weight:700;}',
  '.tw tr:last-child th,.tw tr:last-child td{border-bottom:0;}',
  '.after{margin-top:clamp(22px,3.4vw,30px);display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;font-size:13.5px;line-height:1.7;color:var(--ink3);}',
  '.after a{color:var(--green-deep);font-weight:700;text-decoration:underline;text-underline-offset:3px;}',
  'footer{background:var(--dark);color:rgba(255,255,255,.5);border-top:1px solid rgba(255,255,255,.1);}',
  '.foot{max-width:1160px;padding-block:34px 46px;display:flex;flex-wrap:wrap;align-items:center;gap:14px 22px;line-height:1.8;}',
  '.foot .fb{display:flex;align-items:center;gap:9px;font-size:15px;font-weight:800;letter-spacing:-.04em;color:#fff;}',
  '.biz{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;line-height:1.7;}',
  '.biz b{color:rgba(255,255,255,.72);font-weight:600;}',
  '.biz .sep{opacity:.3;}',
  '.fls{display:inline-flex;flex-wrap:wrap;gap:0 14px;}',
  '.fls a{display:inline-flex;align-items:center;min-height:44px;padding:0 4px;font-size:12.5px;font-weight:600;color:rgba(255,255,255,.72);text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(255,255,255,.28);}',
  '.fls a:hover,.fls a[aria-current]{color:#fff;}',
  '.foot .cp{margin-left:auto;font-size:12px;letter-spacing:.02em;}',
  '@media (max-width:640px){.tw table,.tw tbody,.tw tr,.tw th,.tw td{display:block;width:auto;}.tw thead{display:none;}.tw tr{padding:12px 14px;border-bottom:1px solid var(--line);}.tw tr:last-child{border-bottom:0;}.tw th,.tw td{padding:0;border:0;}.tw tbody th{width:auto;font-size:15px;margin-bottom:6px;}.tw td{margin-top:7px;font-size:14px;}.tw td::before{content:attr(data-label);display:block;font-size:12px;font-weight:700;color:var(--ink3);letter-spacing:-.01em;}}',
  '@media (max-width:640px){.foot .cp{margin-left:0;}.biz{flex-direction:column;gap:3px;}.biz .sep{display:none;}.body li,.body p{font-size:15px;}}',
  '@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto;}*{transition:none !important;}}',
  '@media print{.nav,footer,.toc,.after{display:none;}body{background:#fff;}.card{border:0;box-shadow:none;padding:0;}}',
].join('\n');

const MARK = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M2 26 9.6 16.4 15.2 23 22 13.4 30 26Z" fill="currentColor"/><circle cx="24" cy="7.4" r="3.1" fill="#5AC968"/></svg>';
const MARK_W = '<svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true"><path d="M2 26 9.6 16.4 15.2 23 22 13.4 30 26Z" fill="#fff"/><circle cx="24" cy="7.4" r="3.1" fill="#5AC968"/></svg>';

function page(d, hash, parsed, effective) {
  const h2s = parsed.blocks.filter((b) => b.t === 'h2');
  const toc = '<ol>' + h2s.map((h) => '<li><a href="#' + h.id + '">' + esc(h.text) + '</a></li>').join('') + '</ol>';
  const isP = d.key === 'privacy';
  const links = '<span class="fls"><a href="/privacy/"' + (isP ? ' aria-current="page"' : '') + '>개인정보 처리방침</a><a href="/terms/"' + (!isP ? ' aria-current="page"' : '') + '>이용약관</a></span>';
  const meta = (effective ? '<b>시행일</b> ' + esc(effective) + ' · ' : '') + '앱 설정 화면에서도 같은 내용을 볼 수 있어요';
  return [
    '<!doctype html>',
    '<html lang="ko">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
    '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; style-src \'self\' \'unsafe-inline\'; font-src \'self\'; img-src \'self\' data:; base-uri \'none\'; form-action \'none\'; object-src \'none\'" />',
    '<meta name="referrer" content="strict-origin-when-cross-origin" />',
    '<meta name="description" content="혼산노트 ' + esc(d.name) + (effective ? ' · 시행일 ' + esc(effective) : '') + '" />',
    '<link rel="canonical" href="https://honsannote.vercel.app/' + d.key + '/" />',
    '<meta name="doc-source" content="honsan-native/' + d.src + '" />',
    '<meta name="doc-hash" content="' + hash + '" />',
    '<title>' + esc(d.name) + ' · 혼산노트</title>',
    '<style>',
    CSS,
    '</style>',
    '</head>',
    '<body>',
    '<!-- 자동 생성물: build-legal.cjs ← honsan-native/' + d.src + ' (해시 ' + hash + '). 손으로 고치지 말 것 -->',
    '<nav class="nav">',
    '  <div class="wrap nav-in">',
    '    <a class="brand" href="/" aria-label="혼산노트 홈">' + MARK + '혼산노트</a>',
    '    <a class="nav-home" href="/">홈으로</a>',
    '  </div>',
    '</nav>',
    '<main>',
    '  <div class="wrap doc">',
    '    <header class="dhead">',
    '      <h1>' + esc(parsed.title) + '</h1>',
    '      <p class="meta">' + meta + '</p>',
    '    </header>',
    '    <details class="toc"><summary>목차</summary>' + toc + '</details>',
    '    <article class="card body">',
    bodyHtml(parsed.blocks),
    '    </article>',
    '    <p class="after"><span>문의 honsannote@gmail.com</span><a href="' + d.other.href + '">' + esc(d.other.label) + ' 보기</a></p>',
    '  </div>',
    '</main>',
    '<footer>',
    '  <div class="wrap foot">',
    '    <span class="fb">' + MARK_W + '혼산노트</span>',
    '    <span class="biz">',
    '      <span><b>상호명</b> 코드에이치</span><span class="sep">·</span>',
    '      <span><b>사업자등록번호</b> 869-46-01411</span><span class="sep">·</span>',
    '      <span><b>문의</b> honsannote@gmail.com</span>',
    '    </span>',
    '    ' + links,
    '    <span class="cp">© 2026 혼산노트</span>',
    '  </div>',
    '</footer>',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

function appCopyHash(d) {
  const p = path.join(APP, d.gen);
  if (!fs.existsSync(p)) return null;
  const m = new RegExp('export const ' + d.hashConst + ' = "([0-9a-f]{16})"').exec(fs.readFileSync(p, 'utf8'));
  return m ? m[1] : null;
}

const check = process.argv.includes('--check');
let bad = 0;
for (const d of DOCS) {
  const srcPath = path.join(APP, d.src);
  if (!fs.existsSync(srcPath)) { console.error('원본 없음: ' + srcPath); process.exit(2); }
  const md = readNorm(srcPath);
  const hash = hashOf(md);
  const parsed = parse(md);
  const eff = (/시행일:\s*(.+)/.exec(md) || [])[1];
  const outPath = path.join(HERE, d.out);
  if (check) {
    const appH = appCopyHash(d);
    const webH = fs.existsSync(outPath) ? ((/name="doc-hash" content="([0-9a-f]{16})"/.exec(fs.readFileSync(outPath, 'utf8')) || [])[1]) : null;
    const okApp = appH === hash;
    const okWeb = webH === hash;
    console.log((okApp && okWeb ? 'OK  ' : 'FAIL') + ' ' + d.name + ': 원본 ' + hash + ' | 앱 사본 ' + appH + (okApp ? '' : ' (앱 사본이 원본과 다름 → 앱에서 build-*-doc 재생성)') + ' | 웹 ' + webH + (okWeb ? '' : ' (웹이 낡음 → node build-legal.cjs)'));
    if (!(okApp && okWeb)) bad += 1;
  } else {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, page(d, hash, parsed, eff ? eff.trim() : ''), 'utf8');
    const h2 = parsed.blocks.filter((b) => b.t === 'h2').length;
    console.log('만듦 ' + d.out + ' <- ' + d.src + ' (해시 ' + hash + ' | 블록 ' + parsed.blocks.length + ' | 조 ' + h2 + ' | 시행일 ' + (eff || '없음') + ')');
  }
}
process.exit(bad ? 1 : 0);
