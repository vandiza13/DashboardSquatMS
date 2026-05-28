# PANDUAN DEVS & AGEN AI: DASHBOARD TIKET MODERN (SQUAT & MS)

Dokumen ini adalah rangkuman komprehensif dari arsitektur, skema database, aturan bisnis, integrasi pihak ketiga, dan panduan modifikasi aplikasi **Dashboard Tiket Modern**. 

Tujuan dokumen ini adalah membantu agen AI (dan developer manusia) memahami struktur sistem secara cepat dan akurat untuk meminimalkan bug ketika menambahkan fitur baru atau memperbaiki modul yang ada.

---

## 📌 1. GAMBARAN UMUM APLIKASI
Aplikasi ini adalah dashboard pemantauan tiket real-time berbasis **Next.js App Router** untuk melacak kinerja dan waktu penyelesaian tiket lapangan (Time to Resolve / TTR) di bawah koordinasi tim **SQUAT & MS**.

Aplikasi ini mendukung beberapa kategori utama penyedia / sub-layanan telekomunikasi:
1. **SQUAT**: Terdiri dari subkategori `TSEL` (Telkomsel) dan `OLO` (Other Operators).
2. **MTEL** (Mitratel): Terdiri dari subkategori `TIS`, `MMP`, dan `FIBERISASI`.
3. **UMT**: Terdiri dari subkategori `UMT`.
4. **CENTRATAMA**: Terdiri dari subkategori `FSI` (Fiberisasi Centratama).

---

## 🗂️ 2. STRUKTUR WORKSPACE & DIREKTORI
Berikut adalah peta direktori utama proyek:

```text
dashboard-tiket-modern/
├── public/                  # Aset statis (gambar, favicon, dll.)
├── src/
│   ├── app/                 # Next.js App Router Pages & API Routes
│   │   ├── api/             # REST API Endpoints (Backend)
│   │   │   ├── login/       # Login auth API
│   │   │   ├── logout/      # Logout auth API
│   │   │   ├── me/          # Mendapatkan detail session user yang login
│   │   │   ├── productivity/# API statistik produktivitas teknisi
│   │   │   ├── profile/     # Update profil user yang login
│   │   │   ├── stats/       # Agregasi data statistik untuk dashboard overview
│   │   │   ├── technicians/ # CRUD & status teknisi
│   │   │   ├── tickets/     # CRUD, Bulk Import, Sync TACC tiket
│   │   │   └── users/       # Manajemen user & reset password (khusus Admin)
│   │   ├── dashboard/       # Halaman utama aplikasi (Frontend client-side)
│   │   │   ├── productivity/# Halaman performa teknisi
│   │   │   ├── profile/     # Halaman profil user
│   │   │   ├── technicians/ # Halaman kelola data teknisi
│   │   │   ├── tickets/     # Halaman utama tabel tiket & log history
│   │   │   ├── users/       # Halaman manajemen user (khusus Admin)
│   │   │   ├── layout.js    # Sidebar + Header layout
│   │   │   └── page.js      # Dashboard Overview (charts, SLA widgets)
│   │   ├── login/           # Halaman login
│   │   ├── globals.css      # Desain token, tema, variabel CSS, utility Tailwind v4
│   │   ├── layout.js        # Root html layout
│   │   └── page.js          # Root redirect ke /dashboard
│   ├── components/          # Reusable UI React Components
│   │   ├── BulkTicketModal.js      # Modal import file Excel
│   │   ├── DashboardChart.js       # Komponen chart dashboard
│   │   ├── Header.js               # Header navigasi, theme toggle, profil
│   │   ├── Sidebar.js              # Navigasi kiri, tautan TACC eksternal
│   │   ├── TicketFormModal.js      # Form tambah/edit tiket & popup konfirmasi closed
│   │   ├── SyncTaccModal.js        # Modal untuk retro-sync data TTR dari Excel TACC
│   │   └── StatusBadge.js / Toast.js / Skeleton.js # UI pendukung
│   ├── context/
│   │   └── ThemeContext.js  # Context provider untuk Dark/Light mode
│   ├── lib/
│   │   ├── auth.js          # JWT Sign & Verify menggunakan library 'jose'
│   │   ├── db.js            # Koneksi pool MySQL/TiDB Serverless (SSL Ready)
│   │   ├── googleSheets.js  # Logika ekspor tiket otomatis ke Google Spreadsheet
│   │   ├── pusher.js        # Pusher Server Instance (Backend)
│   │   └── pusher-client.js # Pusher Client Instance (Frontend)
│   └── proxy.js             # Utility proxy setup
├── .env.local               # Konfigurasi Environment Variables lokal
├── next.config.mjs          # Konfigurasi Next.js
└── package.json             # Dependensi aplikasi
```

---

## 🛢️ 3. SKEMA DATABASE (TIDB / MYSQL)
Aplikasi terhubung ke database **TiDB Serverless** menggunakan pool dari library `mysql2/promise`. Koneksi database **wajib menggunakan SSL** dengan konfigurasi TLSv1.2 yang ketat (lihat `src/lib/db.js`).

Berikut relasi dan struktur tabel database yang diidentifikasi secara implisit:

### 1. Tabel `users`
Menyimpan data pengguna sistem yang memiliki hak akses login.
- `id` (int, PK, AUTO_INCREMENT)
- `username` (varchar, unique)
- `password` (varchar, hashed bcryptjs)
- `role` (varchar: `'Admin'`, `'User'`, `'View'`)

### 2. Tabel `tickets`
Menyimpan informasi inti tiket gangguan lapangan.
- `id` (int, PK, AUTO_INCREMENT)
- `id_tiket` (varchar, unique): Kode tiket internal (contoh: `TR-XXXX`).
- `id_tiket_tacc` (varchar): ID tiket dari sistem TACC (opsional untuk SQUAT, wajib untuk UMT, MTEL, CENTRATAMA).
- `category` (varchar): `'SQUAT'`, `'MTEL'`, `'UMT'`, `'CENTRATAMA'`.
- `subcategory` (varchar): Subkategori dari masing-masing kategori utama (contoh: `TSEL`, `OLO`, `TIS`).
- `priority` (varchar, nullable): Tingkat prioritas penanganan (menentukan batas SLA).
- `tiket_time` (datetime): Waktu tiket masuk pertama kali.
- `close_time` (datetime, nullable): Waktu tiket ditutup.
- `deskripsi` (text): Detail keluhan atau deskripsi gangguan.
- `status` (varchar): `'OPEN'`, `'SC'` (Stop Clock), `'CLOSED'`.
- `update_progres` (text, nullable): Progress pengerjaan terakhir atau Root Cause Analysis (RCA) jika status CLOSED.
- `created_by_user_id` (int): Relasi ke `users.id`.
- `updated_by_user_id` (int): Relasi ke `users.id`.
- `last_update_time` (datetime): Waktu update terakhir.
- `partner_technicians` (text, nullable): String gabungan nama & nomor telepon teknisi pendukung (partner).
- `sto` (varchar, nullable): Kode STO (contoh: `CBG`, `CIK` - khusus SQUAT).
- `district` (varchar, nullable): District (contoh: `BEKASI`, `KARAWANG` - khusus SQUAT).
- `ttr_tacc` (decimal/varchar, nullable): Durasi pengerjaan dalam jam yang disinkronisasi dari sistem TACC.

### 3. Tabel `technicians`
Menyimpan data induk teknisi aktif yang bertugas di lapangan.
- `nik` (varchar, PK): Nomor Induk Karyawan teknisi.
- `name` (varchar): Nama lengkap teknisi.
- `position_name` (varchar): Jabatan / Posisi teknisi.
- `phone_number` (varchar): Nomor telepon/WhatsApp aktif.
- `is_active` (tinyint): Status aktif (`1` = aktif, `0` = non-aktif).

### 4. Tabel `ticket_technicians` (Junction Table)
Menghubungkan tiket dengan teknisi utama yang ditugaskan (PIC Utama).
- `ticket_id` (int, FK ke `tickets.id`)
- `technician_nik` (varchar, FK ke `technicians.nik`)

### 5. Tabel `ticket_history`
Log audit internal untuk mencatat semua perubahan status dan progres tiket.
- `id` (int, PK, AUTO_INCREMENT)
- `ticket_id` (int, FK ke `tickets.id`)
- `change_details` (text): Deskripsi apa saja yang diubah (misal: "Status berubah: OPEN ➝ CLOSED").
- `changed_by` (varchar): Nama user / updater yang melakukan perubahan.
- `change_timestamp` (datetime): Waktu pencatatan log.

---

## ⏱️ 4. ATURAN BISNIS SLA & AGING TIKET
Aplikasi memiliki kalkulasi visual yang dinamis untuk menghitung sisa waktu penanganan tiket berdasarkan tingkat prioritasnya (SLA). Aturan ini dipetakan di `src/app/dashboard/tickets/page.js` dan stats API:

### A. Prioritas Kategori SQUAT (SLA-Aware)
| Subkategori | Prioritas (Priority) | Durasi SLA |
| :--- | :--- | :--- |
| **TSEL** | `PREMIUM` | **2 Jam** |
| **TSEL** | `CRITICAL` | **4 Jam** |
| **TSEL** | `MAJOR` | **8 Jam** |
| **TSEL** | `MINOR` | **16 Jam** |
| **TSEL** | `LOW` | **24 Jam** |
| **TSEL** | `CNQ` | **24 Jam** |
| **OLO** | `NON-GAMAS` | **4 Jam** |
| **OLO** | `GAMAS` | **7 Jam** |
| **OLO** | `QUALITY` | **7 Jam** |

#### Status Penanganan Tiket Terbuka (Open/SC) SQUAT:
1. **BREACHED (Lewat SLA)**: Jika tiket aktif melebihi batas durasi jam prioritas. Baris tabel akan berwarna merah lembut.
2. **WARNING (Siaga)**: Jika durasi penanganan sudah berjalan `> 75%` dari limit SLA. Baris tabel akan berwarna jingga lembut.
3. **ON TRACK (Aman)**: Jika waktu penanganan saat ini masih di bawah `75%` limit SLA.

### B. Aturan Penanganan Tiket Default (Kategori Lain)
Untuk tiket non-SQUAT (MTEL, UMT, CENTRATAMA), kategori penuaan (aging) dihitung murni berdasarkan jam berjalan sejak `tiket_time`:
- **Aman**: `< 4 Jam`
- **Warning**: `4 - 12 Jam`
- **Urgent**: `12 - 24 Jam`
- **Kritis (Breached)**: `> 24 Jam`

---

## 🔄 5. REAL-TIME SYNCHRONIZATION (PUSHER)
Aplikasi mendukung pembaruan data real-time tanpa perlu me-reload halaman browser secara manual.

- **Pusher Channel**: `dashboard-channel`
- **Pusher Event**: `ticket-update`
- **Tindakan**: Saat event diterima, modul Overview Dashboard & Tabel Tiket otomatis memanggil kembali (refetch) API stats / tickets untuk menyajikan data terbaru.
- **Implementasi Backend**: Dipicu di endpoint POST, PUT, dan DELETE pada file:
  - `src/app/api/tickets/route.js`
  - `src/app/api/tickets/[id]/route.js`
  - `src/app/api/tickets/[id]/history/route.js` (jika ada)

---

## 📊 6. AUTOMATIC EXPORTS & SHEET INTEGRATIONS
Ketika status tiket diubah menjadi `CLOSED` oleh admin atau user, sistem otomatis mengeksekusi dua integrasi data:

### A. Integrasi Google Sheets API (`src/lib/googleSheets.js`)
Tiket yang ditutup akan diekspor langsung secara asinkron ke Google Spreadsheet tertentu (`process.env.GOOGLE_SPREADSHEET_ID`) sesuai dengan pemetaan tab lembar kerja berikut:
- Kategori `SQUAT` & Subkategori `TSEL` ➝ Tab **'TSEL'**
- Kategori `SQUAT` & Subkategori `OLO` ➝ Tab **'OLO'**
- Kategori `MTEL` ➝ Tab **'MTEL'**
- Kategori `UMT` ➝ Tab **'UMT'**
- Kategori `CENTRATAMA` ➝ Tab **'FSI'**

#### Logika Penulisan di Spreadsheet:
- **Nomor Urut Otomatis**: Kolom A secara otomatis diisi dengan nomor urut terakhir + 1 dengan membaca data numerik di kolom A.
- **Deteksi Baris Kosong**: Kolom B digunakan sebagai referensi pengisian baris baru.
- **Waktu Lokal WIB**: Semua format tanggal dikonversi ke format WIB (`Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta' })`) sebelum dikirim ke Google Sheets API.

---

## ⚙️ 7. INTEGRASI SYNC TACC (`src/app/api/tickets/sync-tacc/route.js`)
Berfungsi untuk memperbarui atribut `ttr_tacc` (durasi penyelesaian bersih) dan `id_tiket_tacc` dari database internal dengan mengunggah file ekspor Excel resmi dari TACC.

### Konfigurasi Pemetaan Header Kolom Excel:
- **UMT / MTEL / CENTRATAMA**:
  - Kolom ID TACC ➝ `'Nomor TT'`
  - Kolom TTR ➝ `'TTR NET (Jam)'`
  - Kolom Tiket Internal ➝ `'Tiket'` (berisi nomor TR-xxx internal)
  - Kolom Waktu Selesai ➝ `'Req Close'`

---

## 🔐 8. PROSEDUR KEAMANAN & AUTHORIZATION
Keamanan rute backend dilindungi dengan **JSON Web Token (JWT)** menggunakan library `jose` (berbasis runtime Next.js Edge/Serverless compatible).

### Tingkat Hak Akses Pengguna (Roles):
1. **Admin**:
   - Memiliki semua izin akses.
   - Dapat menambah, mengedit, dan menghapus tiket secara permanen.
   - Dapat mengelola data user, mengganti password, dan mengelola teknisi.
2. **User**:
   - Dapat menambah tiket baru.
   - Dapat memperbarui status tiket (termasuk mengubah status ke CLOSED).
   - **Pembatasan Penting**: Tiket yang sudah berstatus `CLOSED` tidak dapat diubah kembali oleh akun ber-role User biasa (hanya Admin yang bisa).
3. **View**:
   - Hanya memiliki izin membaca data (Read-Only).
   - Seluruh tombol Buat/Edit/Hapus dinonaktifkan di sisi antarmuka (frontend) dan dilindungi di sisi API (403 Forbidden).

---

## 🧠 9. HAL PENTING UNTUK AGEN AI (DEVELOPMENT GUIDELINES)

Jika Anda ditugaskan untuk **menambah fitur baru** atau **memperbaiki bug**, wajib mematuhi panduan teknis berikut:

### 1. Gunakan Transaksi SQL Secara Aman untuk TiDB Cloud
TiDB Serverless sangat sensitif terhadap manajemen koneksi. Selalu gunakan SQL murni untuk perintah transaksi (`START TRANSACTION`, `COMMIT`, `ROLLBACK`) langsung pada pool `db.query` seperti contoh di `/api/tickets/sync-tacc/route.js`, atau jika menggunakan koneksi transaksi manual:
```javascript
const connection = await db.getConnection();
try {
    await connection.beginTransaction();
    // execute queries...
    await connection.commit();
} catch (e) {
    await connection.rollback();
    throw e;
} finally {
    connection.release();
}
```

### 2. Pertahankan SSL Database
Modul `src/lib/db.js` memiliki konfigurasi SSL khusus untuk TiDB Cloud:
```javascript
ssl: {
  minVersion: 'TLSv1.2',
  rejectUnauthorized: true
}
```
Jangan pernah menghapus atau mematikan opsi SSL ini karena akan memutus koneksi aplikasi ke server database produksi.

### 3. Jaga Sinkronisasi Pusher
Setiap kali Anda membuat endpoint yang memodifikasi status tiket (CREATE, UPDATE, DELETE, BULK IMPORT, SYNC TACC), pastikan untuk memicu event Pusher agar tampilan layar klien langsung sinkron secara real-time:
```javascript
await pusherServer.trigger('dashboard-channel', 'ticket-update', {
    message: 'Update log details...',
    type: 'ACTION_TYPE',
    ticketId: id
});
```

### 4. Pahami Logika TTR di Dashboard Stats
Agregasi TTR pada `/api/stats/route.js` mengekstrak data string angka desimal dari database (`ttr_tacc` bisa berisi format string `'4,5'` atau `'4.5'`) dengan mengubah koma menjadi titik sebelum melakukan agregasi rata-rata menggunakan `CAST(REPLACE(TRIM(ttr_tacc), ',', '.') AS DECIMAL(10,2))`. 
Pastikan data `ttr_tacc` yang masuk divalidasi dengan regex yang benar agar tidak merusak fungsi statistik dashboard.

### 5. Google Sheets Fallback
Pastikan penulisan data ke Google Sheets dibungkus dalam blok `try-catch` terpisah (seperti pada PUT route). Jika Google Sheets API gagal (misal kuota habis atau kredensial kedaluwarsa), proses penyimpanan tiket di database internal **harus tetap berhasil** dan tidak boleh ikut ter-rollback.

---

*Dokumen ini dibuat untuk memandu analisis cepat demi efisiensi pengerjaan tugas berikutnya. Harap perbarui dokumen ini jika ada perubahan struktur database atau logika bisnis yang mendasar.*
