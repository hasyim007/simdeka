/* Penyesuaian khusus halaman admin */
(function () {
  'use strict';
  if (window.SIMDEKA_PAGE !== 'admin') return;
  window.showLogin = function () { location.replace('/login/'); };
})();
