'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Registrasi Komponen ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DashboardChart({ dataRaw }) {
    if (!dataRaw || dataRaw.length === 0) {
        return <div className="text-center text-slate-400 py-10">Belum ada data grafik</div>;
    }

    // 1. Olah Data API menjadi Format ChartJS
    // Ambil list bulan unik
    const months = [...new Set(dataRaw.map(item => item.month))];
    // Ambil list kategori unik
    const categories = [...new Set(dataRaw.map(item => item.category))];

    // Generate Warna Random yang Konsisten
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    const datasets = categories.map((cat, index) => ({
        label: cat,
        data: months.map(m => {
            const found = dataRaw.find(d => d.month === m && d.category === cat);
            return found ? found.count : 0;
        }),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20', // Transparan
        tension: 0.4, // Garis melengkung halus
        fill: true,
    }));

    const chartData = {
        labels: months,
        datasets: datasets
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            title: { display: false }
        },
        scales: {
            y: { beginAtZero: true, grid: { borderDash: [2, 4] } },
            x: { grid: { display: false } }
        }
    };

    return (
        <div className="h-[300px] w-full">
            <Line data={chartData} options={options} />
        </div>
    );
}