# UI/UX Design Specification (`desain.md`): NexStock WMS

**Versi:** 1.0  
**Referensi Visual:** Modern Bento-Grid Control Dashboard (Soft Minimalist & High-Contrast Action)  
**Framework CSS:** Tailwind CSS + Lucide Icons  

---

## 1. Filosofi & Arah Estetika Desain

Antarmuka **NexStock WMS** mengadopsi pendekatan **Clean Bento-Grid Architecture** yang memadukan keterbacaan data operasional tinggi dengan estetika modern yang tenang (tidak melelahkan mata untuk penggunaan jangka panjang di gudang/kantor)[cite: 1]:
* **Modular Bento Cards:** Setiap kelompok informasi (Ringkasan KPI, Pemilih Gudang, Tabel Stok, dan Log Aktivitas) dibungkus dalam kartu independen dengan *border-radius* besar (`24px` / `rounded-3xl`) dan jarak antar-kartu (*gap*) yang konsisten (`16px`–`20px`)[cite: 1].
* **Tactile & Pill Controls:** Elemen interaktif utama seperti status *real-time*, *filter*, dan tombol aksi utama menggunakan bentuk kapsul penuh (`rounded-full`) dengan kontras tinggi[cite: 1].
* **Spatial Hierarchy:** Penggunaan kombinasi latar belakang putih bersih (`#FFFFFF`), abu-abu lembut (`#F4F5F7`), dan gradien hangat-dingin yang sangat halus (*subtle warm-cool tint*) untuk membedakan panel navigasi cabang/gudang dari area data utama[cite: 1].

---

## 2. Sistem Warna (*Color Palette*)

| Token Warna | Hex Code | Kegunaan dalam Aplikasi |
| :--- | :--- | :--- |
| **`bg-canvas`** | `#E8EAEF` | Latar belakang luar layar (*outer viewport background*)[cite: 1]. |
| **`surface-base`** | `#FFFFFF` | Kontainer utama aplikasi dan kartu aktif[cite: 1]. |
| **`surface-muted`** | `#F4F5F7` | Kartu sekunder, *pill* metrik kecil, dan baris tabel bergantian[cite: 1]. |
| **`surface-tint`** | `linear-gradient(180deg, #E2E6F0 0%, #F5EFEA 100%)` | Latar khusus panel pemilih Gudang/Cabang (*Warehouse Selector*) di sisi kanan[cite: 1]. |
| **`ink-primary`** | `#0F172A` | Teks judul utama, angka stok/KPI, dan ikon aktif[cite: 1]. |
| **`ink-secondary`** | `#64748B` | Subjudul, kode SKU, keterangan lokasi rak, dan ikon non-aktif[cite: 1]. |
| **`action-obsidian`** | `#0B101E` | Tombol aksi utama (*Primary CTA* seperti `+ Catat Mutasi`, `+ Tambah Gudang`) dan *toggle* aktif |
| **`status-success`** | `#10B981` | Mutasi Inbound, status `COMPLETED`, stok aman |
| **`status-warning`** | `#F59E0B` | Status `IN_TRANSIT`, stok menipis (*Low Stock Alert*) |
| **`status-danger`** | `#EF4444` | Stok habis (0), status `CANCELLED`, pengurangan Outbound |
| **`status-info`** | `#3B82F6` | Mutasi transfer, penyesuaian (*Adjustment*), informasi audit |

---

## 3. Tipografi & Ikonografi

* **Font Utama:** `Inter`, `Plus Jakarta Sans`, atau font sans-serif modern bawaan Next.js.
  * *Heading 1 (KPI Numbers):* `text-3xl` / `text-4xl` font-bold `tracking-tight` warna `ink-primary`.
  * *Section Header / Bento Card Title:* `text-base` / `text-lg` font-semibold `tracking-tight`.
  * *Body & Table Text:* `text-sm` font-normal / font-medium.
  * *Meta Data, SKU, Timestamps:* `text-xs` font-medium warna `ink-secondary`.
* **Ikonografi:** `lucide-react` dengan stroke lebar `1.75px` hingga `2px`.
  * Master & Gudang: `Warehouse`, `Boxes`, `Package`
  * Mutasi Stok: `ArrowDownLeft` (In), `ArrowUpRight` (Out), `ArrowLeftRight` (Transfer), `SlidersHorizontal` (Adjustment)
  * Status & Alert: `AlertTriangle`, `CheckCircle2`, `Clock`, `ShieldAlert`

---

## 4. Arsitektur Layout Bento-Grid

Dashboard utama mengadopsi 12-kolom Bento Grid yang dinamis:

1. **Header Bar (Full Width):**
   * Logo & Nama Brand NexStock WMS.
   * Quick Search Input SKU / Nama Barang dengan *shortcut* `/`.
   * Warehouse Selector Active Badge (menampilkan gudang aktif saat ini).
   * User Role Pill & Quick Notification.

2. **Top Row (Bento Cards Ringkasan KPI):**
   * **Bento Card 1 (Span 3 / 12):** Total SKU Aktif & Valuasi Ringkas.
   * **Bento Card 2 (Span 3 / 12):** *Low Stock Alert Card* dengan visual warning badge dan jumlah item darurat.
   * **Bento Card 3 (Span 3 / 12):** Mutasi Hari Ini (*In* vs *Out* ratio).
   * **Bento Card 4 (Span 3 / 12 - Tinted Gradient):** Pemilih Gudang / Switcher Cabang aktif dengan daftar gudang terdaftar.

3. **Middle Row (Data Table & Fast Actions):**
   * **Bento Card 5 (Span 8 / 12):** Tabel Inventaris Real-Time dengan indikator stok, lokasi bin/rak, filter kategori, dan tombol cepat *Mutasi / Opname*.
   * **Bento Card 6 (Span 4 / 12):** Kartu Transaksi Cepat (*Quick Actions* & Dokumen Transfer Aktif dalam status `IN_TRANSIT`).

4. **Bottom Row (Audit Trail & Activity):**
   * **Bento Card 7 (Span 12 / 12):** *Immutable Activity Log* (Feed kronologis seluruh mutasi stok, siapa yang mencatat, waktu, dan nomor referensi transaksi).

---

## 5. Standar Komponen UI

* **Bento Card Wrapper:** `bg-white rounded-3xl p-6 shadow-sm border border-slate-100/80 transition-all hover:shadow-md`
* **Badge / Pill:** `rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5`
* **Primary Button:** `rounded-full bg-[#0B101E] text-white hover:bg-slate-800 px-5 py-2.5 text-sm font-medium shadow-sm transition-all active:scale-95`
* **Secondary / Ghost Button:** `rounded-full bg-[#F4F5F7] text-[#0F172A] hover:bg-slate-200 px-4 py-2 text-sm font-medium transition-all`
* **Modal Dialog:** `rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-w-lg w-full backdrop-blur-md`
