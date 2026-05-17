import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TransitIncidentHub',
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
        <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <a href="/" className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  TIH
                </div>
                <span className="text-xl font-bold text-white">TransitIncidentHub</span>
              </a>
              <div className="flex items-center gap-6">
                <a href="/" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                  Dashboard
                </a>
                <a href="/status" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                  Kunden-Status
                </a>
                <a href="/incidents/new" className="btn-primary text-sm">
                  + Neues Incident
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
