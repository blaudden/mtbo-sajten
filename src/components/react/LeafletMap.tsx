import React, { useEffect, useState } from 'react';



type MarkerColor = 'blue' | 'red' | 'green' | 'orange' | 'purple' | 'grey';
type MarkerIconType = 'default' | 'start' | 'finish' | 'parking' | 'info';

interface MarkerData {
  lat: number;
  lng: number;
  title?: string;
  url?: string;
  color?: MarkerColor;
  icon?: MarkerIconType;
  zIndexOffset?: number;
}

interface PolygonData {
  points: { lat: number; lng: number }[] | string;
  color?: MarkerColor;
  title?: string;
}

interface PolylineData {
  points: { lat: number; lng: number }[] | string;
  color?: MarkerColor;
  width?: number;
  title?: string;
}

const DEFAULT_MAP_CENTER: [number, number] = [62.0, 15.0];

interface LeafletMapProps {
  markers?: string | MarkerData[];
  polygons?: string | PolygonData[];
  polylines?: string | PolylineData[];
  center?: { lat: number; lng: number } | string;
  zoom?: number;
  height?: string;
}

// Function to create custom colored marker icons
const createColoredIcon = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  LModule: any,
  color: MarkerColor = 'blue',
  iconType: MarkerIconType = 'default'
) => {
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

  return LModule.icon({
    iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgIcon),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    shadowSize: [41, 41],
  });
};

const LeafletMap: React.FC<LeafletMapProps> = ({
  markers = [],
  polygons = [],
  polylines = [],
  center,
  zoom = 13,
  height = '400px',
}) => {
  const [parsedMarkers, setParsedMarkers] = useState<MarkerData[]>([]);
  const [parsedPolygons, setParsedPolygons] = useState<PolygonData[]>([]);
  const [parsedPolylines, setParsedPolylines] = useState<PolylineData[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  // Dynamic module state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [LeafletModules, setLeafletModules] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [LInstance, setLInstance] = useState<any>(null);

  useEffect(() => {
    // Dynamically import Leaflet and React-Leaflet only on client
    const loadModules = async () => {
      try {
        const leaflet = await import('leaflet');
        const reactLeaflet = await import('react-leaflet');
        await import('leaflet/dist/leaflet.css');

        // Fix default icon
        // @ts-expect-error - Fix for missing type definition for prototype
        delete leaflet.default.Icon.Default.prototype._getIconUrl;
        leaflet.default.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });

        setLInstance(leaflet.default);
        setLeafletModules(reactLeaflet);
      } catch (error) {
        console.error('Failed to load map modules', error);
      }
    };

    if (typeof window !== 'undefined') {
      loadModules();
    }
  }, []);

  useEffect(() => {
    // Process markers, polygons, polylines regardless of map modules loaded yet
    console.log('LeafletMap received markers:', markers);
    let markerData: MarkerData[] = [];
    if (typeof markers === 'string') {
      try {
        markerData = JSON.parse(markers);
      } catch (e) {
        console.error('Failed to parse markers JSON', e);
      }
    } else if (Array.isArray(markers)) {
      markerData = markers;
    }

    // Stagger markers with same location
    const staggeredMarkers = [...markerData];
    const sameLocationGroups: { [key: string]: number[] } = {};

    staggeredMarkers.forEach((m, index) => {
      // guard lat/lng existence
      if (!m.lat || !m.lng) return;
      const key = `${m.lat.toFixed(5)},${m.lng.toFixed(5)}`;
      if (!sameLocationGroups[key]) {
        sameLocationGroups[key] = [];
      }
      sameLocationGroups[key].push(index);
    });

    Object.values(sameLocationGroups).forEach((indices) => {
      if (indices.length > 1) {
        const offset = 0.0002; // Adjust this value to change separation distance
        indices.forEach((idx, i) => {
          if (i > 0) {
            // Stagger to the right (increase lng)
            // Put behind (decrease zIndexOffset)
            staggeredMarkers[idx] = {
              ...staggeredMarkers[idx],
              lng: staggeredMarkers[idx].lng + offset * i,
              zIndexOffset: -1000 * i,
            };
          }
        });
      }
    });

    setParsedMarkers(staggeredMarkers);

    let polygonData: PolygonData[] = [];
    if (typeof polygons === 'string') {
      try {
        polygonData = JSON.parse(polygons);
      } catch (e) {
        console.error('Failed to parse polygons JSON', e);
      }
    } else if (Array.isArray(polygons)) {
      polygonData = polygons;
    }
    setParsedPolygons(polygonData);

    let polylineData: PolylineData[] = [];
    if (typeof polylines === 'string') {
      try {
        polylineData = JSON.parse(polylines);
      } catch (e) {
        console.error('Failed to parse polylines JSON', e);
      }
    } else if (Array.isArray(polylines)) {
      polylineData = polylines;
    }
    setParsedPolylines(polylineData);

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
      if (markerData.length > 0 && markerData[0].lat && markerData[0].lng) {
        setMapCenter([markerData[0].lat, markerData[0].lng]);
      } else if (polygonData.length > 0) {
        const points = parsePoints(polygonData[0].points);
        if (points.length > 0) {
          setMapCenter([points[0].lat, points[0].lng]);
        } else {
          setMapCenter(DEFAULT_MAP_CENTER);
        }
      } else if (polylineData.length > 0) {
        const points = parsePoints(polylineData[0].points);
        if (points.length > 0) {
          setMapCenter([points[0].lat, points[0].lng]);
        } else {
          setMapCenter(DEFAULT_MAP_CENTER);
        }
      } else {
        setMapCenter(DEFAULT_MAP_CENTER);
      }
    }
  }, [markers, polygons, polylines, center]);

  if (!LeafletModules || !mapCenter || !LInstance) {
    return <div style={{ height, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>Loading map...</div>;
  }

  const { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMap } = LeafletModules;

  // Controller component that uses useMap hook
  const MapController: React.FC<{
    markers: MarkerData[];
    polygons: PolygonData[];
    polylines: PolylineData[];
    center?: [number, number] | null;
  }> = ({ markers, polygons, polylines, center }) => {
    const map = useMap();

    useEffect(() => {
      if (!center) {
        const allPoints: [number, number][] = [];

        markers.forEach((m) => {
            if(m.lat && m.lng) allPoints.push([m.lat, m.lng]);
        });

        polygons.forEach((p) => {
          const points = parsePoints(p.points);
          points.forEach((pt) => allPoints.push([pt.lat, pt.lng]));
        });

        polylines.forEach((l) => {
          const points = parsePoints(l.points);
          points.forEach((pt) => allPoints.push([pt.lat, pt.lng]));
        });

        if (allPoints.length > 0) {
          const bounds = LInstance.latLngBounds(allPoints);
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    }, [markers, polygons, polylines, center, map]);

    return null;
  };

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
        <MapController
          markers={parsedMarkers}
          polygons={parsedPolygons}
          polylines={parsedPolylines}
          center={center ? mapCenter : null}
        />
        {parsedMarkers.map((marker, idx) => (
          <Marker
            key={idx}
            position={[marker.lat, marker.lng]}
            icon={createColoredIcon(LInstance, marker.color, marker.icon)}
            zIndexOffset={marker.zIndexOffset}
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
        {parsedPolygons.map((polygon, idx) => (
          <Polygon
            key={`poly-${idx}`}
            positions={parsePoints(polygon.points).map((p) => [p.lat, p.lng])}
            pathOptions={{ color: getColorHex(polygon.color || 'red'), fillColor: getColorHex(polygon.color || 'red') }}
          >
            {polygon.title && (
              <Popup>
                <div className="font-sans font-bold text-sm">{polygon.title}</div>
              </Popup>
            )}
          </Polygon>
        ))}
        {parsedPolylines.map((line, idx) => (
          <Polyline
            key={`line-${idx}`}
            positions={parsePoints(line.points).map((p) => [p.lat, p.lng])}
            pathOptions={{ color: getColorHex(line.color || 'green'), weight: line.width || 3 }}
          >
            {line.title && (
              <Popup>
                <div className="font-sans font-bold text-sm">{line.title}</div>
              </Popup>
            )}
          </Polyline>
        ))}
      </MapContainer>
    </div>
  );
};

// Helper to get color hex code
const getColorHex = (color?: MarkerColor) => {
  const colorMap: Record<MarkerColor, string> = {
    blue: '#3b82f6',
    red: '#ef4444',
    green: '#22c55e',
    orange: '#f97316',
    purple: '#a855f7',
    grey: '#6b7280',
  };
  return colorMap[color || 'blue'] || colorMap.blue;
};

// Helper to parse points from string or array
const parsePoints = (points: { lat: number; lng: number }[] | string): { lat: number; lng: number }[] => {
  if (Array.isArray(points)) {
    return points;
  }
  if (typeof points === 'string') {
    try {
      // Try parsing as JSON first
      if (points.trim().startsWith('[')) {
        return JSON.parse(points);
      }
      // Parse as "lat,lng; lat,lng" string
      return points
        .split(';')
        .map((p) => {
          const [lat, lng] = p.trim().split(',').map(Number);
          if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng };
          }
          return null;
        })
        .filter((p): p is { lat: number; lng: number } => p !== null);
    } catch (e) {
      console.error('Failed to parse points:', points, e);
      return [];
    }
  }
  return [];
};

export default LeafletMap;
