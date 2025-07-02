import '../styles/globals.css';
import Link from 'next/link';
import { ReactNode } from 'react';
import MuiThemeProvider from '../components/MuiThemeProvider';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MuiThemeProvider>
          <nav style={{ padding: 16, borderBottom: '1px solid #eee', marginBottom: 24 }}>
            <Link href="/" style={{ marginRight: 16 }}>
              Dashboard
            </Link>
            <Link href="/candidates" style={{ marginRight: 16 }}>
              Candidates
            </Link>
            <Link href="/volunteers" style={{ marginRight: 16 }}>
              Volunteers
            </Link>
            <Link href="/events" style={{ marginRight: 16 }}>
              Events
            </Link>
            <Link href="/attendances">Attendances</Link>
          </nav>
          <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>{children}</main>
        </MuiThemeProvider>
      </body>
    </html>
  );
}
