'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { Sparkles, AlertTriangle, Clock, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Product } from '@/types';

interface BatchExpiryRadarProps {
  onOpenRecordOutbound?: (productId: string, batchNo: string) => void;
}

export default function BatchExpiryRadar({ onOpenRecordOutbound }: BatchExpiryRadarProps) {
  const {
    selectedWarehouseId,
    getExpiringBatches,
    getFefoRecommendation,
    products,
    getWarehouseById,
  } = useInventory();

  const [testProductId, setTestProductId] = useState<string>(products[4]?.id || products[0]?.id || '');
  const [testQty, setTestQty] = useState<number>(10);

  const activeWarehouse = getWarehouseById(selectedWarehouseId);
  const expiringBatches = getExpiringBatches(selectedWarehouseId, 90);

  // FEFO simulation for selected product
  const fefoResult = getFefoRecommendation(testProductId, selectedWarehouseId, testQty);
  const selectedProduct = products.find((p) => p.id === testProductId);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Radar Batch & Asistensi FEFO Cerdas
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                First Expired, First Out: Prioritas pengeluaran barang mendekati masa kedaluwarsa
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            {expiringBatches.length} Batch Perhatian
          </span>
        </div>

        {/* Two-Column: Radar List & Interactive FEFO Assistant */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Column 1: Expiring Batches Watchlist */}
          <div className="space-y-2.5 min-w-0">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Daftar Batch Kritis (&le; 90 Hari)</span>
              <span className="text-[10px] text-slate-400 font-normal">Diurutkan terdekat</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {expiringBatches.length === 0 ? (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200/60 text-xs text-emerald-800 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  Semua batch stok dalam kondisi aman (&gt; 90 hari masa simpan).
                </div>
              ) : (
                expiringBatches.map((batch) => {
                  const isCritical = batch.riskLevel === 'DANGER';
                  return (
                    <div
                      key={batch.id}
                      className={`p-3 rounded-lg border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        isCritical
                          ? 'bg-rose-50/50 border-rose-200 text-rose-950'
                          : 'bg-amber-50/50 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-bold text-xs">{batch.batchNo}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
                              isCritical
                                ? 'bg-rose-200 text-rose-800'
                                : 'bg-amber-200 text-amber-800'
                            }`}
                          >
                            {batch.daysLeft <= 0 ? 'Expired' : `${batch.daysLeft} Hari Lagi`}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-800 mt-1 truncate" title={batch.productName}>
                          {batch.productName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Exp: {batch.expiryDate} • Sisa: <strong className="text-slate-700">{batch.quantityOnHand} unit</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => onOpenRecordOutbound?.(batch.productId, batch.batchNo)}
                        className={`shrink-0 self-start sm:self-center px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-2xs ${
                          isCritical
                            ? 'bg-rose-600 text-white hover:bg-rose-700'
                            : 'bg-amber-600 text-white hover:bg-amber-700'
                        }`}
                      >
                        Keluarkan
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: FEFO Recommendation Engine Simulation */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Kalkulator Alokasi FEFO Otomatis
              </span>
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                Smart Algorithm
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                  Pilih Produk
                </label>
                <select
                  value={testProductId}
                  onChange={(e) => setTestProductId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                  Kebutuhan Keluar (Unit)
                </label>
                <input
                  type="number"
                  min="1"
                  value={testQty}
                  onChange={(e) => setTestQty(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Recommendation Result Box */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
              <div className="text-[11px] font-semibold text-slate-700">
                Rekomendasi Pengambilan Batch untuk {selectedProduct?.name}:
              </div>

              {fefoResult.allocations.length === 0 ? (
                <div className="text-xs text-slate-400 py-2">
                  Tidak ada batch terdaftar untuk produk ini di {activeWarehouse?.name}.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {fefoResult.allocations.map((alloc, i) => (
                    <div
                      key={alloc.batch.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-slate-50 p-2 rounded-md border border-slate-100 gap-1 sm:gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0 truncate">
                          <span className="font-mono font-bold text-slate-900">
                            {alloc.batch.batchNo}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-2">
                            Exp: {alloc.batch.expiryDate} ({alloc.daysLeft} hari)
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 font-semibold text-slate-900 text-xs">
                        Ambil {alloc.takeQty} {selectedProduct?.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {fefoResult.allocations.length > 0 && !fefoResult.canFulfill && (
                <div className="text-[11px] text-rose-600 font-medium pt-1">
                  * Perhatian: Total stok dari seluruh batch ({fefoResult.totalAvailable}) belum mencukupi permintaan {testQty}.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <span>Prinsip FEFO otomatis menjamin minimnya barang usang (*dead stock*).</span>
        <span className="font-medium text-slate-600">Standar Industri Logistik & Ritel Modern</span>
      </div>
    </div>
  );
}
