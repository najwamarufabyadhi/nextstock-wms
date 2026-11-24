'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useInventory } from '@/lib/store/inventory-store';
import {
  Boxes,
  LayoutDashboard,
  Package,
  PackageCheck,
  ArrowDownToLine,
  ArrowRightLeft,
  FileSpreadsheet,
  ScanBarcode,
  Plus,
  Warehouse as WarehouseIcon,
  ChevronDown,
  UserCheck,
  Menu,
  X,
  Lock,
  LogOut,
  TrendingUp,
  WifiOff,
} from 'lucide-react';
import BarcodeScannerModal from '@/components/modals/BarcodeScannerModal';
import RecordMovementModal from '@/components/modals/RecordMovementModal';
import AddProductModal from '@/components/modals/AddProductModal';
import AddWarehouseModal from '@/components/modals/AddWarehouseModal';
import PrintBarcodeModal from '@/components/modals/PrintBarcodeModal';
import { Product } from '@/types';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    warehouses,
    selectedWarehouseId,
    setSelectedWarehouseId,
    getWarehouseById,
    currentUser,
    allUsers,
    switchUser,
    logout,
    canAddProducts,
    canManageWarehouses,
    transfers,
    opnames,
    fulfillmentOrders,
  } = useInventory();

  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Global modals
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isAddWarehouseModalOpen, setIsAddWarehouseModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printProduct, setPrintProduct] = useState<Product | null>(null);

  // User menu dropdown state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Warehouse menu dropdown state
  const [isWhMenuOpen, setIsWhMenuOpen] = useState(false);
  const whMenuRef = useRef<HTMLDivElement>(null);

  // Network offline detection for warehouse resilience
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (whMenuRef.current && !whMenuRef.current.contains(e.target as Node)) {
        setIsWhMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global hotkey 'B' for Barcode Scanner
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'b' || e.key === 'B') &&
        !isScannerModalOpen &&
        !isRecordModalOpen &&
        !isAddProductModalOpen
      ) {
        if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsScannerModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScannerModalOpen, isRecordModalOpen, isAddProductModalOpen]);

  // Active warehouse object
  const activeWarehouse = getWarehouseById(selectedWarehouseId) || warehouses[0];

  // Actionable Badges only (Clean & Minimalist)
  const pendingFulfillmentCount = fulfillmentOrders.filter(
    (o) => o.warehouseId === selectedWarehouseId && o.status !== 'SHIPPED'
  ).length;

  const activeTransfersCount = transfers.filter(
    (t) => t.status === 'IN_TRANSIT' && (t.fromWarehouseId === selectedWarehouseId || t.toWarehouseId === selectedWarehouseId)
  ).length;

  const pendingOpnameCount = opnames.filter(
    (o) => o.warehouseId === selectedWarehouseId && o.status === 'PENDING_APPROVAL'
  ).length;

  const totalTransferOpnameBadge = activeTransfersCount + pendingOpnameCount;

  // Bypass AppShell layout for login page
  if (pathname === '/login') {
    return <div className="min-h-screen bg-[#F8FAFC]">{children}</div>;
  }

  // Hydration guard: ensures server and client initial render match 100%
  if (!mounted) {
    return (
      <div
        className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex items-center justify-center font-sans"
        suppressHydrationWarning
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md animate-pulse">
            <Boxes className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider animate-pulse">
            Memuat NexStock WMS...
          </div>
        </div>
      </div>
    );
  }

  // Refined Nav Items: Single line, crisp naming, no bloated data badges
  const navItems = [
    {
      title: 'Dasbor',
      href: '/',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      title: 'Inventaris & Rak',
      href: '/inventory',
      icon: Package,
      badge: null,
    },
    {
      title: 'Pemenuhan Pesanan',
      href: '/fulfillment',
      icon: PackageCheck,
      badge: pendingFulfillmentCount > 0 ? pendingFulfillmentCount : null,
    },
    {
      title: 'Penerimaan Barang',
      href: '/inbound',
      icon: ArrowDownToLine,
      badge: null,
    },
    {
      title: 'Transfer & Opname',
      href: '/transfers',
      icon: ArrowRightLeft,
      badge: totalTransferOpnameBadge > 0 ? totalTransferOpnameBadge : null,
    },
    {
      title: 'Buku Besar Audit',
      href: '/ledger',
      icon: FileSpreadsheet,
      badge: null,
    },
    {
      title: 'Analitik Bisnis',
      href: '/analytics',
      icon: TrendingUp,
      badge: null,
    },
  ];

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col lg:flex-row antialiased font-sans"
      suppressHydrationWarning
    >
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR NAVIGATION (SLEEK, MONOCHROMATIC & PROPORTIONATE)          */}
      {/* ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-slate-950 text-slate-300 flex flex-col justify-between transition-transform duration-200 ease-in-out border-r border-slate-900 lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-14 px-4 flex items-center justify-between border-b border-slate-900">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Boxes className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-white leading-none">
                  NexStock <span className="font-normal text-slate-400 text-xs">WMS</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide mt-0.5">
                  Internal Enterprise
                </span>
              </div>
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-slate-900 lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-0.5 mt-2">
            <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Menu Utama
            </div>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white font-medium shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <span className="truncate">{item.title}</span>
                  </div>
                  {item.badge !== null && (
                    <span className="ml-auto flex-shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold text-[10px] flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-3 border-t border-slate-900 space-y-2">
          <div className="px-2 py-1.5 rounded-lg bg-slate-900/60 border border-slate-900 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-500 block leading-none">Gudang Aktif</span>
              <span className="text-xs font-medium text-slate-200 block truncate mt-0.5">
                {activeWarehouse?.name || 'Gudang Pusat'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN APP CONTENT (WITH REFINED TOPBAR)                                 */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:pl-60 min-w-0 min-h-screen">
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-3 sm:px-5 lg:px-6 h-14 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Warehouse Switcher Dropdown */}
            <div className="relative min-w-0" ref={whMenuRef}>
              <button
                type="button"
                onClick={() => setIsWhMenuOpen(!isWhMenuOpen)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition text-xs font-semibold text-slate-800 min-w-0"
              >
                <WarehouseIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-[180px] md:max-w-[220px]">
                  {activeWarehouse?.name}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {isWhMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 block">
                    Pilih Gudang
                  </span>
                  <div className="space-y-0.5">
                    {warehouses.map((wh) => (
                      <button
                        key={wh.id}
                        onClick={() => {
                          setSelectedWarehouseId(wh.id);
                          setIsWhMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                          selectedWarehouseId === wh.id
                            ? 'bg-slate-100 text-slate-900 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <div>{wh.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{wh.code}</div>
                        </div>
                        {selectedWarehouseId === wh.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                        )}
                      </button>
                    ))}
                  </div>

                  {canManageWarehouses && (
                    <div className="pt-1.5 mt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setIsWhMenuOpen(false);
                          setIsAddWarehouseModalOpen(true);
                        }}
                        className="w-full text-left px-2.5 py-1 rounded-md text-xs font-medium text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Cabang Gudang
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Topbar Quick Controls & User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Barcode Scanner Button */}
            <button
              onClick={() => setIsScannerModalOpen(true)}
              className="h-8 px-2 sm:px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-2xs transition active:scale-95"
              title="Shortcut: Tekan tombol 'B' di keyboard"
            >
              <ScanBarcode className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="hidden sm:inline">Scan</span>
              <kbd className="hidden md:inline px-1 py-0.2 rounded bg-slate-100 text-[10px] font-mono text-slate-500 border border-slate-200">
                B
              </kbd>
            </button>

            {/* Quick Record Movement Button */}
            <button
              onClick={() => setIsRecordModalOpen(true)}
              className="h-8 px-2.5 sm:px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Catat Mutasi</span>
              <span className="inline sm:hidden font-medium text-[11px]">Mutasi</span>
            </button>

            {/* Authenticated User Profile Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="h-8 pl-1.5 sm:pl-2 pr-2 sm:pr-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-800 flex items-center gap-1.5 sm:gap-2 transition"
              >
                <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  {currentUser.avatarInitials}
                </div>
                <span className="hidden xl:inline font-semibold">{currentUser.fullName}</span>
                <span className="hidden sm:inline xl:hidden font-semibold text-xs text-slate-700">
                  {currentUser.role === 'SUPER_ADMIN' ? 'Admin' : currentUser.role === 'WAREHOUSE_LEAD' ? 'Lead' : 'Staff'}
                </span>
                <span className="hidden xl:inline text-[11px] text-slate-400">
                  ({currentUser.role === 'SUPER_ADMIN' ? 'Admin' : currentUser.role === 'WAREHOUSE_LEAD' ? 'Lead' : 'Staff'})
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* User Profile Header Card */}
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                    <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {currentUser.avatarInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {currentUser.fullName}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate font-mono">
                        {currentUser.email || 'user@nexstock.id'}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {currentUser.role === 'SUPER_ADMIN'
                            ? 'Super Admin'
                            : currentUser.role === 'WAREHOUSE_LEAD'
                            ? 'Lead Gudang'
                            : 'Staff Operasional'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Account Assignment Info */}
                  <div className="py-2.5 text-[11px] text-slate-500 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Gudang Ditugaskan:</span>
                      <span className="font-semibold text-slate-700 truncate max-w-[130px]">
                        {activeWarehouse?.name || 'Semua Cabang'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Status Autentikasi:</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <button
                      type="button"
                      onClick={async () => {
                        setIsUserMenuOpen(false);
                        await logout();
                        router.push('/login');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ganti Akun</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setIsUserMenuOpen(false);
                        await logout();
                        router.push('/login');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Keluar Sesi (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Offline Network Warning Banner */}
        {!isOnline && (
          <div className="bg-amber-600 text-white text-[11px] font-medium py-1.5 px-3 text-center flex items-center justify-center gap-2 shadow-2xs">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>
              Mode Offline: Sinyal gudang terputus. Mutasi dan scan barcode tetap tercatat di perangkat dan akan otomatis disinkronkan saat online kembali.
            </span>
          </div>
        )}

        {/* Main Routed Page Content */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6">
          {children}
        </main>
      </div>

      {/* Global Modals */}
      <BarcodeScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onOpenRecordMovement={() => setIsRecordModalOpen(true)}
        onOpenPrintModal={(prod) => {
          setPrintProduct(prod);
          setIsPrintModalOpen(true);
        }}
      />

      <RecordMovementModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
      />

      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
      />

      <AddWarehouseModal
        isOpen={isAddWarehouseModalOpen}
        onClose={() => setIsAddWarehouseModalOpen(false)}
      />

      <PrintBarcodeModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setPrintProduct(null);
        }}
        product={printProduct}
      />
    </div>
  );
}
