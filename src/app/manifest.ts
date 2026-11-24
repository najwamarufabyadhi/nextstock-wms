import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NexStock WMS Enterprise',
    short_name: 'NexStock WMS',
    description: 'Sistem Manajemen Gudang Multi-Cabang & Kontrol Inventaris Enterprise',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#F8FAFC',
    theme_color: '#0F172A',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
