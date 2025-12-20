import { Inter } from "next/font/google"; // Ganti Import
import "./globals.css";

// Setup Font Inter
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Dashboard Monitoring Tiket",
  description: "Sistem Manajemen Tiket Modern",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-slate-50 text-slate-800`}>
        {children}
      </body>
    </html>
  );
}