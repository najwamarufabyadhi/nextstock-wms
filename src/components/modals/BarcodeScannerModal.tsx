'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { soundEffects } from '@/lib/audio-effects';
import { SvgBarcode, SvgQrCode } from '@/lib/barcode-svg';
import {
  X,
  ScanBarcode,
  Search,
  Camera,
  CheckCircle2,
  AlertCircle,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Sparkles,
} from 'lucide-react';
import { Product } from '@/types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRecordMovement?: (productId: string) => void;
  onOpenPrintModal?: (product: Product) => void;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onOpenRecordMovement,
  onOpenPrintModal,
}: BarcodeScannerModalProps) {
  const { products, selectedWarehouseId, getStockLevel, getBatchesForProduct, getWarehouseById } =
    useInventory();

  const [inputCode, setInputCode] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [isScanningActive, setIsScanningActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const activeWarehouse = getWarehouseById(selectedWarehouseId);

  // Focus input automatically when opened
  useEffect(() => {
    if (isOpen) {
      setScannedProduct(null);
      setInputCode('');
      setErrorMessage('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Global keydown listener for handheld barcode scanner (Keyboard Wedge)
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in regular textarea or another input
      if (document.activeElement !== inputRef.current && (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = ''; // reset buffer if gap is too long (manual human typing)
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.trim()) {
          processScan(buffer.trim());
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, products]);

  if (!isOpen) return null;

  const processScan = (rawQuery: string) => {
    const q = rawQuery.trim().toUpperCase();
    if (!q) return;

    const found = products.find(
      (p) =>
        p.sku.toUpperCase() === q ||
        p.name.toUpperCase().includes(q) ||
        p.id.toUpperCase() === q ||
        ((p as any).barcode && (p as any).barcode.toUpperCase() === q) ||
        p.packagingUnits?.some((u) => u.barcode && u.barcode.toUpperCase() === q)
    );

    if (found) {
      soundEffects.playSuccessScan();
      setScannedProduct(found);
      setErrorMessage('');
    } else {
      soundEffects.playErrorScan();
      setScannedProduct(null);
      setErrorMessage(`Barcode/SKU "${q}" tidak terdaftar di sistem master data.`);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processScan(inputCode);
  };

  const currentStock = scannedProduct
    ? getStockLevel(selectedWarehouseId, scannedProduct.id)
    : 0;
  const productBatches = scannedProduct
    ? getBatchesForProduct(scannedProduct.id, selectedWarehouseId)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-[#0B101E] text-white shadow-sm">
              <ScanBarcode className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Pemindai Barcode Industri</h2>
              <p className="text-xs text-slate-500">
                Mendukung Hardware Scanner Laser (Wedge), Kamera, & Pencarian SKU
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

        {/* Viewfinder Reticle / Scanner Area */}
        <div className="my-5 relative rounded-2xl bg-slate-950 p-6 overflow-hidden text-center text-white border border-slate-800">
          {/* Laser Scan Line Animation */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse"></div>

          {/* Corner Markers */}
          <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-white/60"></div>
          <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-white/60"></div>
          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-white/60"></div>
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-white/60"></div>

          <div className="relative z-10 space-y-2 py-4">
            <Camera className="w-7 h-7 mx-auto text-slate-400 animate-bounce" />
            <div className="text-xs font-semibold text-slate-200">
              Sensor Siap Menerima Scan Barcode
            </div>
            <div className="text-[11px] text-slate-400">
              Arahkan scanner laser atau ketik nomor SKU di bawah ini
            </div>
          </div>
        </div>

        {/* Manual Barcode Input */}
        <form onSubmit={handleManualSubmit} className="mb-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Scan atau ketik SKU (Contoh: SKU-LOG-001, SKU-MAT-001)..."
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="w-full bg-[#F4F5F7] border border-slate-200 rounded-2xl pl-10 pr-24 py-3 text-sm font-semibold uppercase text-slate-900 focus:ring-2 focus:ring-slate-900 placeholder:normal-case"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl bg-[#0B101E] text-white text-xs font-semibold hover:bg-slate-800 transition"
            >
              Cari SKU
            </button>
          </div>
        </form>

        {/* Quick Demo Pick Barcode Pills */}
        <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-slate-500">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Tes Cepat:</span>
          {products.slice(0, 4).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setInputCode(p.sku);
                processScan(p.sku);
              }}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] font-bold shrink-0 transition"
            >
              {p.sku}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 my-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200/60 rounded-2xl animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scanned Product Result Card */}
        {scannedProduct && (
          <div className="p-4 rounded-2xl bg-[#F4F5F7] border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white">
                  {scannedProduct.category}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{scannedProduct.name}</h3>
                <div className="text-xs font-mono font-bold text-slate-500 mt-0.5">
                  SKU: {scannedProduct.sku}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold text-slate-400 uppercase">Stok Gudang Ini</div>
                <div className="text-2xl font-extrabold text-slate-900 leading-tight">
                  {currentStock}{' '}
                  <span className="text-xs font-medium text-slate-500">{scannedProduct.unit}</span>
                </div>
              </div>
            </div>

            {/* Barcode Preview */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
              <div className="w-48">
                <SvgBarcode value={scannedProduct.sku} height={44} showText={false} />
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold text-slate-400">Minimal Alert</div>
                <div className="text-xs font-bold text-slate-700">
                  &le; {scannedProduct.minStockAlert} {scannedProduct.unit}
                </div>
              </div>
            </div>

            {/* Batch Info if available */}
            {productBatches.length > 0 && (
              <div className="bg-white/80 p-3 rounded-xl border border-slate-200/50 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Batch & Expiry Aktif di {activeWarehouse?.name}:
                </div>
                <div className="space-y-1 text-xs">
                  {productBatches.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between py-0.5 border-b border-slate-100 last:border-0"
                    >
                      <span className="font-mono font-semibold text-slate-800">{b.batchNo}</span>
                      <span className="text-slate-500">Exp: {b.expiryDate}</span>
                      <span className="font-bold text-slate-900">{b.quantityOnHand} unit</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRecordMovement?.(scannedProduct.id);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-[#0B101E] text-white text-xs font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                Catat Mutasi SKU Ini
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrintModal?.(scannedProduct);
                }}
                className="py-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-50 transition flex items-center gap-1.5"
                title="Cetak Label Termal"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Label
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
