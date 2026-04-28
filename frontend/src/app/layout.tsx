import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Medical Chronology AI | Professional Medical Insights",
  description: "AI-powered medical chronology and treatment timeline generation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-slate-50/50 min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
