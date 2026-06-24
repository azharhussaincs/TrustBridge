import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthBootstrap } from '@/components/auth/AuthBootstrap';
import { SocketProvider } from '@/context/SocketContext';
import { ToastProvider } from '@/components/providers/ToastProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OpBridge - Secure LAN Communication',
  description: 'Role-based secure LAN chat & file sharing with AES-GCM encryption',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <SocketProvider>
          <AuthBootstrap />
          <ToastProvider />
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
