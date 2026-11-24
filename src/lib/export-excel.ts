'use client';

import { StockMovement } from '@/types';
import { formatDate } from './utils';

// Helper to escape CSV cell content
function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

// 1. Export Inventory & Financial Valuation Report to CSV/Excel
export function exportInventoryToCsv({
  warehouseName,
  items,
}: {
  warehouseName: string;
  items: {
    sku: string;
    name: string;
    category: string;
    binLocation: string;
    quantityOnHand: number;
    unit: string;
    unitCost: number;
    totalValuation: number;
    status: string;
  }[];
}) {
  const headers = [
    'Kode SKU',
    'Nama Barang',
    'Kategori',
    'Lokasi Rak (Bin)',
    'Stok Fisik',
    'Satuan Dasar',
    'HPP Satuan (Rp)',
    'Total Valuasi Aset (Rp)',
    'Status Stok',
  ];

  const rows = items.map((item) => [
    escapeCsv(item.sku),
    escapeCsv(item.name),
    escapeCsv(item.category),
    escapeCsv(item.binLocation),
    escapeCsv(item.quantityOnHand),
    escapeCsv(item.unit),
    escapeCsv(item.unitCost),
    escapeCsv(item.totalValuation),
    escapeCsv(item.status),
  ]);

  const totalQty = items.reduce((acc, i) => acc + i.quantityOnHand, 0);
  const totalValuation = items.reduce((acc, i) => acc + i.totalValuation, 0);

  // Summary Row
  rows.push([
    escapeCsv('TOTAL'),
    escapeCsv(`Laporan Inventaris & Valuasi - ${warehouseName}`),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(totalQty),
    escapeCsv('unit'),
    escapeCsv(''),
    escapeCsv(totalValuation),
    escapeCsv(''),
  ]);

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Microsoft Excel auto-detect
    [headers.map(escapeCsv).join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

  downloadBlob(csvContent, `Laporan-Valuasi-Stok-${warehouseName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`);
}

// 2. Export Immutable Ledger Movements to CSV/Excel
export function exportMovementsToCsv({
  warehouseName,
  movements,
}: {
  warehouseName: string;
  movements: StockMovement[];
}) {
  const headers = [
    'Waktu Transaksi',
    'Tipe Mutasi',
    'No. Referensi',
    'Kode SKU',
    'Nama Produk',
    'Gudang',
    'No. Batch / Lot',
    'Perubahan Qty',
    'Satuan Input',
    'HPP Satuan (Rp)',
    'Estimasi Nilai (Rp)',
    'Operator / Pencatat',
    'Catatan Operasional',
  ];

  const rows = movements.map((mov) => {
    const isPositive = mov.quantityChange > 0;
    const qtyChangeStr = isPositive ? `+${mov.quantityChange}` : String(mov.quantityChange);
    const unitCost = mov.unitCost || 0;
    const totalCost = Math.abs(mov.quantityChange) * unitCost;

    return [
      escapeCsv(formatDate(mov.createdAt)),
      escapeCsv(mov.type),
      escapeCsv(mov.referenceNo || '-'),
      escapeCsv(mov.productSku || '-'),
      escapeCsv(mov.productName || '-'),
      escapeCsv(mov.warehouseName || warehouseName),
      escapeCsv(mov.batchNo || '-'),
      escapeCsv(qtyChangeStr),
      escapeCsv(mov.inputUnit || 'Dasar'),
      escapeCsv(unitCost),
      escapeCsv(totalCost),
      escapeCsv(mov.createdBy || 'Sistem'),
      escapeCsv(mov.notes || '-'),
    ];
  });

  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCsv).join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

  downloadBlob(csvContent, `Buku-Besar-Mutasi-${warehouseName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`);
}

// 3. Export Business Analytics & Reorder Report to CSV/Excel
export function exportAnalyticsToCsv({
  warehouseName,
  items,
}: {
  warehouseName: string;
  items: {
    sku: string;
    name: string;
    category: string;
    quantityOnHand: number;
    unit: string;
    dailyRunRate: number;
    daysOfSupply: number;
    reorderPoint: number;
    suggestedReorderQty: number;
    unitCost: number;
    capitalTied: number;
    velocityCategory: string;
  }[];
}) {
  const headers = [
    'Kode SKU',
    'Nama Produk',
    'Kategori',
    'Stok Fisik',
    'Satuan',
    'Rata-rata Keluar / Hari',
    'Sisa Hari Pasokan',
    'Titik Reorder (ROP)',
    'Rekomendasi Jumlah Order',
    'HPP Satuan (Rp)',
    'Modal Mengendap (Rp)',
    'Kategori Perputaran (Velocity)',
  ];

  const rows = items.map((item) => [
    escapeCsv(item.sku),
    escapeCsv(item.name),
    escapeCsv(item.category),
    escapeCsv(item.quantityOnHand),
    escapeCsv(item.unit),
    escapeCsv(item.dailyRunRate.toFixed(1)),
    escapeCsv(item.daysOfSupply >= 999 ? '∞ (Tidak Ada Gerak)' : `${item.daysOfSupply} Hari`),
    escapeCsv(item.reorderPoint),
    escapeCsv(item.suggestedReorderQty),
    escapeCsv(item.unitCost),
    escapeCsv(item.capitalTied),
    escapeCsv(item.velocityCategory),
  ]);

  const totalCapital = items.reduce((acc, i) => acc + i.capitalTied, 0);

  // Summary Row
  rows.push([
    escapeCsv('TOTAL'),
    escapeCsv(`Laporan Analitik Bisnis & ROP - ${warehouseName}`),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(totalCapital),
    escapeCsv(''),
  ]);

  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCsv).join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

  downloadBlob(
    csvContent,
    `Analitik-Bisnis-ROP-${warehouseName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
  );
}

function downloadBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
