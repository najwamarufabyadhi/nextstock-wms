'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { OrderFulfillmentModal } from '@/components/fulfillment/OrderFulfillmentModal';
import { formatDate } from '@/lib/utils';
import {
  PackageCheck,
  Truck,
  Scan,
  Navigation,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Boxes,
  MapPin,
  Calendar,
} from 'lucide-react';

export default function FulfillmentPage() {
  const { fulfillmentOrders, selectedWarehouseId, getWarehouseById } = useInventory();

  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const activeWarehouse = getWarehouseById(selectedWarehouseId);

  // Orders for current warehouse
  const warehouseOrders = fulfillmentOrders.filter((o) => o.warehouseId === selectedWarehouseId);

  const filteredOrders = warehouseOrders.filter((ord) => {
    if (filterStatus === 'ACTIVE') return ord.status !== 'SHIPPED';
    if (filterStatus === 'SHIPPED') return ord.status === 'SHIPPED';
    return true;
  });

  const pendingCount = warehouseOrders.filter((o) => o.status !== 'SHIPPED').length;
  const shippedCount = warehouseOrders.filter((o) => o.status === 'SHIPPED').length;

  const handleOpenFulfillment = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto" suppressHydrationWarning>
      {/* 1. Page Header (Clean, Seamless, No Floating Bubble Box) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Pemenuhan Pesanan & Pengiriman
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengambilan rute lorong terdekat, verifikasi scan-to-pack, dan cetak thermal shipping label.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-md transition ${
              filterStatus === 'ALL'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({warehouseOrders.length})
          </button>
          <button
            onClick={() => setFilterStatus('ACTIVE')}
            className={`px-3 py-1.5 rounded-md transition ${
              filterStatus === 'ACTIVE'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Perlu Diproses ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('SHIPPED')}
            className={`px-3 py-1.5 rounded-md transition ${
              filterStatus === 'SHIPPED'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Terkirim ({shippedCount})
          </button>
        </div>
      </div>

      {/* 2. Unified Stepper Info Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-indigo-600 font-semibold text-xs">
            <Navigation className="w-3.5 h-3.5" /> 1. Sequential Pick Route
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Mengurutkan lorong A &rarr; B &rarr; C untuk memangkas langkah staf saat ambil barang di lorong rak.
          </p>
        </div>

        <div className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-indigo-600 font-semibold text-xs">
            <Scan className="w-3.5 h-3.5" /> 2. Scan-to-Pack Verification
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Verifikasi fisik barcode tiap barang sebelum masuk kardus dengan chime/alarm audio synthesizer.
          </p>
        </div>

        <div className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-indigo-600 font-semibold text-xs">
            <Truck className="w-3.5 h-3.5" /> 3. Thermal Shipping Label
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Cetak label resi koli 100x150mm. Stok fisik otomatis dipotong di buku besar saat dispatch.
          </p>
        </div>
      </div>

      {/* Orders List Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center justify-between">
          <span>Antrean Pesanan Keluar ({activeWarehouse?.name})</span>
          <span className="text-xs text-slate-500 font-normal">Klik untuk membuka meja pemenuhan</span>
        </h2>

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Semua pesanan keluar telah selesai diproses!</p>
            <p className="text-xs text-slate-400">Tidak ada pesanan tertunda di gudang ini saat ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredOrders.map((ord) => {
              const totalItems = ord.items.reduce((acc, it) => acc + it.requestedQty, 0);
              const totalPacked = ord.items.reduce((acc, it) => acc + it.packedQty, 0);
              const isComplete = ord.status === 'SHIPPED';
              const progressPct = totalItems > 0 ? Math.round((totalPacked / totalItems) * 100) : 0;

              return (
                <div
                  key={ord.id}
                  className={`bg-white rounded-xl border p-4 sm:p-5 space-y-4 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between ${
                    isComplete
                      ? 'border-emerald-200 bg-emerald-50/10'
                      : ord.priority === 'URGENT'
                      ? 'border-rose-300'
                      : 'border-slate-200/80 hover:border-indigo-300'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Order Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-extrabold text-slate-900">
                          {ord.orderNumber}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            ord.priority === 'URGENT'
                              ? 'bg-rose-100 text-rose-700'
                              : ord.priority === 'HIGH'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {ord.priority}
                        </span>
                      </div>

                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isComplete
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'READY_TO_SHIP'
                            ? 'bg-blue-100 text-blue-800 animate-pulse'
                            : ord.status === 'PACKING'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>

                    {/* Destination info */}
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">Tujuan Pengiriman:</span>
                      <h3 className="font-bold text-slate-900 text-xs mt-0.5 leading-snug line-clamp-1">
                        {ord.destinationName}
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-1 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        {ord.destinationAddress}
                      </p>
                    </div>

                    {/* Carrier & Time */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Truck className="w-3 h-3 text-indigo-500" />
                        {ord.carrierName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDate(ord.createdAt)}
                      </span>
                    </div>

                    {/* Items Checklist Summary */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>Pengepakan ({totalPacked}/{totalItems} unit):</span>
                        <span className="font-bold">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isComplete
                              ? 'bg-emerald-500'
                              : progressPct === 100
                              ? 'bg-blue-500'
                              : 'bg-indigo-600'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleOpenFulfillment(ord.id)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 ${
                      isComplete
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                    }`}
                  >
                    <PackageCheck className="w-4 h-4" />
                    {isComplete ? 'Cetak Ulang Resi / Lihat Detail' : 'Buka Meja Picking & Scan-to-Pack'}
                    <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reusable Modal Dialog */}
      <OrderFulfillmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrderId(undefined);
        }}
        defaultOrderId={selectedOrderId}
      />
    </div>
  );
}
