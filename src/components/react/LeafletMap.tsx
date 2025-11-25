import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon missing in Leaflet with Webpack/Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: (typeof icon === 'object' && icon !== null && 'src' in icon) ? (icon as {src: string}).src : (icon as string),
    shadowUrl: (typeof iconShadow === 'object' && iconShadow !== null && 'src' in iconShadow) ? (iconShadow as {src: string}).src : (iconShadow as string),
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

type MarkerColor = 'blue' | 'red' | 'green' | 'orange' | 'purple' | 'grey';
type MarkerIconType = 'default' | 'start' | 'finish' | 'parking' | 'info';

interface MarkerData {
  lat: number;
  lng: number;
  title?: string;
  url?: string;
  color?: MarkerColor;
  icon?: MarkerIconType;
}

interface LeafletMapProps {
  markers: string | MarkerData[];
  center?: { lat: number; lng: number } | string;
  zoom?: number;
  height?: string;
}

import { useMap } from 'react-leaflet';

// Function to create custom colored marker icons
const createColoredIcon = (color: MarkerColor = 'blue', iconType: MarkerIconType = 'default'): L.Icon => {
  const colorMap: Record<MarkerColor, string> = {
    blue: '#3b82f6',
    red: '#ef4444',
    green: '#22c55e',
    orange: '#f97316',
    purple: '#a855f7',
    grey: '#6b7280',
  };

  const iconSymbols: Record<MarkerIconType, string> = {
    default: '●',
    start: '▶',
    finish: '■',
    parking: 'P',
    info: 'i',
  };

  const markerColor = colorMap[color] || colorMap.blue;
  const symbol = iconSymbols[iconType] || iconSymbols.default;
  
  // Create SVG marker
  const svgIcon = `
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" 
            fill="${markerColor}" stroke="#fff" stroke-width="1.5"/>
      <text x="12.5" y="16" font-size="12" font-weight="bold" text-anchor="middle" fill="white">${symbol}</text>
    </svg>
  `;

  return L.icon({
    iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgIcon),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: (typeof iconShadow === 'object' && iconShadow !== null && 'src' in iconShadow) ? (iconShadow as {src: string}).src : (iconShadow as string),
    shadowSize: [41, 41],
  });
};

const MapController: React.FC<{ markers: MarkerData[], center?: [number, number] | null }> = ({ markers, center }) => {
  const map = useMap();

  useEffect(() => {
    if (!center && markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, center, map]);

  return null;
};

const LeafletMap: React.FC<LeafletMapProps> = ({ 
  markers, 
  center, 
  zoom = 13,
  height = '400px'
}) => {
  const [parsedMarkers, setParsedMarkers] = useState<MarkerData[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  useEffect(() => {
    console.log('LeafletMap received markers:', markers);
    let data: MarkerData[] = [];
    if (typeof markers === 'string') {
      try {
        data = JSON.parse(markers);
      } catch (e) {
        console.error('Failed to parse markers JSON', e);
      }
    } else if (Array.isArray(markers)) {
      data = markers;
    }
    console.log('Parsed markers:', data);
    setParsedMarkers(data);

    if (center) {
      if (typeof center === 'string') {
        try {
           const c = JSON.parse(center);
           setMapCenter([c.lat, c.lng]);
        } catch (e) {
            console.error('Failed to parse center JSON', e);
        }
      } else {
        setMapCenter([center.lat, center.lng]);
      }
    } else {
      // If no center provided, we'll use fitBounds via MapController
      // But MapContainer needs an initial center.
      if (data.length > 0) {
         setMapCenter([data[0].lat, data[0].lng]);
      } else {
         setMapCenter([59.3293, 18.0686]);
      }
    }
  }, [markers, center]);

  if (!mapCenter) {
    return <div>Loading map...</div>;
  }

  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer 
        center={mapCenter} 
        zoom={zoom} 
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController markers={parsedMarkers} center={center ? mapCenter : null} />
        {parsedMarkers.map((marker, idx) => (
          <Marker 
            key={idx} 
            position={[marker.lat, marker.lng]}
            icon={createColoredIcon(marker.color, marker.icon)}
          >
            <Popup>
              <div className="font-sans">
                {marker.title && <h3 className="font-bold text-sm mb-1">{marker.title}</h3>}
                {marker.url && (
                  <a 
                    href={marker.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs"
                  >
                    More info
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default LeafletMap;
