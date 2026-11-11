/* SIMDEKA — kelola akun di server (menimpa versi "lokal" bawaan aplikasi).
 * Daftar akun tambahan dimuat bersama data awal (hanya untuk Super Admin).
 * Kata sandi dikirim lewat HTTPS dan disimpan di server dalam bentuk hash PBKDF2. */
(function () {
  'use strict';
  if ((window.SIMDEKA_PAGE || 'admin') !== 'admin') return;
  var cache = (window.__sdUsers || []).slice();
  var $ = function (id) { return document.getElementById(id); };

  window.acLoad = function () { return cache.map(function (a) { return Object.assign({}, a); }); };
  window.acSave = function () { /* penyimpanan dilakukan per tindakan ke server */ };

  function post(body) {
    return sdFetch('/api/users', { method: 'POST', body: body }).then(function (j) { cache = j.users || cache; });
  }

  window.acSubmit = function (id) {
    var L = acLoad(), pg = acPages(), err = $('acErr');
    var bad = function (m) { err.textContent = m; err.classList.remove('hidden'); };
    var nama = $('acNama').value.trim(), user = $('acUser').value.trim().toLowerCase(), peran = $('acPeran').value.trim(), pw = $('acPass').value;
    if (!nama) return bad('Nama wajib diisi.');
    if (!/^[a-z0-9._-]{3,32}$/.test(user)) return bad('Username 3-32 karakter: huruf kecil, angka, titik, strip, garis bawah.');
    if (L.some(function (x) { return x.username === user && x.id !== id; })) return bad('Username sudah dipakai akun lain.');
    if ((!id || pw) && pw.length < 8) return bad('Kata sandi minimal 8 karakter.');
    var ak = {};
    pg.forEach(function (p) { var r = document.querySelector('input[name="acp_' + p.id + '"]:checked'); ak[p.id] = r ? r.value : 'tidak'; });
    if (!pg.some(function (p) { return ak[p.id] !== 'tidak'; })) return bad('Pilih minimal satu menu dengan akses Lihat atau Edit.');
    var old = L.filter(function (x) { return x.id === id; })[0];
    var body = { nama: nama, username: user, peran: peran, akses: ak, aktif: old ? old.aktif !== false : true };
    if (id) body.id = id;
    if (pw) body.password = pw;
    post(body).then(function () { closeModal(); acRender(); showToast('Akun disimpan'); }, function (e) { bad(e.message); });
  };

  window.acToggle = function (id) {
    var a = cache.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    post({ id: a.id, nama: a.nama, username: a.username, peran: a.peran, akses: a.akses, aktif: a.aktif === false })
      .then(function () { acRender(); }, function (e) { showToast(e.message); });
  };

  window.acDel = async function (id) {
    var a = cache.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    if (!await uiConfirm({ title: 'Hapus akun?', message: 'Akun @' + a.username + ' tidak bisa login lagi.', ok: 'Ya, Hapus', tone: 'danger' })) return;
    sdFetch('/api/users/' + encodeURIComponent(id), { method: 'DELETE' })
      .then(function () { cache = cache.filter(function (x) { return x.id !== id; }); acRender(); showToast('Akun dihapus'); }, function (e) { showToast(e.message); });
  };
})();
