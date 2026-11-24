import type { Metadata, Viewport } from 'next';
import './globals.css';
import { InventoryProvider } from '@/lib/store/inventory-store';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'NexStock WMS — Multi-Warehouse Inventory Control',
  description: 'Sistem Manajemen Gudang Modern Berbasis Immutable Ledger dan Multi-Page Navigation',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NexStock WMS',
  },
};

export const viewport: Viewport = {
  themeColor: '#0F172A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents unintended zoom on industrial barcode handheld devices
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased selection:bg-slate-900 selection:text-white font-sans"
      >
        <InventoryProvider>
          <AppShell>
            {children}
          </AppShell>
        </InventoryProvider>
      </body>
    </html>
  );
}
