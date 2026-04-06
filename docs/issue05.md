# Planning: Implementasi Fitur User Logout (Issue #5)

Dokumen ini memuat panduan implementasi untuk fitur Logout aplikasi. Implementasi berfokus pada eksekusi query penghapusan sesi yang divalidasi tersentral dengan bantuan MySQL Trigger (Event Listener level DB) untuk rekam jejak riwayat sesi (_session history_).

## 1. Skema Database (Tabel `session_history`)

Buat entitas schema baru (`session_history.entity.ts`) menggunakan **Drizzle ORM** dengan spesifikasi:
- `id`: integer, auto increment, primary key
- `user_id`: bigint (sesuaikan tipe foreign key `users`), not null
- `token`: varchar(255), not null
- `version`: integer, default 1
- `status`: enum('active', 'inactive', 'delete'), default 'active'
- `created_at`: timestamp, default current_timestamp
- `updated_at`: timestamp, default current_timestamp on update current_timestamp

Lalu definisikan *Database Trigger* pada MySQL:
- Mekanisme: `AFTER DELETE ON sessions`
- Fungsi: Tiap kali satu _record_ di tabel `sessions` dihapus (via proses logout), masukkan _record_ tersebut ke tabel `session_history`. **TIDAK PERLU** mengotomatisasi insert/history di layer Elysia JS (Backend tidak menangani pemindahan tabel rekam jejak, diserahkan murni kepada MySQL Trigger Database).

## 2. API Endpoint Logout

Buat endpoint API Logout:
- **Endpoint:** `GET /api/v1/auth/logout`

**Header yang Dibutuhkan:**
```text
Authentication: Bearer <token>
```
*(Token dari tabel sesi yang ingin dinonaktifkan/logout)*

**Response Body (Sukses):**
```json
{
    "status": "ok",
    "message": "Logout successfully"
}
```

**Response Body (Error / Unauthorize):**
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

## 3. Aturan Fundamental dan Validasi

1. **Gunakan Middleware Auth Proteksi yang Sama:** Endpoint `logout` murni wajib melalui proses *Authorization Header* di atas `auth.middleware.ts`.
2. **Kebutuhan Data Ekstra Middleware:** Saat ini middleware hanya meneruskan `userId`. Anda diharuskan memperbarui baris kode _Middleware_ agar turut meneruskan parameter literal `token` ke variabel *Context Elysia*, sehingga service _logout_ dapat membaca wujud asli token yang di-request pengguna (Lantaran satu user mungkin memiliki banyak token aktif jika login multi-perangkat).
3. **Logika Servis:** Anda akan mendelete / menghapus _record_ di tabel `sessions` yang cocok dengan `token` pengguna bersangkutan. Dilarang menghapus menggunakan variabel `user_id` semata karena itu akan memutuskan *semua* sesi Multi-Device pengguna sekaligus tanpa persetujuan.
4. **Validasi Sejarah Sesi (History Check):** Setelah men_delete_ session, Anda (secara Backend programmatik via Drizzle) wajib mengeksekusi konfirmasi (*SELECT*) pencarian untuk membuktikan bahwa _trigger_ MySQL benar-benar sukses menyalin token tersebut masuk ke dalam arsip (Tabel `session_history`).

## 4. Arahan Dependency Flow Lapis (Strict Layers)
Aturan Mutlak: `Controller -> Service -> Repository -> Entity`
- **Controller:** Menerima *Context* dari otentikasi berupa `{ userId, token }` lalu memanggil logic AuthService.
- **Service:** Melakukan _business action_. Memanggil metode delete di _Auth Repository_.
- **Repository:** Mengeksekusi interaksi `db.delete(...)` murni param instruksi ke Skema dan membuktikan/mengecek log table trigger history. Boleh mengakses file entity.
- Dilarang memuat operasi Database di Service layer.

---

## 5. Arahan Implementasi (Step-by-Step)

Untuk kemudahan pelaksana *(AI/Junior Programmer)*, patuhi rangkaian ini:

### Tahap 1: Pembentukan Tabel dan Trigger Drizzle (File Skema)
1. Pergi ke `src/modules/auth/entity/`. Buat `session-history.entity.ts`. Daftarkan di DB Client dan biarkan Drizzle mengurus migrasinya melalui command file `drizzle-kit push`.
2. Drizzle bawaan **belum tentu** mendukung pembuatan Trigger via JS Syntax. Susun dan eksekusilah RAW SQL command / File Migration langsung dalam MySQL, menggunakan format instruksi bawaan seperti:
   `CREATE TRIGGER after_session_delete AFTER DELETE ON sessions FOR EACH ROW BEGIN INSERT INTO session_history (user_id, token, version, status, created_at, updated_at) VALUES (OLD.user_id, OLD.token, OLD.version, 'delete', OLD.created_at, CURRENT_TIMESTAMP); END;`

### Tahap 2: Ekstensi Context Token pada Middleware Auth
1. Revisi kode `src/modules/auth/auth.middleware.ts` untuk selain me-return `userId`, juga turut me-*resolve* dan mencetak output variabel `parsedToken`.
2. Supresi Typescript yang diperlukan jika ada penyesuaian Context tipe di Endpoint Auth.

### Tahap 3: Pembuatan Mekanisme Auth Repository & Service
1. Di dalam `auth.repository.ts`, susun metode `deleteSessionByToken(token: string)` menggunakan perintah `delete` ORM Drizzle.
2. Buat _function_ kroscek pada Repository `checkSessionHistoryByToken(token: string)` memakai instruksi `select().from(session_history)`.
3. Di dalam `auth.service.ts`, buat business action `logout(token: string)`. Operasi panggilannya: Request hapus sesi (*await authRepo.delete...*), diikuti dengan kroscek/validasi keberadaan di _History_ (*await authRepo.checkSessionHistory...*). Berikan balikan/tolakan logis yang relevan.

### Tahap 4: Wiring Endpoint Auth Controller
1. Buka `src/modules/auth/controller/auth.controller.ts`.
2. Tambahkan node chain endpoint `.get('/logout', ...)` ke rute bawah `/me` yang berada dalam satu sangkar Middleware Autentikasi.
3. Ekstrak `{ parsedToken }` (atau sebutan variabel token Anda) dari Middleware Context dan arahkan ke service `logout()`. Kembalikan pesan string HTTP Success JSON sesuai permintaan _prompt_. 

### Tahap 5: Tahap Finalisasi E2E Test
1. Jangan biarkan *blind-spot*. Buat test *Unit* & *Integration test E2E* (`auth.integration.test.ts`).
2. Lakukan simulasi Login (Untuk mendapatkan *Token*).
3. Panggil dan uji route `GET /logout`.
4. *Confirm* atau Validasi respon balikan bernilai Success.
5. Coba pakai ulang *Token* terhapus tadi ke Endpoint `GET /me` (Buktikan penolakan Unauthorize `401`).
