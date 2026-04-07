# Planning: Unit Test Coverage untuk Semua API (Issue #07)

Dokumen ini berisi rencana cakupan pengujian unit (*Unit Test Planning*) untuk seluruh *endpoints* API yang tersedia di aplikasi saat ini, yang selanjutnya akan diimplementasi oleh *Junior Programmer* atau AI. 

## Arahan Umum
1. **Framework:** Gunakan `bun test`.
2. **Aturan:** JANGAN SECARA SEKALI-KALI mengubah blok kode (logic controller, service, repository, dll) pada file aslinya.
3. **Optimisasi:** Apabila ternyata unit/integration test sudah tersedia untuk satu *endpoint*, pelajari, perbarui dan kembangkan agar lebih rapih, lebih komprehensif, dan lebih *maintainable* (hindari duplikasi set-up dan hapus data kotor `database` saat `afterAll`).
4. **Implementasi:** Programmer diinstruksikan menterjemahkan skenario di bawah ini menjadi baris kode nyata (`expect(...)`). 

---

## Skenario Pengujian Unit Test

### 1. `POST /api/v1/users` (Registrasi User Baru)
File terkait: `src/modules/users/controller/user.integration.test.ts`
- **[Positive]** Melakukan registrasi dengan payload wajar dan mengembalikan HTTP 201 dengan pesan dan objek user.
- **[Negative]** Memastikan server mengembalikan HTTP 409 (Conflict) untuk skenario registrasi duplikasi (Username / Email yang sudah terdaftar).
- **[Negative]** Memastikan penolakan HTTP 422 oleh validator karena kelengkapan input payload body (*Missing fields*).
- **[Negative]** Memastikan penolakan HTTP 422 untuk format alamat email yang tidak standar.
- **[Negative]** Memastikan tolakan HTTP 422 untuk *Boundary Case* (misalnya panjang username melebihi karakter maksimal, max 255 chars).

### 2. `GET /api/v1/users/me` (Akses Profil Lewat User Scope)
File terkait: Menggunakan file yang sama seperti registrasi di atas.
- **[Positive]** Berhasil memperoleh data profil pribadi bila menyertakan _Authorization Header_ dengan `Bearer <token>` yang valid.
- **[Negative]** Request disetop/dicegat (`HTTP 401 Unauthorized`) apabila client mengirim tanpa membawa Header Authorization sama sekali.
- **[Negative]** Request `HTTP 401 Unauthorized` terjadi jika request menyematkan token JWT asal, basi (kedaluwarsa), dan direkayasa (asal String).

### 3. `POST /api/v1/auth/login` (Autentikasi & Login JWT)
File terkait: `src/modules/auth/controller/auth.integration.test.ts`
- **[Positive]** Pengguna ber-username dan password benar berhasil memperoleh JWT Token (`data.token`) secara utuh berserta HTTP status 200.
- **[Negative]** Menangani pengembalian HTTP 401 dan pesan relevan untuk skenario **Password Salah**.
- **[Negative]** Menangani pengembalian HTTP 401 untuk kasus di mana **Username belum terdaftar**.
- **[Negative]** Server merespon gagal dengan HTTP 422 terhadap Payload Request tak lengkap (contohnya menembak `/login` tanpa memasukkan salah satu parameter wajib).

### 4. `GET /api/v1/auth/me` (Akses Profil Lewat Auth Scope)
File Terkait: Sama dengan Auth Test.
- **[Positive]** Request membawa *Authorization Header Bearer Valid* menghasilkan HTTP Sukses yang memuat data `userId` dan rincian user utuh.
- **[Negative]** Akses harus gagal (HTTP 401) jika masuk ke ruang terproteksi ini tanpa ada token JWT.

### 5. `GET /api/v1/auth/logout` (Mematikan Sesi Publik)
File Terkait: Sama dengan Auth Test.
- **[Positive]** Menjalankan HTTP GET `logout` menggunakan Token Valid berhasil memusnahkan sesi dengan Status HTTP 200. Membuktikan bahwa token tersebut benar-benar tewas, yaitu dengan memakainya ulang pada rute `/me` dan *mengamati penolakan (Unauthorized)*.
- **[Negative]** Dilarang mengeksekusi script logout jika tanpa JWT token aktif sama sekali. Server harus menolaknya dari level otentikasi.
- **[Negative]** *(Cek Race/Ketergantungan)* Mencoba *Logout* ganda. Sesi yang sama yang di-_logout_ untuk kedua kalinya dalam jeda singkat seharusnya menolak karena sesi tidak eksis kembali.
