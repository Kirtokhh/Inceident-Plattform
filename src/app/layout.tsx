import type { Metadata } from 'next';
import './globals.css';
import { AdminAuthProvider } from '@/lib/admin-auth-context';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'IncidentHub',
  description: 'Incident-Management für den ÖPNV',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen">
        <AdminAuthProvider>
          {/* Green Top Bar */}
          <div className="h-1 bg-init-green" />
          <NavBar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          {/* Footer */}
          <footer className="border-t border-gray-200 bg-white mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <p className="text-xs text-gray-400">© 2026 IncidentHub</p>
            </div>
          </footer>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
