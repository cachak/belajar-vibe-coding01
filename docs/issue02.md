# Planning: Implementasi User Registration API

Dokumen ini berisi panduan ringkas dan spesifikasi arsitektur untuk mengimplementasikan fitur registrasi pengguna (User Registration) dengan stack ElysiaJS, Drizzle ORM, dan MySQL. Ikuti instruksi dan aturan arsitektur secara ketat.

## 1. Skema Database (Tabel `users`)

Buat definisi tabel menggunakan Drizzle ORM (`mysqlTable`) sesuai kriteria berikut:
- `id`: integer, auto increment, primary key
- `username`: varchar(255), not null, unique
- `email`: varchar(255), not null, unique
- `name`: varchar(255), not null
- `password`: varchar(255), not null (akan berisi hash bcrypt/Bun.password)
- `version`: integer, default 0 (diubah manual/otomatis setiap kali update record)
- `status`: enum('active', 'inactive', 'delete'), default 'active'
- `created_at`: timestamp, default current_timestamp
- `updated_at`: timestamp, default current_timestamp on update current_timestamp

## 2. API Endpoint Registrasi

- **Method & Path:** `POST /api/v1/users`
- **Validasi payload:** Elysia TypeBox (`t.Object(...)`)

**Request Body API:**
```json
{
    "username": "cachak",
    "email": "app@sahir.web.id",
    "name": "Sahir",
    "password": "testing123"
}
```

**Response Body API (Sukses):**  
*Ingat: kembalikan payload utuh tanpa field `password`.*
```json
{
    "status": "ok",
    "message": "User created successfully",
    "data": {
        "id": 1,
        "username": "cachak",
        "email": "app@sahir.web.id",
        "name": "Sahir",
        "version": 0,
        "status": "active",
        "created_at": "2023-10-01T12:00:00Z",
        "updated_at": "2023-10-01T12:00:00Z"
    }
}
```

**Response Body API (Error Duplikasi, dll):**
```json
{
    "status": "error",
    "message": "User already exists",
    "errors": [
        {
            "code": "USER_ALREADY_EXISTS",
            "message": "User already exists"
        }
    ]
}
```

## 3. Struktur Direktori & Modularitas

Terapkan hierarki *Modular Architecture*. Fitur yang fokus dikerjakan saat ini hanya modul *Users*. Struktur lain cukup disisakan foldernya saja atau diabaikan bila tidak relevan.

```text
src/
  app/
    server.ts
    bootstrap.ts
  config/
    env.ts
    logger.ts
  plugins/
    db.plugin.ts
  db/
    client.ts
    migrations/
    seed/
  modules/
    users/
      controller/
        user.controller.ts
      service/
        user.service.ts
      entity/
        user.entity.ts
      repository/
        user.repository.ts
      user.module.ts
      user.schema.ts
      user.types.ts
  shared/
    utils/
    types/
    constants/
```

## 4. Aturan Arsitektur & Dependency Flow (Strict Layering)

Anda WAJIB mematuhi One-way Dependency Flow:  
**Controller -> Service -> Repository -> Entity/DB**

**Aturan Main:**
1. **Controller:** Tempat framework Elysia dideklarasikan. Ia meng-handle HTTP request, melakukan validasi payload, memanggil logic dari Service, lalu me-return response JSON. **Jangan pernah meng-import dan memanggil Repository secara langsung di sini.**
2. **Service:** Tempat semua "Business Rules" bersarang (misal mengecek keunikan user, menghash password). Service **memanggil Repository**. Service sama sekali *tidak boleh* tahu framework Elysia dan tabel schema database.
3. **Repository:** Bertugas berkomunikasi murni dengan Database menggunakan perintah Drizzle ORM. Repository boleh meng-import dan menggunakan **Entity/Schema**.
4. **Entity:** Hanya merupan *definisi struktur tabel* murni Drizzle ORM MySQL. Sama seperti Service, dia tidak boleh tahu tentang framework Elysia.

---

## 5. Rencana Tahapan Implementasi (Step-by-Step)

Untuk kemudahan dan agar tidak *error-prone*, lakukan step berikut secara berurutan:

### Tahap 1: Setup Boilerplate Struktur Dasar
1. Buat susunan folder base (`src/app`, `src/db`, `src/modules/users`, dst).
2. Pindahkan inisiasi DB dari bawaan proyek sebelumnya (`src/db/index.ts`) lalu satukan dan perbaiki posisinya ke `src/db/client.ts`. 

### Tahap 2: Definisi Entity & Migrasi Tabel
1. Buat file `src/modules/users/entity/user.entity.ts` (atau dipisah schema/typenya). Tulis kode skema tabel `users` sesuaikan dengan tipe data di Planning (Bagian 1).
2. Jalankan perintah generate dan push migrasi Drizzle untuk menciptakan struktur tabel ini ke instance database lokal.

### Tahap 3: Implementasi Layer Repository (`user.repository.ts`)
1. Buat logic (Class / Fungsi) repository untuk user.
2. Sediakan method `findByEmailOrUsername(identifier)` untuk mencari adakah data ganda.
3. Sediakan method `createUser(data)` untuk melakukan operasi Drizzle `db.insert()` dan mengembalikan representasi record hasil insert.

### Tahap 4: Implementasi Layer Service (`user.service.ts`)
1. Buat layer class/fungsi Service di module user.
2. Karena butuh hashing, gunakan fungsi native seperti `Bun.password.hash` (atau librari eksternal standar).
3. Buat method utama pendaftaran (`register(dto)`).
   - *Logic:* Panggil method dari Repository (cek apakah akun exist) -> Lempar Error custom bila ada duplikat.
   - Bila tidak ada duplikat: Hash password -> Panggil operasi `createUser` dari repo dengan field `password` yang sudah di-hash.
   - Buang field yang sensitif dari return object agar siap disajikan oleh response (hapus `password` property).

### Tahap 5: Implementasi Layer Controller (`user.controller.ts`)
1. Buat Elysia Plugin yang berisi route endpoint `POST /api/v1/users`.
2. Inject/panggil method service (`register(dto)`).
3. Manfaatkan syntax validasi Schema bawaan Elysia (`t.Object`) pada property `body` route.
4. Lakukan try-catch (atau custom error handling Elysia) agar output bisa ter-format persis seperti Response contoh (menampilkan message `USER_ALREADY_EXISTS` bila error, dan status success bila jalan mulus).

### Tahap 6: Integrasi (Wiring Aplikasi) & Testing
1. Ikat controller user tadi ke dalam `src/modules/users/user.module.ts`.
2. Ikat module user tersebut ke entry point server utama ElyisaJS (`src/app/server.ts` atau modifikasi `src/index.ts` agar clean & clear).
3. Jalankan server (`bun run dev`) dan lakukan testing Endpoint Registration menggunakan `cURL` atau `Hoppscotch`/`Postman` demi memastikan sistem bekerja sebagaimana mestinya sesuai spesifikasi dokumentasi ini.
