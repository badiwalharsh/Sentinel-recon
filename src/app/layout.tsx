import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SentinelRecon OSINT Workbench – Threat Intelligence & Attack Surface Recon',
  description:
    'Defensive, authorized-use reconnaissance workbench for ethical hackers, threat analysts, and security engineers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070b14] text-slate-100 font-sans min-h-screen cyber-grid flex flex-col">
        {children}
      </body>
    </html>
  );
}
