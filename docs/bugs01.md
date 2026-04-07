# Bug Report: Bypass Validasi Panjang Karakter (Issue #Bugs01)

## 1. Deskripsi Bug
Pada aplikasi saat ini, user bisa mengirim payload POST /registrasi (di endpoint `/api/v1/users`) dengan jumlah karakter bebas tanpa batas wajar di atribut string seperti `name`, `username`, dsb. 
Karena tipe data di Skema MySQL (`user.entity.ts`) menampung `VARCHAR(255)`, aplikasi menangani input berukuran sangat panjang (contoh: 300 string "A") ini sebagai **SQL Error (Data too long for column)**. 
Akibatnya, respon terlempar menjadi HTTP 500 (Internal Server Error) dari database. Seharusnya validasi ini bisa dicegat sejak di lapis router agar responsifikasi client jauh lebih ringan dan standar dengan mengembalikan HTTP `400 Bad Request` (Validation Error).

## 2. Lokasi Berkas (Root Cause)
File: `src/modules/users/controller/user.controller.ts`
Fungsi: `/api/v1/users` (Router POST ` "/" `)
Detail area: Pada argument validasi skema body Payload: `body: t.Object(...)`

## 3. Instruksi Perbaikan Langkah demi Langkah
Dokumen ini disusun untuk Junior Programmer atau AI developer yang lebih terjangkau.

**Langkah 1: Pergi ke Skema Validasi di Controller User**
Buka file HTTP Controller pengguna di: `src/modules/users/controller/user.controller.ts`.

**Langkah 2: Temukan Argument Validation**
Cari deklarasi `body: t.Object({ ... })`. Sebelumnya deklarasi ini mungkin hanya terdefinisi sebagai `t.String()`. Elysia `t.String()` mengizinkan ukuran tak terbatas secara default.

**Langkah 3: Aplikasikan `maxLength` pada Elysia TypeBox**
Batasi semua field tipe teks agar tidak meledak di lapis Database. Gunakan modifier bawaan dari plugin Validator TypeBox di dalam argument `t.String()`.
Contoh perubahan:
```typescript
{
  body: t.Object({
    username: t.String({ maxLength: 255 }),
    email: t.String({ format: "email", maxLength: 255 }),
    name: t.String({ maxLength: 255 }),
    password: t.String({ maxLength: 255 }),
  }),
}
```

**Langkah 4: Sembunyikan Pesan Kesalahan Raw SQL di Catch Block (Information Leak)**
Saat ini apabila aplikasi mengalami kebingungan/gagal karena MySQL melempar error, di dalam blok `catch (error: any)` nilai `error.message` langsung digelontorkan ke response object secara mentah:
`errors: [{ code: "INTERNAL_ERROR", message: error.message }]`

Ini menimbulkan kelemahan celah *Information Disclosure*, dimana *SQL Query* asli akan muncul di hadapan publik/client.
Perbaiki dengan menampilkan pesan error generic, sementarakan raw `error.message` hanya muncul di `console.log()` server.

Contoh perubahan:
```typescript
        // Lakukan console.log(error) untuk keperluan audit log di server
        console.error("Registrasi Error:", error);

        set.status = 500;
        return {
          status: "error",
          message: "Internal server error",
          // Jangan keluarkan 'error.message' mentah, gunakan error generic!
          errors: [{ code: "INTERNAL_ERROR", message: "An unexpected error occurred processing your request." }],
        };
```

**Langkah 5: Jalankan End-To-End (E2E) Test Mandiri (cURL)**
Pastikan bahwa setelah merubah logic, error yang dikeluarkan ke klien bukan **500 Internal Server Error** akibat gagal eksekusi kueri, melainkan bentuk JSON dari Type Validation bawaan standard Elysia. 
Uji cobakan dengan cURL:
```bash
curl -i -X POST http://localhost:3000/api/v1/users \
-H "Content-Type: application/json" \
-d '{
  "username": "tester123",
  "email": "test@domain.com",
  "name": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  "password": "pass"
}'
```

**Hasil Ekspektasi Langkah 5:** 
Request cURL di atas akan di-_reject_ langsung (*early-return*) pada level controller dan menghasilkan status `422 Unprocessable Entity` (Validasi Gagal) daripada membuang bandwidth server menuju database dan menghasilkan respon *crash* 500.

---

**Langkah 6: Tambahkan Unit Test untuk Batas Panjang Karakter**
Agar regresi serupa tidak terjadi, sertakan pengujian otomatis (*Unit / Integration Test*).
Tambahkan *code block* berikut ke dalam berkas `src/modules/users/controller/user.integration.test.ts` (letakkan di dalam scope `describe`):

```typescript
  test("returns 422 for exceeding 255 character validation limit", async () => {
    const bigPayload = {
      username: "long_name_test",
      email: "long@test.com",
      name: "A".repeat(300),
      password: "pass"
    };

    const res = await app.handle(
      new Request("http://localhost/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bigPayload)
      })
    );

    // Schema harus menangkal payload di atas sehingga DB insert tidak dijalankan
    expect(res.status).toBe(422); 
  });
```
