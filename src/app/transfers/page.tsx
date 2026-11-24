'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { formatDate } from '@/lib/utils';
import PrintDocumentModal from '@/components/modals/PrintDocumentModal';
import StockTransferModal from '@/components/modals/StockTransferModal';
import StockOpnameModal from '@/components/modals/StockOpnameModal';
import { StockTransfer, StockOpname } from '@/types';
import {
  ArrowRightLeft,
  ClipboardCheck,
  FileText,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Boxes,
  Truck,
  ShieldCheck,
} from 'lucide-react';

export default function TransfersPage() {
  const {
    transfers,
    opnames,
    selectedWarehouseId,
    getWarehouseById,
    completeTransfer,
    cancelTransfer,
    approveOpname,
    canApproveOpname,
  } = useInventory();

  const [activeTab, setActiveTab] = useState<'transfers' | 'opnames'>('transfers');

  // Modals
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isOpnameModalOpen, setIsOpnameModalOpen] = useState(false);

  // Formal A4 Document Modal
  const [isPrintDocModalOpen, setIsPrintDocModalOpen] = useState(false);
  const [docType, setDocType] = useState<'TRANSFER' | 'OPNAME'>('TRANSFER');
  const [selectedTransferDoc, setSelectedTransferDoc] = useState<StockTransfer | null>(null);
  const [selectedOpnameDoc, setSelectedOpnameDoc] = useState<StockOpname | null>(null);

  const activeWarehouse = getWarehouseById(selectedWarehouseId);

  // Transfers involving selected warehouse
  const warehouseTransfers = transfers.filter(
    (t) => t.fromWarehouseId === selectedWarehouseId || t.toWarehouseId === selectedWarehouseId
  );

  // Opnames for selected warehouse
  const warehouseOpnames = opnames.filter((o) => o.warehouseId === selectedWarehouseId);

  const handlePrintTransfer = (trf: StockTransfer) => {
    setSelectedTransferDoc(trf);
    setSelectedOpnameDoc(null);
    setDocType('TRANSFER');
    setIsPrintDocModalOpen(true);
  };

  const handlePrintOpname = (opn: StockOpname) => {
    setSelectedOpnameDoc(opn);
    setSelectedTransferDoc(null);
    setDocType('OPNAME');
    setIsPrintDocModalOpen(true);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto" suppressHydrationWarning>
      {/* 1. Page Header (Clean, Seamless, No Floating Bubble Box) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Transfer Antar-Gudang & Stock Opname
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Status transit dua arah, penerbitan Surat Jalan A4, rekonsiliasi selisih fisik, dan Berita Acara Opname.
          </p>
        </div>

        {/* Tab Switcher & Quick Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab('transfers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                activeTab === 'transfers'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Transfer ({warehouseTransfers.length})
            </button>
            <button
              onClick={() => setActiveTab('opnames')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                activeTab === 'opnames'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              Opname ({warehouseOpnames.length})
            </button>
          </div>

          {activeTab === 'transfers' ? (
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-2xs flex items-center gap-1.5 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Kirim Transfer
            </button>
          ) : (
            <button
              onClick={() => setIsOpnameModalOpen(true)}
              className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-2xs flex items-center gap-1.5 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Sesi Opname
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Transfers List vs Opnames List */}
      {activeTab === 'transfers' ? (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Daftar Dokumen Transfer ({warehouseTransfers.length})
          </h2>

          {warehouseTransfers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
              Belum ada riwayat transfer barang untuk gudang ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {warehouseTransfers.map((trf) => {
                const isIncoming = trf.toWarehouseId === selectedWarehouseId;
                const isCompleted = trf.status === 'COMPLETED';
                const isCancelled = trf.status === 'CANCELLED';

                return (
                  <div
                    key={trf.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-extrabold text-slate-900">
                        {trf.transferNo}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isCancelled
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}
                      >
                        {trf.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Pengirim: <strong>{trf.fromWarehouseName}</strong></span>
                        <span>&rarr;</span>
                        <span>Penerima: <strong>{trf.toWarehouseName}</strong></span>
                      </div>
                      <div className="text-[11px] text-slate-500 pt-1">
                        Dibuat: {formatDate(trf.createdAt)} • Oleh: {trf.createdBy || 'Staf Logistik'}
                      </div>
                    </div>

                    {/* Items table */}
                    <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase">
                          <tr>
                            <th className="px-3 py-2">Nama Barang</th>
                            <th className="px-3 py-2 text-right">Jumlah Ditransfer</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {trf.items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 font-medium text-slate-800">
                                {it.productName}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-slate-900">
                                {it.quantity} unit
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Actions & Print */}
                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <button
                        onClick={() => handlePrintTransfer(trf)}
                        className="text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 transition"
                      >
                        <FileText className="w-4 h-4 text-slate-500" /> Cetak Surat Jalan A4
                      </button>

                      <div className="flex items-center gap-2">
                        {trf.status === 'IN_TRANSIT' && (
                          <button
                            onClick={() => cancelTransfer(trf.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                          >
                            Batalkan
                          </button>
                        )}

                        {trf.status === 'IN_TRANSIT' && isIncoming && (
                          <button
                            onClick={() => completeTransfer(trf.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
                          >
                            Konfirmasi Terima
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Daftar Dokumen Stock Opname ({warehouseOpnames.length})
          </h2>

          {warehouseOpnames.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
              Belum ada riwayat stock opname untuk gudang ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {warehouseOpnames.map((opn) => {
                const diffCount = opn.items.filter((i) => i.difference !== 0).length;
                const isApproved = opn.status === 'APPROVED';

                return (
                  <div
                    key={opn.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-extrabold text-slate-900">
                        {opn.opnameNo}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800'
                            : opn.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {opn.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <div>Petugas Opname: <strong>{opn.createdBy}</strong></div>
                      <div className="text-[11px] text-slate-400">
                        Tanggal: {formatDate(opn.createdAt)}
                        {opn.approvedBy && ` • Disetujui: ${opn.approvedBy}`}
                      </div>
                    </div>

                    {/* Discrepancy Alert */}
                    <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      diffCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                      {diffCount > 0 ? (
                        <>
                          <Boxes className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>Ditemukan selisih fisik pada <strong>{diffCount} SKU</strong></span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>Seluruh fisik cocok 100% dengan stok sistem.</span>
                        </>
                      )}
                    </div>

                    {/* Items table */}
                    <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase">
                          <tr>
                            <th className="px-3 py-2">Barang</th>
                            <th className="px-3 py-2 text-center">Sistem</th>
                            <th className="px-3 py-2 text-center">Fisik</th>
                            <th className="px-3 py-2 text-right">Selisih</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {opn.items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 font-medium text-slate-800">
                                {it.productName}
                              </td>
                              <td className="px-3 py-2 text-center text-slate-600">
                                {it.systemQty}
                              </td>
                              <td className="px-3 py-2 text-center font-bold text-slate-900">
                                {it.physicalQty}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span
                                  className={`font-mono font-bold ${
                                    it.difference < 0
                                      ? 'text-rose-600'
                                      : it.difference > 0
                                      ? 'text-emerald-600'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {it.difference > 0 ? `+${it.difference}` : it.difference}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Actions & Print */}
                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <button
                        onClick={() => handlePrintOpname(opn)}
                        className="text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 transition"
                      >
                        <FileText className="w-4 h-4 text-slate-500" /> Berita Acara A4
                      </button>

                      {opn.status === 'PENDING_APPROVAL' && (
                        canApproveOpname ? (
                          <button
                            onClick={() => approveOpname(opn.id)}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95"
                          >
                            Setujui & Terapkan Koreksi
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Approval (Lead/Admin)
                          </span>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reusable Modals */}
      <StockTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />

      <StockOpnameModal
        isOpen={isOpnameModalOpen}
        onClose={() => setIsOpnameModalOpen(false)}
      />

      <PrintDocumentModal
        isOpen={isPrintDocModalOpen}
        onClose={() => {
          setIsPrintDocModalOpen(false);
          setSelectedTransferDoc(null);
          setSelectedOpnameDoc(null);
        }}
        documentType={docType}
        transferData={selectedTransferDoc}
        opnameData={selectedOpnameDoc}
      />
    </div>
  );
}
