import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReconFlow OSINT Workbench – Ethical Hacker Reconnaissance Platform',
  description:
    'Defensive, authorized-use reconnaissance workbench for ethical hackers, threat analysts, and security engineers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    'pk_test_Y2xlcmsuZXhhbXBsZS5jb20k';

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        ...dark,
        variables: {
          colorPrimary: '#10b981',
          colorBackground: '#0b1329',
          borderRadius: '0.5rem',
        },
        elements: {
          card: 'bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-md',
          headerTitle: 'font-mono text-slate-100 text-lg',
          headerSubtitle: 'font-mono text-slate-400 text-xs',
          formButtonPrimary: 'bg-emerald-600 hover:bg-emerald-500 font-mono text-xs font-semibold py-2.5 shadow-lg shadow-emerald-950/50',
          footerActionLink: 'text-emerald-400 hover:text-emerald-300 font-mono text-xs',
        },
      }}
    >
      <html lang="en" className="dark">
        <body className="bg-[#070b14] text-slate-100 font-sans min-h-screen cyber-grid flex flex-col">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
