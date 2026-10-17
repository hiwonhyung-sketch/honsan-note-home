#!/usr/bin/env node
/**
 * build-home — 홈페이지 원본(_src.html)에서 배포용 index.html 을 만든다.
 *
 *   원본   : _src.html      (손으로 고치는 파일)
 *   자산   : _assets.json   (글꼴 1개를 base64로 — 첫 화면 글자 깜빡임 방지용)
 *   산출   : index.html     (자동 생성물 — 손으로 고치지 말 것)
 *   이미지 : img/*.webp     (별도 파일 — 브라우저가 따로 저장·지연 로딩)
 *
 *   node build-home.cjs           index.html 을 만든다
 *   node build-home.cjs --check   index.html 이 원본과 같은지 본다(다르면 exit 1)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const src = fs.readFileSync(path.join(HERE, '_src.html'), 'utf8');
const assets = JSON.parse(fs.readFileSync(path.join(HERE, '_assets.json'), 'utf8'));

const missing = [];
const out = src.replace(/__([A-Z0-9]+)__/g, (m) => {
  if (assets[m] === undefined) { missing.push(m); return m; }
  return assets[m];
});
if (missing.length) { console.error('자산 누락:', missing.join(', ')); process.exit(1); }

const target = path.join(HERE, 'index.html');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (cur !== out) { console.error('index.html 이 원본(_src.html)과 다릅니다. node build-home.cjs 를 실행하세요.'); process.exit(1); }
  console.log('index.html 이 원본과 같습니다.');
} else {
  fs.writeFileSync(target, out);
  console.log('index.html 생성:', Math.round(out.length / 1024) + 'KB');
}
