/* SIMDEKA — form & absensi publik yang dibuka dari tautan /f/<id>[/<kelompok>][/<tanggal>]
 * Data form diambil dari server (D1), lalu dirender oleh kode aplikasi yang sama dengan pratinjau admin.
 * Pengiriman tanggapan ditangani simdekaResponsePush() di api.js. */
(function () {
  'use strict';
  if ((window.SIMDEKA_PAGE || 'admin') !== 'public') return;
  var m = /^\/f\/([^/]+)((?:\/[^/]+){0,2})\/?$/.exec(location.pathname);
  if (!m) return;
  if (typeof fmBootPublic !== 'function' || typeof fmUnpack !== 'function') return;

  var seg0 = decodeURIComponent(m[1]);
  var id = seg0.indexOf('.') > -1 ? seg0.slice(seg0.lastIndexOf('.') + 1) : seg0;   // dukung bentuk "slug.id"
  var rest = m[2] ? m[2].split('/').filter(Boolean).map(decodeURIComponent) : [];
  var tg = '', kel = '';
  rest.forEach(function (x) { if (/^\d{4}-\d{2}-\d{2}$/.test(x)) tg = x; else kel = x; });

  var origUnpack = window.fmUnpack;
  function serve(promise) {
    window.fmUnpack = function (s) { return s === '__srv' ? promise : origUnpack.apply(this, arguments); };
    fmBootPublic('__srv');
  }

  function filter(d) {
    if (d && d.t === 'a') {
      if (kel) {
        var ks = d.k || [], keep = [];
        ks.forEach(function (k, i) { if (k === kel || (typeof fmSlug === 'function' && fmSlug(k) === kel)) keep.push(i); });
        if (!keep.length) throw new Error('kel');
        d.p = (d.p || []).filter(function (r) { return keep.indexOf(r[1]) > -1; }).map(function (r) { return [r[0], keep.indexOf(r[1]), r[2]]; });
        d.k = keep.map(function (i) { return ks[i]; });
      }
      if (tg) {
        d.tg = tg; d.tl = tg;
        d.sj = (d.sj || []).filter(function (x) { return x[0] === tg; });
      }
    }
    return d;
  }

  var p = fetch('/api/public/forms/' + encodeURIComponent(id), { cache: 'no-store' })
    .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.payload || !j.payload.v) throw new Error(j.error || 'nf'); return filter(j.payload); }); });
  p.catch(function () { /* ditangani sebagai "Formulir tidak dapat dibuka" */ });
  serve(p);
})();
