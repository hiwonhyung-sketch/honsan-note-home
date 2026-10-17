/* 공지사항 — 앱과 같은 공지(Supabase app_notices, 공개 읽기)를 보여 준다.
   본문은 textContent 로만 넣는다(HTML 해석 없음). 키는 공개 읽기 전용(publishable). */
(function () {
  'use strict';
  var URL_ = 'https://cqxdjkpjgnfgfcsdkmlr.supabase.co/rest/v1/app_notices'
    + '?select=id,title,body,published_at,expires_at,pinned,min_version,max_version'
    + '&order=published_at.desc&limit=100';
  var KEY = 'sb_publishable_nR1fHR_y4UsSnuDvZhQBfw_YDiOy6qd';
  var box = document.getElementById('items');
  var state = document.getElementById('state');

  function fmt(iso) {
    var d = new Date(iso);
    var k = new Date(d.getTime() + 9 * 3600 * 1000); // 한국 날짜
    return k.getUTCFullYear() + '.' + String(k.getUTCMonth() + 1).padStart(2, '0') + '.' + String(k.getUTCDate()).padStart(2, '0');
  }
  function msg(t) { state.textContent = t; state.hidden = false; }

  function render(rows) {
    var now = Date.now();
    var list = rows.filter(function (r) {
      if (r.min_version || r.max_version) return false;        // 앱 버전 한정 공지는 웹에 싣지 않는다
      if (Date.parse(r.published_at) > now) return false;
      if (r.expires_at && Date.parse(r.expires_at) <= now) return false;
      return true;
    });
    list.sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return Date.parse(b.published_at) - Date.parse(a.published_at);
    });
    if (!list.length) { msg('등록된 공지사항이 없습니다.'); return; }
    state.hidden = true;
    list.forEach(function (r, i) {
      var det = document.createElement('details'); det.className = 'item'; det.id = 'n-' + r.id;
      var sum = document.createElement('summary');
      if (r.pinned) { var p = document.createElement('span'); p.className = 'pin'; p.textContent = '고정'; sum.appendChild(p); }
      var tt = document.createElement('span'); tt.className = 'tt';
      var t = document.createElement('span'); t.className = 't'; t.textContent = r.title;
      var d = document.createElement('span'); d.className = 'd'; d.textContent = fmt(r.published_at);
      tt.appendChild(t); tt.appendChild(d); sum.appendChild(tt);
      var b = document.createElement('div'); b.className = 'b'; b.textContent = r.body;
      det.appendChild(sum); det.appendChild(b);
      if (i === 0 || location.hash === '#n-' + r.id) det.open = true;
      box.appendChild(det);
    });
  }

  fetch(URL_, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
    .then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); })
    .then(render)
    .catch(function () { msg('공지사항을 불러오지 못했습니다. 잠시 뒤 다시 확인해 주세요.'); });
})();
