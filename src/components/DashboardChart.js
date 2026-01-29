'use client';

import { Line, Bar } from 'react-chartjs-2'; // Tambah Bar
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement, // Tambah BarElement
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
  BarElement, // Registrasi BarElement
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DashboardChart({ dataRaw, agingData }) { // Terima props agingData

    // --- MODE 1: TAMPILKAN GRAFIK AGING (BAR CHART) ---
    if (agingData) {
        const chartData = {
            labels: [
                '< 4 Jam (Aman)', 
                '4 - 12 Jam (Pantau)', 
                '12 - 24 Jam (Warning)', 
                '> 24 Jam (Kritis)'
            ],
            datasets: [
                {
                    label: 'Jumlah Tiket',
                    data: [
                        agingData.less_4h || 0,
                        agingData['4h_12h'] || 0,
                        agingData['12h_24h'] || 0,
                        agingData.more_24h || 0,
                    ],
                    backgroundColor: [
                        '#22c55e', // Hijau
                        '#eab308', // Kuning
                        '#f97316', // Orange
                        '#ef4444', // Merah
                    ],
                    borderRadius: 6,
                },
            ],
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // Sembunyikan legend default
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        };

        return (
            <div className="h-[300px] w-full">
                <Bar data={chartData} options={options} />
            </div>
        );
    }

    // --- MODE 2: TAMPILKAN GRAFIK TREND (LINE CHART - KODE ASLI) ---
    if (!dataRaw || dataRaw.length === 0) {
        return <div className="text-center text-slate-400 py-10">Belum ada data grafik</div>;
    }

    // Olah Data API menjadi Format ChartJS
    const months = [...new Set(dataRaw.map(item => item.month))];
    const categories = [...new Set(dataRaw.map(item => item.category))];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    const datasets = categories.map((cat, index) => ({
        label: cat,
        data: months.map(m => {
            const found = dataRaw.find(d => d.month === m && d.category === cat);
            return found ? found.count : 0;
        }),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        tension: 0.4,
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