# Planning: Setup Project ElysiaJS + Drizzle + MySQL

Dokumen ini berisi panduan langkah demi langkah untuk menginisiasi dan mengonfigurasi proyek baru menggunakan Bun.

## Tech Stack
- **Runtime:** Bun
- **Web Framework:** ElysiaJS
- **ORM:** Drizzle ORM
- **Database:** MySQL

## Instruksi Implementasi

### 1. Inisialisasi Proyek
* Jalankan perintah inisialisasi proyek Bun (`bun init -y`) di dalam direktori saat ini.
* Pastikan file standar seperti `package.json` dan `tsconfig.json` sudah terbentuk.

### 2. Instalasi Dependensi
* Install dependensi utama:
  * Framework web: `elysia`
  * ORM: `drizzle-orm`
  * Driver koneksi database MySQL: `mysql2`
* Install dependensi development (DevDependencies):
  * Migrasi database (Drizzle Kit): `drizzle-kit`
  * Types untuk bun (jika diperlukan): `@types/bun`

### 3. Konfigurasi Database (Drizzle & MySQL)
* Buat file environment `.env` dan tambahkan variabel koneksi database `DATABASE_URL`.
* Buat folder `src/db/` atau sejenisnya untuk pengaturan database.
* Di dalam folder pengaturan database:
  * Buat file skema awal, misal `schema.ts`, dan mendefinisikan satu tabel sederhana (misal tabel `users`).
  * Buat file koneksi database, misal `index.ts`, yang menghubungkan Drizzle dengan koneksi `mysql2` ke database.
* Buat file `drizzle.config.ts` di root direktori untuk mengonfigurasi pengaturan dari `drizzle-kit` (mengarahkan ke skema dan database).

### 4. Setup Server Aplikasi (ElysiaJS)
* Buka atau edit file entry point (biasanya `src/index.ts`).
* Inisialisasi instance Elysia.
* Buat minimum satu route (endpoint), misalnya `GET /`, yang menampilkan respons status bahwa layanan menyala dengan baik.
* Integrasikan instance koneksi database (Drizzle) ke dalam route untuk memvalidasi bahwa aplikasi bisa terhubung dan melakukan query ke MySQL.

### 5. Finalisasi & Testing
* Tambahkan script pelengkap di `package.json` agar mudah menjalankan sistem (contoh script `dev` menggunakan `bun --watch run src/index.ts`).
* Tambahkan script di `package.json` untuk mengeksekusi Drizzle Kit (push/generate).
* Jalankan server di local dan pastikan server Elysia berjalan tanpa error (misal di localhost:3000).
