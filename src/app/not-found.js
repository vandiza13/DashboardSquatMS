import Link from 'next/link';
import { FaExclamationTriangle, FaHome } from 'react-icons/fa';

export const metadata = {
  title: 'Halaman Tidak Ditemukan | SQUAT & MS',
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="text-center max-w-lg">
        {/* Animated Icon */}
        <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-yellow-200 rounded-full animate-ping opacity-20"></div>
            <div className="relative bg-white p-6 rounded-full shadow-xl">
                <FaExclamationTriangle className="text-6xl text-yellow-500" />
            </div>
        </div>

        <h1 className="text-4xl font-extrabold text-slate-800 mb-2">404</h1>
        <h2 className="text-xl font-bold text-slate-600 mb-4">Halaman Tidak Ditemukan</h2>
        
        <p className="text-slate-500 mb-8">
          Maaf, halaman yang Anda cari mungkin telah dihapus, dipindahkan, atau link yang Anda tuju salah.
        </p>

        <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/30"
        >
            <FaHome /> Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}