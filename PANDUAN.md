# SIMDEKA di GitHub + Cloudflare Worker + D1 (gratis, tanpa CLI)

Semua langkah lewat browser (dashboard GitHub dan Cloudflare).

## Isi folder

```
public/            halaman statis
  login/           halaman masuk            → /login/
  admin/           aplikasi pengelola       → /admin/  (hanya bisa dibuka setelah login)
  f/  u/  r/  p/   halaman publik          → /f/<id> (form & absensi), /u/<kode> (update data), /r/<id> (laporan), /p/<kode> (presentasi)
  js/ css/ img/    skrip, gaya, logo
src/index.js       backend Worker (API, login, sinkron data)
schema.sql         tabel database D1
drop-schema.sql    hapus semua tabel (hanya jika ingin mengulang dari nol)
wrangler.toml      konfigurasi (isi database_id di sini)
package.json
```

## Langkah 1 — Unggah ke GitHub
1. Buat repositori baru di github.com (boleh Private).
2. Ekstrak zip ini di komputer. Di halaman repositori: **Add file → Upload files**, lalu seret **isi** folder (public, src, schema.sql, wrangler.toml, dst.) ke jendela unggah. Pastikan struktur folder tetap sama seperti di atas. **Commit changes**.

## Langkah 2 — Buat database D1
1. Dashboard Cloudflare → **Storage & Databases → D1 SQL Database → Create database**. Nama: `simdeka-db`.
2. Buka database itu, salin **Database ID** (tampil di halaman ringkasan).
3. Tab **Console**: tempel **seluruh isi `schema.sql`** → **Execute**. Harus muncul tabel: users, sessions, kv, forms, responses, update_links, settings, login_attempts.

## Langkah 3 — Isi database_id
Di GitHub, buka `wrangler.toml` → ikon pensil → ganti `GANTI-DENGAN-DATABASE-ID-D1-ANDA` dengan Database ID tadi → **Commit changes**.

## Langkah 4 — Hubungkan GitHub ke Cloudflare
1. Dashboard → **Workers & Pages → Create → Import a repository** (Connect to Git), izinkan akses GitHub, pilih repositori.
2. **Project name harus `simdeka`** (sama dengan `name` di wrangler.toml). Jika ingin nama lain, ubah dulu `name` di wrangler.toml.
3. Build command: kosongkan. Deploy command: `npx wrangler deploy` (bawaan). **Save and Deploy**.
4. Setelah selesai, Anda dapat alamat `https://simdeka.<akun>.workers.dev`.

## Langkah 5 — Amankan akun awal (lakukan SEBELUM login pertama)
Worker simdeka → **Settings → Variables and Secrets → Add** → tipe **Secret**, nama `ADMIN_PASSWORD`, isi kata sandi awal pilihan Anda → Deploy.
Tanpa ini, akun awal adalah `admin` / `admin` (jangan dibiarkan terbuka di internet; segera login dan ganti).

## Langkah 6 — Masuk
Buka `https://…workers.dev/login/` → username `admin` + kata sandi awal. Aplikasi memaksa Anda mengganti nama, username, dan kata sandi.

## Langkah 7 — Pindahkan data lama
Di file HTML lokal lama: menu Pengaturan → **Cadangkan data** (unduh .json). Di versi online: menu yang sama → **Pulihkan**. Data otomatis tersimpan ke D1.

## Link presentasi laporan
Menu Laporan → **Buat link presentasi**. Tombol ini membuat salinan data jurnal pengajian kelompok dan menampilkan link baru:
- `https://…/presentasi/laporankelompok` — link tetap, selalu menampilkan presentasi yang terakhir dibuat (tekan tombol lagi untuk memperbarui isinya, alamat tidak berubah);
- `https://…/p/<kode>` — salinan khusus periode itu yang tidak berubah.

Slide dengan transisi halus ala Morph, navigasi panah/geser, tombol F untuk layar penuh. Daftar link aktif ada di jendela yang sama dan bisa dimatikan. Semua PPT yang diunduh dari menu Laporan (gabungan maupun jurnal kelompok) memakai tema navy-emas yang sama dan transisi Morph di PowerPoint pada semua slide setelah sampul. Tidak ada perubahan skema database.

## Pembaruan
Jika Anda sudah menjalankan `schema.sql` sebelumnya, jalankan lagi seluruh isinya di Console D1 (aman diulang) agar tabel `presentations` terbentuk.

Ubah file di GitHub → Cloudflare men-deploy otomatis.

## Catatan penting
- Data tiap menu disimpan di D1 oleh `public/js/api.js` (pengganti localStorage). Jika dua orang mengedit data yang sama bersamaan, yang terakhir menyimpan yang tersimpan; aplikasi menampilkan pemberitahuan bila ada perubahan dari perangkat lain.
- Hak akses per menu (Tidak/Lihat/Edit) ditegakkan oleh tampilan aplikasi, bukan per-tabel di server. Akun yang punya login tetap bisa membaca data lewat API. Beri akun hanya kepada orang tepercaya.
- Kunci API Gemini (Pengaturan) disimpan di D1 dan tidak pernah dikirim ke browser. Kunci AI notulensi dan token Fonnte kini ikut tersimpan di server: isi sekali, otomatis terisi di semua perangkat setelah login. Catatan: akun mana pun yang bisa login bisa membacanya lewat API, jadi beri akun hanya ke orang tepercaya. Kunci/token yang sudah ada di satu perangkat diunggah otomatis saat perangkat itu membuka halaman admin.
- Batas paket gratis (cukup untuk pemakaian desa): D1 100 ribu tulis/hari, 5 juta baca/hari; Workers 100 ribu permintaan/hari.
- Login dibatasi 10 percobaan gagal per 15 menit per alamat IP.
