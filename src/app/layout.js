import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "700"],
});

export const metadata = {
  title: "Dashboard SQUAT & MS | Command Center",
  description: "Sistem Manajemen Tiket & Kepatuhan SLA Modern",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body className={`${fontSans.className} antialiased selection:bg-blue-500/20 selection:text-blue-400`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}