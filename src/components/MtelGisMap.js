'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';

// ─── DEFAULT COLORS ───
const BRAND_COLOR = { color: '#ef4444', bg: '#fecaca', label: 'MTEL' }; // Red

// ─── CUSTOM CIRCLE MARKER ICON ───
function createCircleIcon(isNearest = false) {
    const size = isNearest ? 20 : 14;
    const borderWidth = isNearest ? 3 : 2.5;
    const glowSize = isNearest ? `0 0 12px ${BRAND_COLOR.color}80` : `0 0 0 1px ${BRAND_COLOR.color}40`;
    return L.divIcon({
        className: 'custom-marker-icon',
        html: `<div style="
            width: ${size}px; height: ${size}px;
            background: ${BRAND_COLOR.color};
            border: ${borderWidth}px solid ${isNearest ? '#fbbf24' : 'white'};
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35), ${glowSize};
            transition: transform 0.15s ease;
            ${isNearest ? 'animation: pulse-glow 1.5s ease-in-out infinite;' : ''}
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2 + 4)],
    });
}

// ─── SEARCH PIN ICON ───
const searchPinIcon = L.divIcon({
    className: 'search-pin-icon',
    html: `<div style="
        width: 28px; height: 28px;
        background: linear-gradient(135deg, #f43f5e, #e11d48);
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(225,29,72,0.45), 0 0 20px rgba(225,29,72,0.25);
        display: flex; align-items: center; justify-content: center;
    "><div style="
        width: 8px; height: 8px; background: white; border-radius: 50%;
        transform: rotate(45deg);
    "></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
});

// ─── AUTO FIT BOUNDS ───
function FitBoundsToMarkers({ sites, searchCoord }) {
    const map = useMap();

    useEffect(() => {
        if (searchCoord) {
            map.flyTo([searchCoord.lat, searchCoord.lng], 15, { duration: 1.2 });
            return;
        }
        if (sites.length > 0) {
            const validCoords = sites
                .map(s => {
                    const lat = parseFloat(s.latitude);
                    const lng = parseFloat(s.longitude);
                    return (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) ? [lat, lng] : null;
                })
                .filter(Boolean);

            if (validCoords.length > 0) {
                const bounds = L.latLngBounds(validCoords);
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
            }
        }
    }, [sites, searchCoord, map]);

    return null;
}

// ─── CUSTOM CLUSTER ICON ───
function createClusterIcon(cluster) {
    const count = cluster.getChildCount();
    let size = 36, fontSize = 12, bgColor = '#ef4444', shadowSize = '8px';

    if (count >= 100) { size = 48; fontSize = 14; bgColor = '#b91c1c'; shadowSize = '12px'; }
    else if (count >= 50) { size = 44; fontSize = 13; bgColor = '#dc2626'; shadowSize = '10px'; }
    else if (count >= 10) { size = 40; fontSize = 12; bgColor = '#ef4444'; shadowSize = '9px'; }

    return L.divIcon({
        html: `<div style="
            width: ${size}px; height: ${size}px;
            background: ${bgColor}; border: 3px solid white; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: 800; font-size: ${fontSize}px;
            font-family: 'Inter', system-ui, sans-serif;
            box-shadow: 0 3px ${shadowSize} rgba(0,0,0,0.3), 0 0 0 2px ${bgColor}30;
            letter-spacing: -0.5px;
        ">${count}</div>`,
        className: 'custom-cluster-icon',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

// ─── Hitung jarak (Haversine, km) ───
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Popup info row helper ───
function InfoRow({ label, value, color, mono }) {
    if (!value || value === '-') return null;
    return (
        <div>
            <div style={{ color: '#94a3b8', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <div style={{ fontWeight: 700, color: color || '#334155', fontSize: mono ? '10px' : '11px', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</div>
        </div>
    );
}

// ─── MAIN GIS MAP COMPONENT ───
export default function MtelGisMap({ sites, onSiteClick, searchCoord, nearestSiteIds }) {
    const defaultCenter = [-6.2383, 106.9756];
    const nearestSet = useMemo(() => new Set(nearestSiteIds || []), [nearestSiteIds]);

    const markers = useMemo(() => {
        return sites.map((site, index) => {
            const lat = parseFloat(site.latitude);
            const lng = parseFloat(site.longitude);
            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

            const isNearest = nearestSet.has(site.site_id);
            const icon = createCircleIcon(isNearest);

            let distanceKm = null;
            if (searchCoord) {
                distanceKm = haversineDistance(searchCoord.lat, searchCoord.lng, lat, lng);
            }

            return (
                <Marker key={site.id || `${site.site_id}-${index}`} position={[lat, lng]} icon={icon} zIndexOffset={isNearest ? 1000 : 0}>
                    <Popup maxWidth={300} minWidth={240}>
                        <div style={{ fontFamily: "'Inter', system-ui, sans-serif", padding: '2px' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <div style={{
                                    width: '10px', height: '10px', borderRadius: '50%',
                                    background: BRAND_COLOR.color, flexShrink: 0,
                                    boxShadow: `0 0 0 3px ${BRAND_COLOR.color}25`
                                }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#1e293b', letterSpacing: '-0.3px' }}>
                                        {site.site_id}
                                        {isNearest && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#fbbf24', color: '#78350f', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>TERDEKAT</span>}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, marginTop: '1px' }}>
                                        {site.site_name || 'Unnamed Site'}
                                    </div>
                                </div>
                            </div>

                            {/* Distance Badge */}
                            {distanceKm !== null && (
                                <div style={{
                                    background: isNearest ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : '#f1f5f9',
                                    borderRadius: '8px', padding: '6px 10px', marginBottom: '8px',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    border: isNearest ? '1px solid #fbbf24' : '1px solid #e2e8f0',
                                    fontSize: '11px', fontWeight: 700
                                }}>
                                    <span>📏</span>
                                    <span style={{ color: isNearest ? '#92400e' : '#475569' }}>
                                        Jarak: {distanceKm < 1 ? `${(distanceKm * 1000).toFixed(0)} meter` : `${distanceKm.toFixed(2)} km`}
                                    </span>
                                </div>
                            )}

                            {/* Info Grid Utama */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px',
                                background: '#f8fafc', borderRadius: '8px', padding: '8px',
                                border: '1px solid #e2e8f0', fontSize: '11px'
                            }}>
                                <InfoRow label="Provider" value="MTEL" color={BRAND_COLOR.color} />
                                <InfoRow label="STO" value={site.sto} />
                            </div>

                            {/* Coordinates */}
                            <div style={{
                                marginTop: '6px', fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace',
                                textAlign: 'center', fontWeight: 500
                            }}>
                                📍 {lat.toFixed(6)}, {lng.toFixed(6)}
                            </div>

                            {/* Action Button */}
                            {onSiteClick && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onSiteClick(site); }}
                                    style={{
                                        marginTop: '8px', width: '100%', padding: '7px 12px',
                                        background: BRAND_COLOR.color, color: 'white', border: 'none',
                                        borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                                        cursor: 'pointer', letterSpacing: '0.3px', transition: 'background 0.2s'
                                    }}
                                    onMouseOver={(e) => e.target.style.background = '#dc2626'}
                                    onMouseOut={(e) => e.target.style.background = BRAND_COLOR.color}
                                >
                                    Lihat Detail Lengkap →
                                </button>
                            )}
                        </div>
                    </Popup>
                </Marker>
            );
        }).filter(Boolean);
    }, [sites, onSiteClick, searchCoord, nearestSet]);

    return (
        <MapContainer
            center={defaultCenter}
            zoom={11}
            style={{ height: '100%', width: '100%', borderRadius: '1rem', zIndex: 0 }}
            zoomControl={true}
        >
            <style>{`
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 4px rgba(251,191,36,0.4); }
                    50% { box-shadow: 0 0 16px rgba(251,191,36,0.8), 0 0 24px rgba(251,191,36,0.3); }
                }
            `}</style>

            <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="OpenStreetMap">
                    <TileLayer
                        attribution='&copy; OpenStreetMap'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Satellite (Esri)">
                    <TileLayer
                        attribution='&copy; Esri'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Topographic">
                    <TileLayer
                        attribution='&copy; OpenTopoMap'
                        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                    />
                </LayersControl.BaseLayer>
            </LayersControl>

            {/* Search Pin Marker */}
            {searchCoord && (
                <>
                    <Marker position={[searchCoord.lat, searchCoord.lng]} icon={searchPinIcon} zIndexOffset={2000}>
                        <Popup>
                            <div style={{ fontFamily: "'Inter', system-ui, sans-serif", textAlign: 'center', padding: '4px' }}>
                                <div style={{ fontWeight: 800, fontSize: '13px', color: '#e11d48', marginBottom: '2px' }}>📍 Lokasi Pencarian</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                                    {searchCoord.lat.toFixed(6)}, {searchCoord.lng.toFixed(6)}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                    <Circle
                        center={[searchCoord.lat, searchCoord.lng]}
                        radius={1000}
                        pathOptions={{ color: '#e11d48', fillColor: '#fecdd3', fillOpacity: 0.15, weight: 1.5, dashArray: '6, 4' }}
                    />
                </>
            )}

            {/* Marker Cluster Group */}
            <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={60}
                spiderfyOnMaxZoom={true}
                showCoverageOnHover={false}
                iconCreateFunction={createClusterIcon}
                animate={true}
            >
                {markers}
            </MarkerClusterGroup>

            {/* Auto Fit / Fly to search */}
            <FitBoundsToMarkers sites={sites} searchCoord={searchCoord} />
        </MapContainer>
    );
}

export { haversineDistance };
