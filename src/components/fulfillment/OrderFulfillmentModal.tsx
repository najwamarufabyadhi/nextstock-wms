'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { FulfillmentOrder, FulfillmentOrderItem } from '@/types';
import { soundEffects } from '@/lib/audio-effects';
import { SvgBarcode, SvgQrCode } from '@/lib/barcode-svg';
import { formatDate } from '@/lib/utils';
import {
  X,
  PackageCheck,
  Truck,
  Scan,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ArrowRight,
  ArrowLeft,
  Barcode,
  Navigation,
  Box,
  MapPin,
  Clock,
  Sparkles,
  Search,
  ExternalLink,
} from 'lucide-react';

interface OrderFulfillmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOrderId?: string;
}

export function OrderFulfillmentModal({ isOpen, onClose, defaultOrderId }: OrderFulfillmentModalProps) {
  const {
    fulfillmentOrders,
    updateFulfillmentItemPick,
    confirmOrderPicked,
    scanToPackItem,
    completeFulfillmentOrder,
    selectedWarehouseId,
    getWarehouseById,
  } = useInventory();

  // Selected Order
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'PICKING' | 'PACKING' | 'SHIPPING'>('PICKING');

  // Scan input in packing
  const [scanInput, setScanInput] = useState('');
  const [lastScanResult, setLastScanResult] = useState<{
    type: 'SUCCESS' | 'ERROR';
    message: string;
    item?: FulfillmentOrderItem;
  } | null>(null);

  // Shipping details
  const [carrierInput, setCarrierInput] = useState('');
  const [trackingInput, setTrackingInput] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Set initial selected order
  useEffect(() => {
    if (defaultOrderId) {
      setSelectedOrderId(defaultOrderId);
    } else if (fulfillmentOrders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(fulfillmentOrders[0].id);
    }
  }, [defaultOrderId, fulfillmentOrders, selectedOrderId]);

  // Sync carrier inputs when order changes
  const currentOrder = fulfillmentOrders.find((o) => o.id === selectedOrderId);

  useEffect(() => {
    if (currentOrder) {
      setCarrierInput(currentOrder.carrierName || 'Internal Fleet Trucking');
      setTrackingInput(currentOrder.trackingNumber || `EXP-${currentOrder.orderNumber.replace(/[^0-9]/g, '') || Date.now().toString().slice(-6)}`);
      
      // Auto-set tab based on status if opening fresh
      if (currentOrder.status === 'READY_TO_SHIP' || currentOrder.status === 'SHIPPED') {
        setActiveTab('SHIPPING');
      } else if (currentOrder.status === 'PACKING') {
        setActiveTab('PACKING');
      } else {
        setActiveTab('PICKING');
      }
    }
  }, [currentOrder?.id]);

  // Focus scan input whenever entering packing tab
  useEffect(() => {
    if (activeTab === 'PACKING' && isOpen) {
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
    }
  }, [activeTab, isOpen]);

  // Global Hardware Barcode Scanner (Keyboard Wedge) listener for PACKING tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'PACKING') return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleHardwareScan = (e: KeyboardEvent) => {
      // Do not intercept if user is typing in tracking or carrier input
      const activeEl = document.activeElement;
      if (activeEl && activeEl !== scanInputRef.current && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 120) {
        buffer = ''; // Reset buffer if character gap indicates human typing (>120ms)
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.trim()) {
          e.preventDefault();
          handleScanSubmit(buffer.trim());
          setScanInput('');
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleHardwareScan);
    return () => window.removeEventListener('keydown', handleHardwareScan);
  }, [isOpen, activeTab, currentOrder?.id]);

  if (!isOpen) return null;

  // Sorting items by bin location sequence (Aisle -> Rack -> Tier) for optimal walking path
  const sortedItems = currentOrder
    ? [...currentOrder.items].sort((a, b) => a.binLocation.localeCompare(b.binLocation))
    : [];

  const totalRequested = sortedItems.reduce((acc, it) => acc + it.requestedQty, 0);
  const totalPicked = sortedItems.reduce((acc, it) => acc + it.pickedQty, 0);
  const totalPacked = sortedItems.reduce((acc, it) => acc + it.packedQty, 0);

  const pickPercentage = totalRequested > 0 ? Math.round((totalPicked / totalRequested) * 100) : 0;
  const packPercentage = totalRequested > 0 ? Math.round((totalPacked / totalRequested) * 100) : 0;
  const isPickComplete = totalPicked >= totalRequested;
  const isPackComplete = totalPacked >= totalRequested;

  // Handle barcode submission
  const handleScanSubmit = (barcodeToScan?: string) => {
    const rawCode = barcodeToScan || scanInput;
    if (!rawCode || !currentOrder) return;

    const res = scanToPackItem(currentOrder.id, rawCode);
    if (res.success) {
      soundEffects.playSuccessScan();
      setLastScanResult({
        type: 'SUCCESS',
        message: res.message,
        item: res.itemMatched,
      });
      if (res.orderCompleted) {
        // Auto navigate to shipping after a slight delay
        setTimeout(() => {
          setActiveTab('SHIPPING');
        }, 1200);
      }
    } else {
      soundEffects.playErrorScan();
      setLastScanResult({
        type: 'ERROR',
        message: res.message,
      });
    }
    setScanInput('');
    scanInputRef.current?.focus();
  };

  const handleFinishFulfillment = () => {
    if (!currentOrder) return;
    setIsFinishing(true);
    const res = completeFulfillmentOrder(currentOrder.id, carrierInput, trackingInput);
    setIsFinishing(false);
    if (res.success) {
      soundEffects.playSuccessScan();
      onClose();
    }
  };

  const printShippingLabel = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Pusat Pemenuhan Pesanan (Order Fulfillment)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  Tahap 1 Operasional
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Alur picking berurutan lorong, verifikasi scan-to-pack anti-salah, dan cetak thermal label.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Selector & Sub-Navigation */}
        <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          {/* Order Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pilih Pesanan:</span>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="px-3 py-1.5 text-sm font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {fulfillmentOrders.map((ord) => (
                <option key={ord.id} value={ord.id}>
                  {ord.orderNumber} - {ord.destinationName.slice(0, 32)}... ({ord.status})
                </option>
              ))}
            </select>
          </div>

          {/* Stepper Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('PICKING')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'PICKING'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              1. Rute Lorong Picking ({pickPercentage}%)
            </button>
            <button
              onClick={() => setActiveTab('PACKING')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'PACKING'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              2. Scan-to-Pack ({packPercentage}%)
            </button>
            <button
              onClick={() => setActiveTab('SHIPPING')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'SHIPPING'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              3. Resi Pengiriman
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentOrder ? (
            <>
              {/* Order Info Strip */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Nomor Pesanan:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5 mt-0.5">
                    {currentOrder.orderNumber}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        currentOrder.priority === 'URGENT'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                          : currentOrder.priority === 'HIGH'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {currentOrder.priority}
                    </span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Tujuan / Pelanggan:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate mt-0.5">
                    {currentOrder.destinationName}
                  </span>
                  <span className="text-slate-400 truncate block text-[11px]">{currentOrder.destinationAddress}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Ekspedisi & Resi:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                    {currentOrder.carrierName}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 block font-mono text-[11px]">
                    {currentOrder.trackingNumber || 'Belum dibuat'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Status Operasional:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold mt-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
                    <Clock className="w-3.5 h-3.5" />
                    {currentOrder.status}
                  </span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* TAB 1: OPTIMIZED ROUTE PICKING                           */}
              {/* ======================================================== */}
              {activeTab === 'PICKING' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-indigo-600" />
                        Rute Lorong Pengambilan (Sequential Pick Route)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Barang diurutkan otomatis dari lorong depan ke belakang untuk menghemat langkah staf di gudang.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => confirmOrderPicked(currentOrder.id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors"
                      >
                        ✓ Ambil Semua Otomatis
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-300"
                      style={{ width: `${pickPercentage}%` }}
                    />
                  </div>

                  {/* Pick Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Urutan Lokasi Rak</th>
                          <th className="px-4 py-3">SKU & Nama Barang</th>
                          <th className="px-4 py-3 text-center">Permintaan</th>
                          <th className="px-4 py-3 text-center">Sudah Diambil</th>
                          <th className="px-4 py-3 text-right">Aksi Staf</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sortedItems.map((item, idx) => {
                          const isDone = item.pickedQty >= item.requestedQty;
                          return (
                            <tr
                              key={item.productId}
                              className={`transition-colors ${
                                isDone
                                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                                  : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px]">
                                    {idx + 1}
                                  </span>
                                  <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                                    {item.binLocation}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-slate-500 block text-[11px]">{item.sku}</span>
                                <span className="font-semibold text-slate-900 dark:text-white block">
                                  {item.productName}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                                {item.requestedQty} {item.unit}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                                    isDone
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  }`}
                                >
                                  {item.pickedQty} / {item.requestedQty}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    onClick={() => updateFulfillmentItemPick(currentOrder.id, item.productId, -1)}
                                    disabled={item.pickedQty <= 0}
                                    className="w-7 h-7 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 disabled:opacity-40"
                                  >
                                    -
                                  </button>
                                  <button
                                    onClick={() => updateFulfillmentItemPick(currentOrder.id, item.productId, 1)}
                                    disabled={isDone}
                                    className="w-7 h-7 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 disabled:opacity-40"
                                  >
                                    +
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateFulfillmentItemPick(
                                        currentOrder.id,
                                        item.productId,
                                        item.requestedQty - item.pickedQty
                                      )
                                    }
                                    disabled={isDone}
                                    className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/60 hover:bg-indigo-100 disabled:opacity-40"
                                  >
                                    Ambil Penuh
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pick Bottom Bar */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2
                        className={`w-4 h-4 ${isPickComplete ? 'text-emerald-500' : 'text-slate-400'}`}
                      />
                      <span>
                        Total Diambil: <strong>{totalPicked}</strong> dari <strong>{totalRequested}</strong> unit barang
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        confirmOrderPicked(currentOrder.id);
                        setActiveTab('PACKING');
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-transform active:scale-95"
                    >
                      Bawa ke Meja Pengepakan (Pack Table)
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 2: SCAN-TO-PACK VERIFICATION                         */}
              {/* ======================================================== */}
              {activeTab === 'PACKING' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Scan className="w-4 h-4 text-indigo-600" />
                      Meja Verifikasi Pengepakan (Scan-to-Pack Verification)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Pindai setiap barcode barang fisik sebelum dimasukkan ke dalam kardus pengiriman. Sistem otomatis membunyikan alarm jika barang salah!
                    </p>
                  </div>

                  {/* Big Scan Barcode Input */}
                  <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border-2 border-dashed border-indigo-300 dark:border-indigo-800 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Barcode className="w-5 h-5 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          ref={scanInputRef}
                          type="text"
                          value={scanInput}
                          onChange={(e) => setScanInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleScanSubmit();
                            }
                          }}
                          placeholder="Arahkan Barcode Scanner / Masukkan Kode Barcode lalu Enter..."
                          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-sm"
                        />
                      </div>
                      <button
                        onClick={() => handleScanSubmit()}
                        className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-transform active:scale-95"
                      >
                        <Scan className="w-4 h-4" />
                        Verifikasi
                      </button>
                    </div>

                    {/* Quick Simulation Barcode Buttons for User Convenience */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="text-slate-500 font-medium">Tes Klik Barcode Cepat:</span>
                      {sortedItems.map((it) => (
                        <button
                          key={it.productId}
                          onClick={() => handleScanSubmit(it.barcode)}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-indigo-500 font-mono text-[11px] text-slate-700 dark:text-slate-200 shadow-xs flex items-center gap-1"
                        >
                          <Barcode className="w-3 h-3 text-indigo-500" />
                          {it.sku} ({it.barcode})
                        </button>
                      ))}
                      <button
                        onClick={() => handleScanSubmit('9999999999')}
                        className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-mono text-[11px]"
                        title="Simulasi salah barcode untuk menguji alarm suara"
                      >
                        Simulasi Barcode Salah (Uji Alarm)
                      </button>
                    </div>

                    {/* Feedback Alert Banner */}
                    {lastScanResult && (
                      <div
                        className={`p-3 rounded-xl flex items-center gap-3 text-xs font-semibold animate-in fade-in duration-200 ${
                          lastScanResult.type === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {lastScanResult.type === 'SUCCESS' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                        )}
                        <span className="flex-1">{lastScanResult.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Packing Progress List */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Barang & Barcode</th>
                          <th className="px-4 py-3 text-center">Permintaan</th>
                          <th className="px-4 py-3 text-center">Terverifikasi Masuk Dus</th>
                          <th className="px-4 py-3 text-right">Status Pengepakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sortedItems.map((item) => {
                          const isFullyPacked = item.packedQty >= item.requestedQty;
                          return (
                            <tr
                              key={item.productId}
                              className={`transition-colors ${
                                isFullyPacked
                                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                                  : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <td className="px-4 py-3">
                                <span className="font-semibold text-slate-900 dark:text-white block">
                                  {item.productName}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5 text-slate-400 font-mono text-[11px]">
                                  <span>SKU: {item.sku}</span>
                                  <span>•</span>
                                  <span>Barcode: {item.barcode}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                                {item.requestedQty} {item.unit}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-block px-3 py-1 rounded-full font-bold text-xs ${
                                    isFullyPacked
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
                                  }`}
                                >
                                  {item.packedQty} / {item.requestedQty}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isFullyPacked ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                    <CheckCircle2 className="w-4 h-4" /> Lengkap
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Menunggu scan ({item.requestedQty - item.packedQty} lagi)</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Packing Bottom Bar */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setActiveTab('PICKING')}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" /> Kembali ke Picking
                    </button>

                    <button
                      onClick={() => setActiveTab('SHIPPING')}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition-transform active:scale-95 ${
                        isPackComplete
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 animate-pulse'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      {isPackComplete ? '✓ Pengepakan Lengkap, Lanjut Cetak Resi' : 'Lihat Resi Pengiriman'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 3: THERMAL SHIPPING LABEL (100x150mm)                */}
              {/* ======================================================== */}
              {activeTab === 'SHIPPING' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-indigo-600" />
                      Label Resi Pengiriman Termal (100x150mm Standard Dispatch)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Label standar logistik dengan barcode nomor resi untuk kurir/ekspedisi dan berita acara pelepasan stok.
                    </p>
                  </div>

                  {/* Carrier Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Penyedia Ekspedisi / Armada:
                      </label>
                      <input
                        type="text"
                        value={carrierInput}
                        onChange={(e) => setCarrierInput(e.target.value)}
                        placeholder="Contoh: JNE Trucking (JTR), SiCepat, Internal Fleet"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nomor Resi / AWB / No. Surat Jalan:
                      </label>
                      <input
                        type="text"
                        value={trackingInput}
                        onChange={(e) => setTrackingInput(e.target.value)}
                        placeholder="Contoh: JTR-90218931-ID"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Printable Thermal Label (100x150mm) Preview Card */}
                  <div className="flex justify-center">
                    <div
                      id="thermal-shipping-label"
                      className="w-[380px] bg-white text-black p-5 rounded-lg border-2 border-slate-900 shadow-xl space-y-3 font-sans print:border-none print:shadow-none print:m-0"
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between border-b-2 border-black pb-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider block">NexStock Logistics</span>
                          <span className="text-base font-black tracking-tight">{carrierInput || 'CARRIER DISPATCH'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold block">PRIORITAS</span>
                          <span className="text-xs font-black uppercase px-2 py-0.5 border border-black rounded">
                            {currentOrder.priority}
                          </span>
                        </div>
                      </div>

                      {/* Barcode & Tracking Number */}
                      <div className="text-center py-1">
                        <SvgBarcode value={trackingInput || currentOrder.orderNumber} width={300} height={55} />
                        <span className="font-mono font-black text-sm block tracking-widest mt-0.5">
                          {trackingInput || currentOrder.orderNumber}
                        </span>
                      </div>

                      {/* Destination / Consignee */}
                      <div className="border-t-2 border-b-2 border-black py-2 space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-600">
                          <span>PENERIMA / TUJUAN:</span>
                          <span>ORDER: {currentOrder.orderNumber}</span>
                        </div>
                        <h4 className="font-black text-sm text-black leading-tight">
                          {currentOrder.destinationName}
                        </h4>
                        <p className="text-[11px] leading-snug">{currentOrder.destinationAddress}</p>
                      </div>

                      {/* Manifest Items Summary */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold block">MANIFEST BARANG ({totalPacked} UNIT):</span>
                        <div className="space-y-0.5 text-[10px] max-h-24 overflow-hidden border border-black/30 p-1.5 rounded">
                          {sortedItems.map((it) => (
                            <div key={it.productId} className="flex justify-between">
                              <span className="truncate max-w-[240px] font-medium">{it.productName}</span>
                              <span className="font-mono font-bold">
                                {it.packedQty} {it.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shipper & QR Code Footer */}
                      <div className="border-t-2 border-black pt-2 flex items-center justify-between text-[9px]">
                        <div>
                          <span className="font-bold block">PENGIRIM:</span>
                          <span>NexStock Central Hub (WH-JKT)</span>
                          <span className="block text-slate-600">Dispatched: {formatDate(new Date().toISOString())}</span>
                        </div>
                        <SvgQrCode value={`TRACK:${trackingInput || currentOrder.orderNumber}`} size={48} />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setActiveTab('PACKING')}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" /> Kembali ke Verifikasi
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={printShippingLabel}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-sm"
                      >
                        <Printer className="w-4 h-4" /> Cetak Label (100x150mm)
                      </button>

                      <button
                        onClick={handleFinishFulfillment}
                        disabled={isFinishing || currentOrder.status === 'SHIPPED'}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-transform active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {currentOrder.status === 'SHIPPED'
                          ? 'Pesanan Sudah Terkirim'
                          : 'Selesaikan & Potong Stok Keluar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-slate-400">Tidak ada pesanan pemenuhan yang dipilih.</div>
          )}
        </div>
      </div>
    </div>
  );
}
