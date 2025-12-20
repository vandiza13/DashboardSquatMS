import { redirect } from 'next/navigation';

export default function Home() {
    // Fungsi ini hanya dijalankan jika middleware lolos (jarang terjadi untuk root),
    // tapi sebagai fallback kita arahkan ke dashboard.
    redirect('/dashboard');
}