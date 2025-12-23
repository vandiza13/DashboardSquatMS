'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// FIX: Icon Leaflet default sering error di Next.js/React, kita perlu fix manual
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Icon Custom untuk Tiket MERAH (Closed) & HIJAU (Running) - Opsional
const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});


export default function TicketMap({ tickets }) {
    // Pusat Peta Default (Misal: Bekasi)
    const center = [-6.2383, 106.9756]; 

    return (
        <MapContainer center={center} zoom={12} style={{ height: '400px', width: '100%', borderRadius: '1rem', zIndex: 0 }}>
            {/* Layer Peta (Gratis dari OpenStreetMap) */}
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Loop Data Tiket untuk jadi Pin */}
            {tickets.map((ticket) => {
                // Skip jika tiket tidak punya koordinat
                if (!ticket.latitude || !ticket.longitude) return null;

                return (
                    <Marker 
                        key={ticket.id} 
                        position={[ticket.latitude, ticket.longitude]}
                        icon={ticket.status === 'CLOSED' ? greenIcon : redIcon}
                    >
                        <Popup>
                            <div className="text-sm">
                                <strong>{ticket.id_tiket}</strong><br/>
                                {ticket.category} - {ticket.subcategory}<br/>
                                <span className={ticket.status === 'CLOSED' ? 'text-green-600' : 'text-red-600 font-bold'}>
                                    {ticket.status}
                                </span>
                                <br/>
                                <a href={`/dashboard/tickets/${ticket.id}`} className="text-blue-500 underline">Lihat Detail</a>
                            </div>
                        </Popup>
                    </Marker>
                )
            })}
        </MapContainer>
    );
}