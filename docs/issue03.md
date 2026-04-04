# Planning: Implementasi User Authentication (Login) API

Dokumen ini berisi panduan teknis dan tahapan yang ringkas, ditujukan untuk mempermudah implementasi fitur *Login & Session Token*. Harap patuhi seluruh aturan dependensi dan modularitas dengan ketat.

## 1. Skema Database (Tabel `sessions`)

Buat tipe baru entity/schema untuk tabel `sessions` menggunakan Drizzle ORM dengan spesifikasi:
- `id`: integer, auto increment, primary key
- `user_id`: integer, not null (foreign key bereferensi/dihubungkan ke tabel `users`)
- `token`: varchar(255), not null
- `version`: integer, default 1 (ditambahkan otomatis ketika ada *update*)
- `status`: enum('active', 'inactive', 'delete'), default 'active'
- `created_at`: timestamp, default current_timestamp
- `updated_at`: timestamp, default current_timestamp on update current_timestamp

## 2. API Endpoint Login

- **Endpoint:** `POST /api/v1/auth/login`
- **Aturan Implementasi Servis Spesifik:** 
  1. Untuk memvalidasi username dan mengambil kredensial password, *dilarang* membuat ulang query langsung di modul Auth. **Gunakan/panggil** service/repo yang sudah ada pada modul `users`. Bila belum ada metode untuk melakukan query full by username, pasangkan/tambahkan di modul `users`. (Auth logic tetap berada di modul Auth).
  2. Implementasi enkripsi _generate token_ Wajib menggunakan plugin `@elysiajs/jwt`.

**Request Body API:**
```json
{
    "username": "cachak",
    "password": "testing123"
}
```

**Response Body (Success):**
```json
{
    "status": "ok",
    "message": "User login successfully",
    "data": {
        "token": "token yang di generate"
    }
}
```

**Response Body (Error / Salah Kredensial):**
```json
{
    "status": "error",
    "message": "User atau password salah",
    "errors": [
        {
            "code": "USER_OR_PASSWORD_WRONG",
            "message": "User atau password salah"
        }
    ]
}
```

## 3. Struktur Direktori & Modularitas

Terapkan *Clean Modular Architecture*. Pengembangan fitur ini berpusat/ditambahkan ke dalam hirarki `modules/auth`.

```text
src/
  modules/
    users/
      ...
    auth/
      controller/
        auth.controller.ts
      service/
        auth.service.ts
      entity/
        auth.entity.ts (atau session.entity.ts)
      repository/
        auth.repository.ts
      auth.module.ts
      auth.schema.ts
      auth.types.ts
```

## 4. Aturan Arsitektur & Dependency Flow

Patuhi arahan berikut secara mutlak:  
`Controller -> Service -> Repository -> Entity/DB`
1. **Controller:** Lapis pengatur jalur masuk HTTP. Controller hanya memanggil business logic dari *Service*. Tidak boleh mengakses instansi Repository.
2. **Service:** Area Business Rules (menyerahkan password plaintext untuk dicek dengan hash dari database, memanggil fungsi JWT, dst). Service harus menggunakan bantuan *Repository* untuk baca-tulis.
3. **Repository:** Lapisan yang berbicara dengan database langsung via parameter query builder Drizzle.
4. **Entity:** Model struktural dari definisi kolom di database murni.

---

## 5. Rencana Tahapan Implementasi (Step-by-Step)

Untuk programmer atau AI model, implementasikan spesifikasi ini dengan tahapan:

### Tahap 1: Setup Kebutuhan Library
1. Install plugin jwt native dari ekosistem Elysia (`bun add @elysiajs/jwt`).

### Tahap 2: Definisi Schema & Sinkronisasi Migrasi DB
1. Masuk ke modul *Auth*, tambahkan definisi Drizzle Schema (`session.entity.ts`) tabel `sessions` dengan param spesifik (jangan lupakan parameter *foreign key* `user_id` agar terikat ke data users).
2. Ikat schema tersebut pada objek referensi di `drizzle.config.ts` dan `src/db/client.ts`.
3. Jalankan command migrasi Drizzle untuk membuat tabel `sessions` di MySQL lokal (`bun run drizzle-kit push` dll).

### Tahap 3: Pemanggilan Kredensial via Modul `Users`
1. Navigasi ke `src/modules/users/...`. 
2. Tambahkan/pastikan ada metodologi *query record* utuh (beserta akses pembacaan parameter sensitif password), sehingga service/modul *Auth* bisa mendapatkan referensi `UserRecord` yang ditarik menggunakan filter string `username`.

### Tahap 4: Merajut Auth Layer (Repository -> Service)
1. Buat layer `auth.repository.ts` untuk merekam token sesi baru (terdiri dari operasi insert ke dalam tabel sesi).
2. Bangun `auth.service.ts` untuk meng-handle verifikasi kredensial:
    - Verifikasi dengan cara mencari referensi user dari _User Layer_. Bila false (tdk ada), *throw* Error status custom `USER_OR_PASSWORD_WRONG`.
    - Panggil library bcrypt/Bun native verify method (`Bun.password.verify`) untuk me validasi password input dengan record dari database. Bila gagal, throw error yang sama.
    - Setelah berhasil menapaki verifikasi, gunakan instalasi/plugin `@elysiajs/jwt` untuk membidani _string_ JWT.
    - Save JWT dan _id pengguna_ tersebut melalui metode class repository.
    - Returnt tokennya ke HTTP layer.

### Tahap 5: Endpoint Auth Controller
1. Buat module controller `POST /api/v1/auth/login`. Lakukan proteksi dan seleksi tipe body request menggunakan standar `TypeBox`.
2. Wrap pemanggilan service `login` auth dengan block *try-catch*, pastikan intercept custom Error divalidasi dan dicetak ke JSON persis seperti Response API (Error) dalam planning di atas.
3. Cetak respons API suksesi untuk _valid token_.

### Tahap 6: Integrasi dan Validasi
1. Panggil dan sinkronisasikan bundle dari `auth.module.ts` ke dalam runtime file utama (via `src/app/server.ts`).
2. Implementasikan Unit tests (Minimal satu sukses, satu false password testing menggunakan Mocked user dependencies).
3. Implementasikan Integration tests (End-to-End). Pastikan pada blok test ini, Anda **meng-kroscek keberhasilan penyimpanan sesi langsung ke database** (menggunakan instruksi Drizzle `SELECT` ke tabel `sessions`) untuk memvalidasi bahwa token yang dicetak benar-benar terekam di DB pasca menerima respon JSON suksesi dari API.
4. Pastikan pengujian berjalan optimal tanpa halangan.
