# 📊 Site-AR-Info

**Site-AR-Info** adalah sistem otomatisasi pengolahan data **Accounts Receivable (AR)** terintegrasi yang menggabungkan *pipeline* pemrosesan data lokal berbasis **Python (ETL)** dengan sistem informasi dan *dashboard monitoring* berbasis **Google Spreadsheet & Google Apps Script (Web App)**.

Proyek ini dirancang untuk menyederhanakan proses pembaruan data AR secara berkala—mulai dari penyalinan data mentah, standarisasi format tanggal, injeksi otomatis ke Google Spreadsheet, hingga visualisasi **Ringkasan AR** dan **Watchlist** melalui antarmuka web.

---

## 🔄 Alur Kerja Sistem (System Workflow)

Secara keseluruhan, sistem ini bekerja melalui **2 tahapan utama**: **Pipeline Otomatisasi Data (Dapur Python)** dan **Dashboard Web App (Google Apps Script)**.

```text
[Data Mentah AR] 
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ EKSEKUTOR UTAMA: Perbarui Data AR.py                     │
├──────────────────────────────────────────────────────────┤
│  1. 1_CopyData.py        -> Menyalin data sumber AR      │
│  2. 2_AdjDateFormat.py   -> Standarisasi format tanggal  │
│  3. 3_ARInjectionToSS.py -> Injeksi ke Google Sheets API │
└──────────────────────────────────────────────────────────┘
       │ (Menggunakan config.conf & credentials.json)
       ▼
[Google Spreadsheet Database]
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ GOOGLE APPS SCRIPT & WEB APP (Dapur/Asset/)              │
├──────────────────────────────────────────────────────────┤
│  • Code.gs      -> Controller utama & penyaji Web App    │
│  • Ringkasan.gs -> Pengolahan metrik & ringkasan data AR │
│  • Watchlist.gs -> Pemantauan akun/data AR prioritas     │
│  • Index.html   -> Antarmuka pengguna (Frontend Web)     │
└──────────────────────────────────────────────────────────┘
```

### Detail Alur Proses:
1. **Inisiasi (`Perbarui Data AR.py`)**  
   Pengguna menjalankan skrip utama `Perbarui Data AR.py` sebagai *orchestrator* yang memanggil modul-modul di dalam folder `Dapur/` secara berurutan.
2. **Tahap 1: Penyalinan Data (`1_CopyData.py`)**  
   Mengambil dan menyalin file/data sumber AR mentah ke direktori kerja sementara agar file asli tetap aman dan tidak rusak selama proses modifikasi.
3. **Tahap 2: Penyesuaian Format Tanggal (`2_AdjDateFormat.py`)**  
   Melakukan pembersihan (*data cleaning*) dan standarisasi format kolom tanggal pada data AR agar seragam dan kompatibel saat diolah oleh rumus Google Spreadsheet maupun Google Apps Script (misalnya untuk perhitungan umur piutang/*aging AR*).
4. **Tahap 3: Injeksi Data ke Spreadsheet (`3_ARInjectionToSS.py`)**  
   Membaca konfigurasi dari `config.conf` dan melakukan autentikasi ke Google API menggunakan `credentials.json`, lalu mengunggah/menginjeksi data AR yang sudah bersih langsung ke Google Spreadsheet tujuan.
5. **Tahap 4: Penyajian Informasi & Dashboard (`Dapur/Asset/`)**  
   Data yang telah masuk ke Google Spreadsheet diolah oleh Google Apps Script (`Code.gs`, `Ringkasan.gs`, dan `Watchlist.gs`) untuk ditampilkan ke pengguna akhir melalui antarmuka web interaktif (`Index.html`).

---

## 📁 Struktur Direktori

```text
Site-AR-Info/
├── Dapur/
│   ├── Asset/
│   │   ├── Code.gs               # Skrip utama Google Apps Script (Routing & Backend)
│   │   ├── Index.html            # Antarmuka Frontend Web App Site-AR-Info
│   │   ├── Ringkasan.gs          # Modul logika pengolahan data Ringkasan AR
│   │   ├── Watchlist.gs          # Modul logika pemantauan daftar pantau (Watchlist) AR
│   │   └── logo-nav.png          # Aset gambar logo navigasi pada aplikasi web
│   ├── __init__.py               # Inisialisasi package Python Dapur
│   ├── 1_CopyData.py             # Modul langkah 1: Penyalinan data mentah AR
│   ├── 2_AdjDateFormat.py        # Modul langkah 2: Normalisasi & penyesuaian format tanggal
│   ├── 3_ARInjectionToSS.py      # Modul langkah 3: Injeksi data ke Google Spreadsheet
│   ├── config.conf               # File konfigurasi (path file, ID Spreadsheet, nama sheet)
│   └── credentials.json          # Kredensial Google Cloud Service Account (API Key/Token)
├── Perbarui Data AR.py           # Skrip eksekutor utama untuk memperbarui data AR
└── README.md                     # Dokumentasi proyek
```

---

## 🛠️ Prasyarat & Instalasi

Sebelum menjalankan otomatisasi pembaruan data, pastikan perangkat Anda telah memenuhi prasyarat berikut:

### 1. Lingkungan Python
Pastikan **Python 3.8+** telah terpasang di komputer Anda. Instal pustaka (*library*) yang dibutuhkan untuk pengolahan data dan koneksi Google Sheets API:

```bash
pip install pandas openpyxl gspread google-auth oauth2client configparser
```
*(Catatan: Sesuaikan daftar library di atas jika terdapat modul spesifik tambahan yang digunakan di lingkungan lokal Anda).*

### 2. Google Cloud Service Account (`credentials.json`)
File `Dapur/credentials.json` pada repositori ini berisi data *dummy* demi keamanan. Untuk menjalankannya di lingkungan produksi:
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat proyek baru dan aktifkan **Google Sheets API** serta **Google Drive API**.
3. Buat **Service Account**, lalu unduh kunci privat dalam format **JSON**.
4. Ubah nama file JSON tersebut menjadi `credentials.json` dan letakkan di dalam folder `Dapur/` (menggantikan file *dummy*).
5. Bagikan (*Share*) akses **Editor** pada Google Spreadsheet target Anda ke alamat email Service Account (`client_email` yang tertera di dalam `credentials.json`).

### 3. Konfigurasi (`Dapur/config.conf`)
Sesuaikan parameter yang ada di dalam file `Dapur/config.conf` dengan lingkungan lokal Anda, seperti:
- Lokasi/*path* direktori file sumber data AR.
- ID Google Spreadsheet atau nama *Worksheet* tujuan injeksi.

---

## 🚀 Cara Penggunaan

### A. Memperbarui Data AR (Lokal ke Google Spreadsheet)
Setiap kali terdapat pembaruan data AR mentah, Anda cukup menjalankan skrip utama dari terminal/Command Prompt atau klik dua kali pada file eksekutor:

```bash
python "Perbarui Data AR.py"
```

Skrip akan secara otomatis menjalankan alur kerja di dalam folder `Dapur`:
1. Menyalin file sumber (`1_CopyData.py`).
2. Memperbaiki format tanggal (`2_AdjDateFormat.py`).
3. Mengirimkan data terbaru ke Google Spreadsheet (`3_ARInjectionToSS.py`).

### B. Deployment Dashboard Web App (Google Apps Script)
Jika Anda ingin memasang atau memperbarui antarmuka web **Site-AR-Info** pada Google Spreadsheet baru:
1. Buka Google Spreadsheet target Anda.
2. Pilih menu **Extensions** > **Apps Script**.
3. Salin isi file yang ada di dalam folder `Dapur/Asset/` ke proyek Apps Script Anda:
   - `Code.gs`
   - `Ringkasan.gs`
   - `Watchlist.gs`
   - `Index.html`
4. Klik **Deploy** > **New deployment** > pilih jenis **Web app**.
5. Atur akses sesuai kebutuhan organisasi Anda, lalu klik **Deploy** untuk mendapatkan URL aplikasi **Site-AR-Info**.

---

## 🔒 Catatan Keamanan

- **Jangan pernah** mengunggah (*commit/push*) file `Dapur/credentials.json` asli yang berisi *private key* Google Cloud Service Account Anda ke repositori publik.
- Pastikan informasi sensitif seperti ID Spreadsheet internal pada `Dapur/config.conf` dikelola dengan aman.

---

## 📜 Lisensi

Proyek ini dikembangkan untuk keperluan internal perpajakan dan internal perusahaan. Silakan sesuaikan dengan kebutuhan organisasi Anda.

---

*Dikembangkan oleh [ACC-TAX-REIGHTEEN](https://github.com/ACC-TAX-REIGHTEEN)*
