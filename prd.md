# Product Requirements Document (PRD): NexStock WMS

**Versi:** 1.0 (MVP)  
**Status:** Draft / Siap Dikembangkan  
**Stack Teknologi:** Next.js (App Router), Supabase (PostgreSQL, Auth, Realtime), Tailwind CSS, Vercel  

---

## 1. Evaluasi Konsep & Kelayakan Industri

### 1.1 Kekuatan Konsep (*Strengths*)
* **Relevansi Tinggi dengan Industri:** Sistem ini tidak berhenti pada operasi CRUD standar, melainkan menerapkan pola *Immutable Ledger* (buku besar stok) dan *State Machine* untuk mutasi barang—dua konsep arsitektur yang sangat dicari di perusahaan ritel, logistik, dan *e-commerce*.
* **Integritas Data Terjamin:** Pemisahan antara tabel master produk (`products`), lokasi stok (`inventory_levels`), dan log transaksi (`stock_movements`) mencegah inkonsistensi data saat skala bisnis membesar ke multi-cabang.
* **Potensi Skalabilitas:** Struktur database dirancang mendukung *multi-warehouse* sejak awal tanpa perlu merombak skema utama di kemudian hari.

### 1.2 Risiko Teknis & Mitigasi (*Technical Risks & Mitigation*)
* **Risiko *Race Condition* (Stok Minus):** Dua pengguna mengurangi stok terakhir pada milidetik yang sama.  
  * *Mitigasi:* Menggunakan *PostgreSQL RPC (Stored Procedures)* dengan penguncian baris (`SELECT ... FOR UPDATE`) sehingga transaksi diproses secara berurutan (atomik).
* **Kompleksitas *Scope* (Over-engineering):** Terlalu banyak fitur akuntansi (HPP/COGS, faktur pajak) dapat menghambat penyelesaian MVP.  
  * *Mitigasi:* MVP difokuskan secara ketat pada pergerakan fisik barang (*Inbound, Outbound, Internal Transfer, Stock Opname*) dan akurasi kuantitas stok.

---

## 2. Latar Belakang & Tujuan Produk

### 2.1 Masalah (*Problem Statement*)
Perusahaan dengan lebih dari satu lokasi penyimpanan sering mengalami selisih stok antara catatan sistem dan fisik gudang akibat pencatatan manual, ketidakjelasan status barang saat sedang dikirim antar-cabang, serta tidak adanya jejak audit (*audit trail*) ketika terjadi perubahan jumlah stok.

### 2.2 Tujuan Utama (*Goals*)
1. Menyediakan visibilitas stok secara *real-time* di seluruh gudang/cabang dalam satu dasbor terpusat.
2. Menjamin akurasi data melalui pencatatan mutasi berbasis transaksi (*append-only ledger*) yang tidak dapat diubah secara sepihak.
3. Mengamankan alur transfer barang antar-gudang menggunakan status transit hingga barang diverifikasi oleh penerima.

---

## 3. Target Pengguna & Hak Akses (RBAC)

| Peran (*Role*) | Deskripsi Tugas | Hak Akses Utama |
| :--- | :--- | :--- |
| **Super Admin** | Pemilik bisnis atau manajer operasional pusat. | Akses penuh ke semua gudang, master SKU, pembuatan user, laporan valuasi aset, dan *audit log*. |
| **Warehouse Lead** | Kepala gudang pada cabang tertentu. | Mengelola stok di gudangnya, menyetujui *Stock Opname*, dan mengonfirmasi penerimaan transfer masuk. |
| **Warehouse Staff** | Operator lapangan di gudang. | Mencatat barang masuk (*Inbound*), barang keluar (*Outbound*), dan melakukan penghitungan fisik (*Stock Opname*). |

---

## 4. Fitur Utama (MVP Scope)

### 4.1 Manajemen Master Data (Produk & Gudang)
* **Manajemen Gudang:** Tambah/edit lokasi gudang (Pusat/Cabang) beserta status aktifnya.
* **Master SKU:** Pengelolaan data produk meliputi SKU (unik), nama barang, kategori, satuan (*pcs, box, kg*), lokasi rak (*bin location*), dan batas minimum stok (*reorder point*).

### 4.2 Transaksi Pergerakan Stok (*Stock Movements*)
Setiap perubahan stok wajib menghasilkan catatan baru di tabel `stock_movements` dan memperbarui `inventory_levels` secara atomik:
1. **Inbound (Barang Masuk):** Penambahan stok berdasarkan nomor referensi *Purchase Order* (PO) atau pemasok.
2. **Outbound (Barang Keluar):** Pengurangan stok berdasarkan pesanan pelanggan atau pengeluaran operasional (validasi ketat: jumlah keluar tidak boleh melebihi stok tersedia).
3. **Internal Transfer (Mutasi Antar-Gudang):**
   * *Step 1 (`IN_TRANSIT`):* Gudang pengirim membuat surat jalan transfer $\rightarrow$ stok gudang pengirim langsung berkurang.
   * *Step 2 (`COMPLETED`):* Gudang penerima memverifikasi fisik barang $\rightarrow$ stok gudang penerima bertambah.
   * *Step 3 (`CANCELLED`):* Jika dibatalkan sebelum diterima, stok otomatis dikembalikan ke gudang pengirim.

### 4.3 Stock Opname & Penyesuaian (*Adjustment*)
* Staf gudang menginput jumlah hitungan fisik aktual di rak.
* Sistem menghitung selisih otomatis (`Stok Sistem` vs `Stok Fisik`).
* Memerlukan persetujuan *Warehouse Lead* atau *Super Admin* sebelum sistem membuat transaksi `ADJUSTMENT` untuk menyamakan angka stok.

### 4.4 Dasbor Operasional & Peringatan Dini
* **Kartu Ringkasan KPI:** Total SKU aktif, jumlah item dengan status *Low Stock*, dan total transaksi hari ini.
* **Low-Stock Alert:** Penanda visual otomatis (badge peringatan) jika `quantity_on_hand <= min_stock_alert`.
* **Immutable Audit Log:** Riwayat kronologis seluruh aktivitas stok lengkap dengan informasi pengguna, waktu, jenis mutasi, dan nomor referensi.

---

## 5. Arsitektur Database (Skema Inti)

```sql
-- 1. Gudang / Cabang
warehouses (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- 2. Master Produk
products (
  id UUID PRIMARY KEY,
  sku VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  unit VARCHAR NOT NULL,
  min_stock_alert INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- 3. Level Stok per Gudang
inventory_levels (
  id UUID PRIMARY KEY,
  warehouse_id UUID REFERENCES warehouses(id),
  product_id UUID REFERENCES products(id),
  bin_location VARCHAR,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(warehouse_id, product_id)
)

-- 4. Buku Besar Pergerakan Stok (Immutable)
stock_movements (
  id UUID PRIMARY KEY,
  warehouse_id UUID REFERENCES warehouses(id),
  product_id UUID REFERENCES products(id),
  type VARCHAR NOT NULL, -- 'IN', 'OUT', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT'
  quantity_change INTEGER NOT NULL, -- Positif untuk masuk, negatif untuk keluar
  reference_no VARCHAR,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
)

-- 5. Dokumen Transfer Antar-Gudang
stock_transfers (
  id UUID PRIMARY KEY,
  transfer_no VARCHAR UNIQUE NOT NULL,
  from_warehouse_id UUID REFERENCES warehouses(id),
  to_warehouse_id UUID REFERENCES warehouses(id),
  status VARCHAR NOT NULL, -- 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'
  created_by UUID REFERENCES auth.users(id),
  received_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
)