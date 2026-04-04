# Planning: Implementasi Fitur Get User Profile

Dokumen ini memuat panduan teknis implementasi fitur pengambilan data profil pengguna yang sedang _login_. Implementasi berfokus pada pembangunan _middleware_ atau validasi token terpusat dan penerapannya pada dua endpoint berbeda. Harap patuhi aturan arsitektur berikut secara disiplin.

## 1. API Endpoints

Terdapat kewajiban membuat (dan atau memproteksi) dua endpoint GET yang memberikan balikan data identik:
1. `GET /api/v1/auth/me`
2. `GET /api/v1/users/me`

**Format Header HTTP Wajib:**
```text
Authentication: Bearer <token_jwt>
```
*(Catatan: Token direpresentasikan dari sesi tabel `sessions` setelah login)*

**Format Response API (Success):**
```json
{
    "status": "ok",
    "message": "Get user profile successfully",
    "data": {
        "id": 1,
        "username": "cachak",
        "email": "app@sahir.web.id",
        "name": "Sahir",
        "version": 1,
        "status": "active",
        "created_at": "timestamp",
        "updated_at": "timestamp"
    }
}
```

**Format Response API (Error Kadaluarsa / Akses Invalid):**
```json
{
    "status": "error",
    "message": "Unauthorize",
    "errors": [
        {
            "code": "UNAUTHORIZE",
            "message": "Unauthorize"
        }
    ]
}
```

## 2. Aturan Fundamental dan Sistem Modular

1. **DRY Principle (Don't Repeat Yourself):** Endpoint `/api/v1/auth/me` dan `/api/v1/users/me` secara ketat **harus menerapkan validasi mekanisme yang sama persis** serta memanggil servis `getUserById` tunggal dari _Users module_.
2. **Mekanisme Otentikasi:** Lakukan pembatasan validasi secara terpusat. Anda diwajibkan menulis protektor (Bisa berupa _Middleware_ atau _Resolve Function_ bawaan ElysiaJS) di Modul `Auth`.
3. **Pengecekan Ekspiresi (Expiration):** Dalam protektor token ini, lakukan mekanisme verifikasi JWT yang disajikan. **Tolak permintaan** _(throw error/return 401)_ apabila token kosong, salah format, atau bila indikator JWT expire telah terlewati.
4. **Proteksi Informasi Profil:** Metode pemanggilan data dari `getUserById` ke depan endpoint dilarang memunculkan nilai *password*.

## 3. Arah Dependensi Lapis Arsitektur (Strict Layers)
Aturan One-way Hierarchy: `Controller -> Service -> Repository -> Entity`
- Controller bertanggungjawab murni mengevaluasi HTTP layer, mengintegrasikan middleware protektor Header.
- Service tidak boleh memanggil object Framework. Dia murni diinstruksikan meracik _business action_.

---

## 4. Tahap Pengerjaan Sistem (Step-by-Step)

Untuk programmer atau agen AI pelaksana, harap selesaikan tuntutan issue berdasarkan hirarki langkah ini:

### Tahap 1: Ekstensi Fungsionalitas Modul Users
1. Buka `src/modules/users/repository/user.repository.ts`. Rancang method `findById(id: number)` yang menggunakan filter Drizzle untuk menembak query record data milik primary key `id`.
2. Buka `src/modules/users/service/user.service.ts`. Buat method `getUserById(id)` yang memanggil method repository tadi. Ingat: Potong atau keluarkan kunci properti `password` dari respons JSON sebelum datanya dibalikkan oleh service (menjaga privasi).

### Tahap 2: Konstruksi Otorisasi (Auth Layer Validator)
1. Rancanglah sebuah _Middleware/Decorator_ Elysia yang mengevaluasi input Token. Lokasinya idealnya pada Modul `Auth` (misal di folder utils auth, atau fungsi plugin `auth.middleware.ts`).
2. Proses logic-nya: Ambil tipe header `Authentication`, belah (split) kalimat *Bearer* dari kuncinya.
3. Parsing dan verifikasikan keberadaan *sign/tanggal kedaluwarsa* dari string _token_, gunakan instruksi `jwt.verify()` (plugin dari `@elysiajs/jwt`).
4. Apabila token tidak sesuai, _kadaluarsa / expired_, hentikan siklus router secara otomatis dengan mengembalikan HTTP Header format JSON Error status `UNAUTHORIZE` dan code HTTP `401`.
5. Apabila Token valid, injek atau sebarkan parameter/properti `userId` hasil dekripsi payload ke handler berikutnya agar dapat dikonsumsi oleh Controller.

### Tahap 3: Implementasi Route di Modul Auth
1. Navigasi ke `src/modules/auth/controller/auth.controller.ts`.
2. Tambahkan node chain endpoint `.get('/me', ...)` di bawah _login_.
3. Ikat endpoint tersebut dengan proteksi/middleware JWT Token dari Tahap 2.
4. Tarik _user_id_ dari _Context_, lalu panggil dan _return_ service `userService.getUserById(id)` berbalut response *Success*.

### Tahap 4: Implementasi Route di Modul Users
1. Jika belum ada, susun `user.controller.ts` dalam `src/modules/users/controller/`.
2. Sediakan endpoint untuk path utamanya (`prefix: /api/v1/users`).
3. Susun route `.get('/me')` dan berlakukan/injeksi *sistem middleware perlindungan token otentikasi yang sama persis seperti pada modul auth* menggunakan modul fungsi yang telah diekstraksi keatas.
4. Panggil dan balikan result eksekusi `userService.getUserById(id)` serupa.

### Tahap 5: Integrasi Akhir dan Testing
1. Ikat keseluruhan router/plugin users terbaru di `src/app/server.ts` bila ada ekstensi plugin yang tertinggal.
2. Rancang unit test/integration test otomatis memastikan Endpoint `GET` terlarang bagi pengakses non-token, melarang token basi (expired token jika disimulasikan), dan sukses memberikan keluaran response object `username`/`email` identik pada *kedua route endpoint berbeda* tersebut jika string JWT Bearernya otentik dan valid.
