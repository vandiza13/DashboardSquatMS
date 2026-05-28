'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const blueIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

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

export default function TselSiteMap({ latitude, longitude, latitudeOdc, longitudeOdc, latitudeOdp, longitudeOdp, siteId, siteName, odcName, odpName }) {
    const defaultCenter = [-6.2383, 106.9756]; // Bekasi default
    
    // Temukan center berdasarkan koordinat yang valid
    let mapCenter = defaultCenter;
    let markersCount = 0;
    let latSum = 0;
    let lngSum = 0;

    if (latitude && longitude) {
        latSum += parseFloat(latitude);
        lngSum += parseFloat(longitude);
        markersCount++;
    }
    if (latitudeOdc && longitudeOdc) {
        latSum += parseFloat(latitudeOdc);
        lngSum += parseFloat(longitudeOdc);
        markersCount++;
    }
    if (latitudeOdp && longitudeOdp) {
        latSum += parseFloat(latitudeOdp);
        lngSum += parseFloat(longitudeOdp);
        markersCount++;
    }

    if (markersCount > 0) {
        mapCenter = [latSum / markersCount, lngSum / markersCount];
    }

    // Polyline lines
    const linePath = [];
    if (latitude && longitude) linePath.push([parseFloat(latitude), parseFloat(longitude)]);
    if (latitudeOdc && longitudeOdc) linePath.push([parseFloat(latitudeOdc), parseFloat(longitudeOdc)]);
    if (latitudeOdp && longitudeOdp) linePath.push([parseFloat(latitudeOdp), parseFloat(longitudeOdp)]);

    return (
        <MapContainer center={mapCenter} zoom={15} style={{ height: '350px', width: '100%', borderRadius: '1rem', zIndex: 0 }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Marker Site (Biru) */}
            {latitude && longitude && (
                <Marker position={[parseFloat(latitude), parseFloat(longitude)]} icon={blueIcon}>
                    <Popup>
                        <div className="text-xs">
                            <strong className="text-blue-600 font-bold uppercase block">🏢 TSEL SITE ({siteId})</strong>
                            <span className="block font-medium mt-0.5">{siteName || 'No Name'}</span>
                            <span className="text-[10px] text-slate-400 block mt-1">Coord: {latitude}, {longitude}</span>
                        </div>
                    </Popup>
                </Marker>
            )}

            {/* Marker ODC (Merah) */}
            {latitudeOdc && longitudeOdc && (
                <Marker position={[parseFloat(latitudeOdc), parseFloat(longitudeOdc)]} icon={redIcon}>
                    <Popup>
                        <div className="text-xs">
                            <strong className="text-red-600 font-bold uppercase block">🏗️ ODC CABINET</strong>
                            <span className="block font-medium mt-0.5">{odcName || 'No Name'}</span>
                            <span className="text-[10px] text-slate-400 block mt-1">Coord: {latitudeOdc}, {longitudeOdc}</span>
                        </div>
                    </Popup>
                </Marker>
            )}

            {/* Marker ODP (Hijau) */}
            {latitudeOdp && longitudeOdp && (
                <Marker position={[parseFloat(latitudeOdp), parseFloat(longitudeOdp)]} icon={greenIcon}>
                    <Popup>
                        <div className="text-xs">
                            <strong className="text-green-600 font-bold uppercase block">🌀 ODP POINT</strong>
                            <span className="block font-medium mt-0.5">{odpName || 'No Name'}</span>
                            <span className="text-[10px] text-slate-400 block mt-1">Coord: {latitudeOdp}, {longitudeOdp}</span>
                        </div>
                    </Popup>
                </Marker>
            )}

            {/* Hubungan Garis (Fiber Link) */}
            {linePath.length > 1 && (
                <Polyline 
                    positions={linePath} 
                    color="#3b82f6" 
                    dashArray="5, 10" 
                    weight={3}
                />
            )}
        </MapContainer>
    );
}
