import type { Metadata } from 'next';
import { SocketProvider } from '@/context/SocketContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrustBridge - Secure LAN Communication',
  description: 'Secure LAN-based communication with AES-GCM encryption',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
