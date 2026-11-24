'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { formatNumber, formatDate } from '@/lib/utils';
import { soundEffects } from '@/lib/audio-effects';
import {
  ArrowDownToLine,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Truck,
  ShieldAlert,
  MapPin,
  Printer,
  Plus,
  FileCheck,
  Sparkles,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';

interface PurchaseOrderItem {
  productId: string;
  sku: string;
  productName: string;
  orderedQty: number;
  receivedQty: number;
  unit: string;
  suggestedBin: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorName: string;
  vendorAddress: string;
  expectedDate: string;
  status: 'PENDING' | 'PARTIAL' | 'RECEIVED';
  items: PurchaseOrderItem[];
}

const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-1',
    poNumber: 'PO-2026-091',
    vendorName: 'PT Cikarang Packaging Prima',
    vendorAddress: 'Kawasan Industri GIIC Cikarang, Blok AB-02, Bekasi',
    expectedDate: '2026-11-24',
    status: 'PENDING',
    items: [
      {
        productId: 'b0000000-0000-0000-0000-000000000001',
        sku: 'SKU-LOG-001',
        productName: 'Kardus Double Wall A4 Heavy Duty',
        orderedQty: 100,
        receivedQty: 0,
        unit: 'box',
        suggestedBin: 'RAK-A1-01',
      },
      {
        productId: 'b0000000-0000-0000-0000-000000000002',
        sku: 'SKU-LOG-002',
        productName: 'Bubble Wrap Heavy Duty 50m Roll',
        orderedQty: 30,
        receivedQty: 0,
        unit: 'roll',
        suggestedBin: 'RAK-A1-02',
      },
    ],
  },
  {
    id: 'po-2',
    poNumber: 'PO-2026-092',
    vendorName: 'PT Smart Auto ID Industrial',
    vendorAddress: 'Kawasan Industri Pulogadung, Blok D-08, Jakarta Timur',
    expectedDate: '2026-11-25',
    status: 'PARTIAL',
    items: [
      {
        productId: 'prod-3',
        sku: 'SKU-ELC-001',
        productName: 'Barcode Scanner Wireless 2D Industrial',
        orderedQty: 10,
        receivedQty: 5,
        unit: 'unit',
        suggestedBin: 'RAK-B2-01',
      },
      {
        productId: 'prod-8',
        sku: 'SKU-OFF-001',
        productName: 'Label Barcode Roll Thermal 100x150mm',
        orderedQty: 50,
        receivedQty: 50,
        unit: 'roll',
        suggestedBin: 'RAK-C1-02',
      },
    ],
  },
];

export default function InboundPage() {
  const {
    products,
    selectedWarehouseId,
    getWarehouseById,
    recordMovement,
  } = useInventory();

  const [orders, setOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Receiving state for the modal
  const [receivingInputs, setReceivingInputs] = useState<{
    [productId: string]: { goodQty: number; defectQty: number; binLocation: string };
  }>({});
  const [notes, setNotes] = useState('');
  const [suratJalanVendor, setSuratJalanVendor] = useState('');

  const activeWarehouse = getWarehouseById(selectedWarehouseId);

  const handleOpenReceive = (po: PurchaseOrder) => {
    setSelectedPo(po);
    const initialInputs: {
      [productId: string]: { goodQty: number; defectQty: number; binLocation: string };
    } = {};

    po.items.forEach((it) => {
      const remaining = it.orderedQty - it.receivedQty;
      initialInputs[it.productId] = {
        goodQty: remaining > 0 ? remaining : 0,
        defectQty: 0,
        binLocation: it.suggestedBin,
      };
    });

    setReceivingInputs(initialInputs);
    setSuratJalanVendor(`SJ-VEN-${Date.now().toString().slice(-5)}`);
    setIsReceivingModalOpen(true);
  };

  const handleConfirmReceive = () => {
    if (!selectedPo) return;

    let anyReceived = false;

    // Record Inbound for each item in store
    selectedPo.items.forEach((it) => {
      const input = receivingInputs[it.productId];
      if (input && input.goodQty > 0) {
        anyReceived = true;
        recordMovement({
          warehouseId: selectedWarehouseId,
          productId: it.productId,
          type: 'IN',
          quantity: input.goodQty,
          referenceNo: `${selectedPo.poNumber} (${suratJalanVendor})`,
          notes: `Penerimaan PO Vendor ${selectedPo.vendorName}. QC Lolos: ${input.goodQty} ${it.unit}. Defect: ${input.defectQty} ${it.unit}. Lokasi: ${input.binLocation}`,
        });
      }
    });

    if (anyReceived) {
      soundEffects.playSuccessScan();

      // Update local PO status
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== selectedPo.id) return o;
          const updatedItems = o.items.map((it) => {
            const inp = receivingInputs[it.productId];
            const added = inp ? inp.goodQty : 0;
            return {
              ...it,
              receivedQty: Math.min(it.orderedQty, it.receivedQty + added),
            };
          });

          const isFullyDone = updatedItems.every((it) => it.receivedQty >= it.orderedQty);
          return {
            ...o,
            items: updatedItems,
            status: isFullyDone ? 'RECEIVED' : 'PARTIAL',
          };
        })
      );

      setSuccessBanner(`Berhasil menerima barang dari ${selectedPo.vendorName}. Stok fisik gudang telah bertambah dan tercatat di buku besar!`);
      setIsReceivingModalOpen(false);
      setTimeout(() => setSuccessBanner(null), 6000);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto" suppressHydrationWarning>
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {/* 1. Page Header (Clean & Seamless) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Penerimaan Barang Pabrik & QC (Inbound)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencocokan Purchase Order (PO) pemasok, inspeksi QC barang rusak, dan rekomendasi rak putaway.
          </p>
        </div>
      </div>

      {/* 2. Unified 3-Pillars Info Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
            <ClipboardList className="w-3.5 h-3.5" /> 1. PO Matching
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Mencocokkan fisik truk dengan PO pabrik. Mendukung parsial receiving.
          </p>
        </div>

        <div className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-rose-700 font-semibold text-xs">
            <ShieldAlert className="w-3.5 h-3.5" /> 2. QC & Karantina Cacat
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Barang cacat dipisahkan ke quarantine bin agar tidak dapat diambil oleh sistem.
          </p>
        </div>

        <div className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-xs">
            <Sparkles className="w-3.5 h-3.5" /> 3. Smart Putaway
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Sistem merekomendasikan rak penempatan otomatis berdasarkan kapasitas kosong terdekat.
          </p>
        </div>
      </div>

      {/* PO List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Daftar Surat Pesanan Masuk (PO Supplier ke {activeWarehouse?.name})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.map((po) => {
            const totalOrdered = po.items.reduce((acc, it) => acc + it.orderedQty, 0);
            const totalReceived = po.items.reduce((acc, it) => acc + it.receivedQty, 0);
            const isCompleted = po.status === 'RECEIVED';

            return (
              <div
                key={po.id}
                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-2xs hover:border-emerald-300 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-extrabold text-slate-900">
                      {po.poNumber}
                    </span>
                    <h3 className="font-bold text-sm text-slate-800 leading-snug mt-0.5">
                      {po.vendorName}
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : po.status === 'PARTIAL'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {po.status === 'RECEIVED' ? 'SELESAI LENGKAP' : po.status === 'PARTIAL' ? 'SEBAGIAN DITERIMA' : 'MENUNGGU PENGIRIMAN'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {po.vendorAddress}
                </p>

                {/* Items Summary Table */}
                <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase">
                      <tr>
                        <th className="px-3 py-2">Item Barang</th>
                        <th className="px-3 py-2 text-center">Dipesan</th>
                        <th className="px-3 py-2 text-center">Diterima</th>
                        <th className="px-3 py-2 text-right">Rekomendasi Rak</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {po.items.map((it) => (
                        <tr key={it.productId}>
                          <td className="px-3 py-2 font-medium text-slate-800">
                            {it.productName}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-slate-700">
                            {it.orderedQty} {it.unit}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`font-bold ${
                                it.receivedQty >= it.orderedQty
                                  ? 'text-emerald-600'
                                  : 'text-amber-600'
                              }`}
                            >
                              {it.receivedQty} / {it.orderedQty}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-indigo-600">
                            {it.suggestedBin}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Action */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Est. Tiba: <strong>{po.expectedDate}</strong>
                  </span>
                  <button
                    onClick={() => handleOpenReceive(po)}
                    disabled={isCompleted}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    {isCompleted ? 'Sudah Diterima Lengkap' : 'Proses Penerimaan & QC'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inbound QC & Putaway Modal */}
      {isReceivingModalOpen && selectedPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
                  Inspeksi QC & Rekomendasi Rak Putaway
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  {selectedPo.poNumber} • {selectedPo.vendorName}
                </span>
              </div>
              <button
                onClick={() => setIsReceivingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1"
              >
                Tutup
              </button>
            </div>

            {/* Vendor Waybill No */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nomor Surat Jalan Vendor (Surat Pengantar Pabrik):
                </label>
                <input
                  type="text"
                  value={suratJalanVendor}
                  onChange={(e) => setSuratJalanVendor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Gudang Tujuan Bongkar:
                </label>
                <input
                  type="text"
                  disabled
                  value={activeWarehouse?.name || 'Gudang Pusat'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-bold"
                />
              </div>
            </div>

            {/* Checklist Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Barang & Sisa PO</th>
                    <th className="px-3 py-2.5 text-center">Kondisi Bagus (QC Pass)</th>
                    <th className="px-3 py-2.5 text-center">Cacat/Rusak (Karantina)</th>
                    <th className="px-3 py-2.5 text-right">Rekomendasi Rak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPo.items.map((it) => {
                    const inp = receivingInputs[it.productId] || {
                      goodQty: 0,
                      defectQty: 0,
                      binLocation: it.suggestedBin,
                    };
                    const remaining = it.orderedQty - it.receivedQty;

                    return (
                      <tr key={it.productId} className="hover:bg-slate-50/50">
                        <td className="px-3 py-3">
                          <span className="font-bold text-slate-900 block">{it.productName}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {it.sku} • Sisa PO: <strong>{remaining} {it.unit}</strong>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            value={inp.goodQty}
                            onChange={(e) =>
                              setReceivingInputs({
                                ...receivingInputs,
                                [it.productId]: {
                                  ...inp,
                                  goodQty: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-20 px-2.5 py-1 text-center font-bold border border-emerald-300 bg-emerald-50 text-emerald-900 rounded-lg"
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={inp.defectQty}
                            onChange={(e) =>
                              setReceivingInputs({
                                ...receivingInputs,
                                [it.productId]: {
                                  ...inp,
                                  defectQty: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-20 px-2.5 py-1 text-center font-bold border border-rose-300 bg-rose-50 text-rose-900 rounded-lg"
                          />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <input
                            type="text"
                            value={inp.binLocation}
                            onChange={(e) =>
                              setReceivingInputs({
                                ...receivingInputs,
                                [it.productId]: {
                                  ...inp,
                                  binLocation: e.target.value,
                                },
                              })
                            }
                            className="w-28 px-2 py-1 text-right font-mono font-bold border border-indigo-200 bg-indigo-50 text-indigo-900 rounded-lg text-xs"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Putaway Recommendation notice */}
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3 text-xs text-indigo-900">
              <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <span>
                <strong>Smart Putaway Aktif:</strong> Lokasi rak di atas telah dioptimalkan berdasarkan kapasitas kosong terdekat di Peta Spasial Digital Twin.
              </span>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsReceivingModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReceive}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                Konfirmasi Masuk Gudang & Catat Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
