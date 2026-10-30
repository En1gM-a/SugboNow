// Every Leaflet map in the app. This module (and Leaflet itself) is only loaded through
// ./LazyMaps, so pages without a map never download it.

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { Alert, LocationKind, Severity, Weather } from '@/types/api';
import { useTheme } from '@/hooks/useBrowser';
import { KIND_HEX } from '@/utils/places';
import { RAIN_ON, rainColor } from '@/utils/weather';

const CEBU: [number, number] = [10.3157, 123.8854];
const TRAFFIC_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const SEVERITY_COLOR: Record<Severity, string> = { high: '#B91C1C', medium: '#B45309', low: '#475569' };
const KIND_GLYPH: Record<LocationKind, string> = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5',
  school: 'M2 9.5 12 5l10 4.5-10 4.5L2 9.5Zm4 2v5c3 2.5 9 2.5 12 0v-5',
  work: 'M4 8h16v12H4V8Zm5 0V5h6v3',
  other: 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z',
};

function placeIcon(kind: LocationKind, label: string) {
  return L.divIcon({
    className: 'sn-map-label',
    iconSize: [36, 44],
    iconAnchor: [18, 42],
    html: `<div role="img" aria-label="${label.replace(/"/g, '')}" style="position:relative;width:36px;height:44px">
      <svg width="36" height="44" viewBox="0 0 36 44"><path d="M18 43s15-13 15-25A15 15 0 0 0 3 18c0 12 15 25 15 25Z" fill="${KIND_HEX[kind]}" stroke="#fff" stroke-width="2"/></svg>
      <svg width="18" height="18" viewBox="0 0 24 24" style="position:absolute;left:9px;top:8px" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${KIND_GLYPH[kind]}"/></svg>
    </div>`,
  });
}

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    const zoom = Math.max(map.getZoom(), 14);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) map.setView(target, zoom, { animate: false });
    else map.flyTo(target, zoom, { duration: 0.4 });
  }, [target, map]);
  return null;
}

export interface MapPlace {
  id: string;
  label: string;
  kind: LocationKind;
  lat: number;
  lng: number;
}

interface AlertsMapProps {
  places?: MapPlace[];
  alerts: Alert[];
  /** Origin and destination of the commute: draws a dashed straight "approximate route". */
  route?: [MapPlace, MapPlace] | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  interactive?: boolean;
  className?: string;
  label: string;
}

/** User places as pins plus alerts as severity-colored circle markers (canvas-rendered). */
export function AlertsMap({ places = [], alerts, route, selectedId, onSelect, interactive = true, className, label }: AlertsMapProps) {
  const located = alerts.filter((a) => a.lat !== null && a.lng !== null);
  const points = useMemo<Array<[number, number]>>(() => {
    const p: Array<[number, number]> = places.map((x) => [x.lat, x.lng]);
    if (p.length < 2) for (const a of located.slice(0, 20)) p.push([a.lat!, a.lng!]);
    return p;
  }, [places, located]);
  const selected = located.find((a) => a.id === selectedId);
  // One renderer per map. Its tolerance widens each alert dot's tap area to about 44px without drawing it bigger.
  const tapRenderer = useMemo(() => L.canvas({ tolerance: 12 }), []);
  // Canvas can't read CSS variables, so the route line takes a concrete color per theme.
  const routeColor = useTheme() === 'dark' ? '#E9E5DF' : '#14213D';

  return (
    <div className={className} role="region" aria-label={label}>
      <MapContainer
        center={CEBU}
        zoom={12}
        preferCanvas
        renderer={tapRenderer}
        scrollWheelZoom={false}
        dragging={interactive}
        zoomControl={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        keyboard={interactive}
        attributionControl
        className="size-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={`${TRAFFIC_ATTRIBUTION} · Traffic data &copy; TomTom`} />
        <FitBounds points={points} />
        {selected && <FlyTo target={[selected.lat!, selected.lng!]} />}
        {route && (
          <Polyline
            positions={[
              [route[0].lat, route[0].lng],
              [route[1].lat, route[1].lng],
            ]}
            pathOptions={{ color: routeColor, weight: 4, dashArray: '8 10', opacity: 0.85 }}
          >
            <Tooltip sticky>Approximate route (straight line)</Tooltip>
          </Polyline>
        )}
        {located.map((a) => (
          <CircleMarker
            key={a.id}
            center={[a.lat!, a.lng!]}
            radius={a.id === selectedId ? 13 : a.severity === 'high' ? 10 : 8}
            pathOptions={{
              color: '#FFFFFF',
              weight: a.id === selectedId ? 3 : 2,
              fillColor: SEVERITY_COLOR[a.severity],
              fillOpacity: 0.92,
            }}
            eventHandlers={onSelect ? { click: () => onSelect(a.id) } : undefined}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <strong>{a.severity.toUpperCase()}</strong> · {a.title}
            </Tooltip>
          </CircleMarker>
        ))}
        {places.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={placeIcon(p.kind, p.label)} keyboard={false}>
            <Tooltip direction="top" offset={[0, -40]}>
              {p.label}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function weatherIcon(w: Weather, hour: number) {
  const h = w.hourly[hour] ?? w.hourly[0];
  const rain = h?.chanceOfRain ?? w.current.chanceOfRain;
  const temp = Math.round(h?.tempC ?? w.current.tempC);
  const bg = rainColor(rain);
  return L.divIcon({
    className: 'sn-map-label',
    iconSize: [84, 46],
    iconAnchor: [42, 23],
    html: `<div style="width:84px;border-radius:12px;background:var(--color-surface);border:1px solid var(--color-line);box-shadow:var(--shadow-raised);overflow:hidden;font-family:'Open Sans',system-ui,sans-serif;text-align:center">
      <div style="font:600 10px/1.3 'Open Sans',system-ui,sans-serif;color:var(--color-muted);padding:3px 4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${w.area.name}</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:6px;padding:1px 4px 3px;font-variant-numeric:tabular-nums">
        <span style="font:700 14px/1.2 Poppins,system-ui,sans-serif;color:var(--color-ink)">${temp}°</span>
        <span style="background:${bg};color:${RAIN_ON};border-radius:999px;padding:0 6px;font:600 11px/1.5 'Open Sans',system-ui,sans-serif">${rain}%</span>
      </div>
    </div>`,
  });
}

/** PAGASA-style map: one label per area with temperature and rain chance for the chosen hour. */
export function WeatherMap({ areas, hour, selected, onSelect, className }: { areas: Weather[]; hour: number; selected?: string; onSelect?: (slug: string) => void; className?: string }) {
  // Icons change with the hour; react-leaflet calls setIcon on the existing markers (the map is never re-created).
  const icons = useMemo(() => areas.map((w) => weatherIcon(w, hour)), [areas, hour]);
  return (
    <div className={className} role="region" aria-label="Map of Metro Cebu with temperature and rain chance per area">
      <MapContainer center={[10.31, 123.9]} zoom={11} preferCanvas scrollWheelZoom={false} className="size-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={TRAFFIC_ATTRIBUTION} />
        {areas.map((w, i) => (
          <Marker
            key={w.area.slug}
            position={[w.area.lat, w.area.lng]}
            icon={icons[i]}
            zIndexOffset={w.area.slug === selected ? 1000 : 0}
            eventHandlers={onSelect ? { click: () => onSelect(w.area.slug) } : undefined}
            title={`${w.area.name}: ${Math.round(w.hourly[hour]?.tempC ?? w.current.tempC)} degrees, ${w.hourly[hour]?.chanceOfRain ?? w.current.chanceOfRain}% chance of rain`}
          />
        ))}
      </MapContainer>
    </div>
  );
}

function ClickToPin({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(Math.round(e.latlng.lat * 1e5) / 1e5, Math.round(e.latlng.lng * 1e5) / 1e5) });
  return null;
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, Math.max(map.getZoom(), 14));
  }, [center, map]);
  return null;
}

/** Tap the map (or drag the pin) to set a place's coordinates. */
export function PinDropMap({ lat, lng, kind, onChange, className, recenterKey }: { lat: number | null; lng: number | null; kind: LocationKind; onChange: (lat: number, lng: number) => void; className?: string; recenterKey?: string }) {
  const center = useMemo<[number, number]>(() => (lat !== null && lng !== null ? [lat, lng] : CEBU), [recenterKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={className}>
      <MapContainer center={center} zoom={lat !== null ? 15 : 12} preferCanvas className="size-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={TRAFFIC_ATTRIBUTION} />
        <ClickToPin onPick={onChange} />
        {recenterKey && <Recenter center={center} />}
        {lat !== null && lng !== null && (
          <Marker
            position={[lat, lng]}
            icon={placeIcon(kind, 'Pinned place')}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const p = (e.target as L.Marker).getLatLng();
                onChange(Math.round(p.lat * 1e5) / 1e5, Math.round(p.lng * 1e5) / 1e5);
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
