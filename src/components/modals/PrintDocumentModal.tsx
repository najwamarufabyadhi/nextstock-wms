'use client';

import React from 'react';
import { StockTransfer, StockOpname } from '@/types';
import { X, Printer, FileText, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { SvgBarcode, SvgQrCode } from '@/lib/barcode-svg';

interface PrintDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'TRANSFER' | 'OPNAME';
  transferData?: StockTransfer | null;
  opnameData?: StockOpname | null;
}

export default function PrintDocumentModal({
  isOpen,
  onClose,
  documentType,
  transferData,
  opnameData,
}: PrintDocumentModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const isTransfer = documentType === 'TRANSFER' && transferData;
  const isOpname = documentType === 'OPNAME' && opnameData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl w-full max-w-4xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0 print:w-full">
        {/* Header - Hidden in Print */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-[#0B101E] text-white">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isTransfer
                  ? 'Surat Jalan Pengiriman Antar-Gudang'
                  : 'Berita Acara Hasil Stock Opname'}
              </h2>
              <p className="text-xs text-slate-500">
                Dokumen resmi operasional format A4 siap cetak dan tanda tangan basah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* PRINTABLE A4 DOCUMENT SHEET                                               */}
        {/* ========================================================================= */}
        <div className="my-4 bg-slate-100 p-4 sm:p-8 rounded-2xl flex justify-center print:bg-white print:p-0 print:m-0">
          <div className="bg-white border border-slate-300 w-full max-w-3xl p-8 sm:p-10 shadow-lg text-slate-900 print:border-none print:shadow-none print:p-4 text-xs font-sans">
            {/* Kop Surat Perusahaan */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xl tracking-tight text-slate-950 uppercase">
                    NEXSTOCK WMS
                  </span>
                  <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded uppercase">
                    LOGISTICS
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-medium mt-1 leading-relaxed">
                  PT NexStock Ritel & Distribusi Logistik Terpadu<br />
                  Kawasan Industri Pusat Niaga Terpadu Blok C-12, Jakarta<br />
                  Telp: (021) 555-0982 | Email: operations@nexstock.wms
                </div>
              </div>

              <div className="text-right">
                <div className="font-extrabold text-sm uppercase tracking-wide text-slate-900">
                  {isTransfer ? 'SURAT JALAN TRANSFER' : 'BERITA ACARA OPNAME'}
                </div>
                <div className="font-mono text-xs font-bold text-slate-700 mt-1">
                  NO: {isTransfer ? transferData.transferNo : opnameData?.opnameNo}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Tanggal: {formatDate(isTransfer ? transferData.createdAt : opnameData?.createdAt || '')}
                </div>
                <div className="mt-2 inline-block">
                  <SvgBarcode
                    value={isTransfer ? transferData.transferNo : opnameData?.opnameNo || 'DOC-01'}
                    height={38}
                    showText={false}
                  />
                </div>
              </div>
            </div>

            {/* Dokumen 1: SURAT JALAN TRANSFER ANTAR-GUDANG */}
            {isTransfer && (
              <div className="space-y-4">
                {/* Info Gudang Pengirim & Penerima */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                      Gudang Pengirim (Asal):
                    </span>
                    <strong className="text-xs text-slate-900 block font-bold">
                      {transferData.fromWarehouseName}
                    </strong>
                    <span className="text-[11px] text-slate-600">
                      Disiapkan oleh: {transferData.createdBy || 'Petugas Gudang'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                      Gudang Penerima (Tujuan):
                    </span>
                    <strong className="text-xs text-slate-900 block font-bold">
                      {transferData.toWarehouseName}
                    </strong>
                    <span className="text-[11px] text-slate-600">
                      Status Muatan:{' '}
                      <strong className="text-amber-700 uppercase font-mono">
                        {transferData.status}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Catatan Pengiriman */}
                {transferData.notes && (
                  <div className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <strong>Instruksi Ekspedisi:</strong> {transferData.notes}
                  </div>
                )}

                {/* Tabel Rincian Barang yang Ditransfer */}
                <table className="w-full text-left border-collapse border border-slate-200 my-3">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase border-b border-slate-200">
                      <th className="py-2 px-3 border-r border-slate-200 w-10 text-center">No</th>
                      <th className="py-2 px-3 border-r border-slate-200">Kode SKU & Nama Barang</th>
                      <th className="py-2 px-3 border-r border-slate-200 text-center w-28">No. Batch / Lot</th>
                      <th className="py-2 px-3 text-right w-24">Jumlah Fisik</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {transferData.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200">
                          <div className="font-bold text-slate-900">{item.productName}</div>
                          <div className="font-mono text-[10px] text-slate-500">{item.productSku}</div>
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-center text-slate-600">
                          {item.batchNo || 'LOT-2026-GEN'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {item.quantity} unit
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Kolom Tanda Tangan Basah Formal (3 Kolom) */}
                <div className="grid grid-cols-3 gap-4 pt-8 text-center text-xs">
                  <div className="space-y-14">
                    <span className="font-semibold text-slate-600">Petugas Pengirim,</span>
                    <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                      ( {transferData.createdBy || '........................'} )
                    </div>
                  </div>
                  <div className="space-y-14">
                    <span className="font-semibold text-slate-600">Kurir / Driver Ekspedisi,</span>
                    <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                      ( .................................... )
                    </div>
                  </div>
                  <div className="space-y-14">
                    <span className="font-semibold text-slate-600">Penerima Gudang Tujuan,</span>
                    <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                      ( {transferData.receivedBy || '........................'} )
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dokumen 2: BERITA ACARA STOCK OPNAME FISIK */}
            {isOpname && opnameData && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Lokasi Gudang:
                    </span>
                    <strong className="text-xs text-slate-900">{opnameData.warehouseName}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Status Dokumen:
                    </span>
                    <strong className="text-xs font-mono uppercase text-amber-700">
                      {opnameData.status}
                    </strong>
                  </div>
                </div>

                {opnameData.notes && (
                  <div className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <strong>Keterangan Audit:</strong> {opnameData.notes}
                  </div>
                )}

                {/* Tabel Audit Selisih */}
                <table className="w-full text-left border-collapse border border-slate-200 my-3">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase border-b border-slate-200">
                      <th className="py-2 px-3 border-r border-slate-200 w-10 text-center">No</th>
                      <th className="py-2 px-3 border-r border-slate-200">Kode SKU & Nama Barang</th>
                      <th className="py-2 px-3 border-r border-slate-200 text-center w-24">Stok Sistem</th>
                      <th className="py-2 px-3 border-r border-slate-200 text-center w-24">Hitung Fisik</th>
                      <th className="py-2 px-3 text-right w-24">Selisih Fisik</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {opnameData.items.map((item, idx) => {
                      const isMatch = item.difference === 0;
                      return (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            <div className="font-bold text-slate-900">{item.productName}</div>
                            <div className="font-mono text-[10px] text-slate-500">{item.productSku}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-200 font-bold text-slate-600">
                            {item.systemQty}
                          </td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-200 font-bold text-slate-900">
                            {item.physicalQty}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold">
                            <span
                              className={
                                isMatch
                                  ? 'text-slate-500 font-normal'
                                  : item.difference > 0
                                  ? 'text-emerald-700'
                                  : 'text-rose-700'
                              }
                            >
                              {item.difference > 0 ? `+${item.difference}` : item.difference}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Kolom Tanda Tangan Basah Opname (2 Kolom) */}
                <div className="grid grid-cols-2 gap-8 pt-10 text-center text-xs">
                  <div className="space-y-14">
                    <span className="font-semibold text-slate-600">
                      Petugas Auditor Fisik (Staff),
                    </span>
                    <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                      ( {opnameData.createdBy || '........................'} )
                    </div>
                  </div>
                  <div className="space-y-14">
                    <span className="font-semibold text-slate-600">
                      Menyetujui (Warehouse Lead / Admin),
                    </span>
                    <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                      ( {opnameData.approvedBy || '........................'} )
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Catatan Kaki ISO Dokumen */}
            <div className="mt-8 pt-3 border-t border-slate-300 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Dicetak otomatis melalui NexStock WMS Enterprise</span>
              <span>Dokumen Sah Pengendalian Mutasi Pergudangan</span>
            </div>
          </div>
        </div>

        {/* Footer Modal Buttons - Hidden in Print */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-full text-sm font-semibold bg-[#0B101E] text-white hover:bg-slate-800 transition active:scale-95 shadow-sm flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Cetak Dokumen Resmi (A4)
          </button>
        </div>
      </div>
    </div>
  );
}
