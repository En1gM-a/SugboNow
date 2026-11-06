// Every Leaflet map in the app. This module (and Leaflet itself) loads only through ./LazyMaps, so pages without a
// map never download it (handoff <performance>). The browser talks only to OpenStreetMap's tile servers.

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { AttributionControl, CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { ICON_PATHS } from '@/components/icons/paths';
import { getDisplay, useDisplay } from '@/lib/display';
import { CEBU_CENTER, KIND_META } from '@/lib/places';
import type { Alert, LocationKind, Weather } from '@/types/api';
import { cx } from '@/utils/cx';
import { rainStep, SEVERITY_COLOR } from './mapTokens';

const CEBU: [number, number] = [CEBU_CENTER.lat, CEBU_CENTER.lng];
const OSM_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

function Tiles({ credit = OSM_CREDIT }: { credit?: string }) {
  return <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={credit} maxZoom={19} />;
}

/** Leaflet only tracks the window; this also covers a tab or sheet changing the map's size. */
function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function placeIcon(kind: LocationKind, label: string) {
  return L.divIcon({
    className: 'map-pin',
    iconSize: [36, 44],
    iconAnchor: [18, 42],
    html: `<span role="img" aria-label="${escapeHtml(label)}"><svg width="36" height="44" viewBox="0 0 36 44" aria-hidden="true"><path d="M18 43s15-13 15-25A15 15 0 0 0 3 18c0 12 15 25 15 25Z" fill="#14213D" stroke="#fff" stroke-width="2"/></svg><svg class="map-pin-glyph" width="18" height="18" viewBox="0 0 256 256" fill="#FFC233" aria-hidden="true"><path d="${ICON_PATHS[KIND_META[kind].icon]}"/></svg></span>`,
  });
}

function FitBounds({ points, bottomInset = 0 }: { points: Array<[number, number]>; bottomInset?: number }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(L.latLngBounds(points), { paddingTopLeft: [48, 56], paddingBottomRight: [48, 48 + bottomInset], maxZoom: 15 });
    // Only when the places themselves change, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map, bottomInset]);
  return null;
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  const key = target?.join(',');
  useEffect(() => {
    if (!target) return;
    const zoom = Math.max(map.getZoom(), 14);
    if (getDisplay().still) map.setView(target, zoom, { animate: false });
    else map.flyTo(target, zoom, { duration: 0.4 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
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
  alerts: Alert[];
  /** The user's places, shown as pins. The map fits itself to them when there are two or more. */
  places?: MapPlace[];
  /** The commute's origin and destination: a dashed straight line labeled "approximate route". */
  route?: [MapPlace, MapPlace] | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Describes the map for screen readers; the list beside it is the keyboard alternative. */
  label: string;
  /** Pixels at the bottom covered by the phone's sheet, so the fitted places stay in view. */
  bottomInset?: number;
  /** On phones the sheet covers the map's bottom edge, so the credit moves to the top. */
  creditPosition?: L.ControlPosition;
}

/** Alerts as circle markers colored by severity, drawn on one canvas, with the user's places as pins. */
export function AlertsMap({ alerts, places = [], route, selectedId, onSelect, label, bottomInset = 0, creditPosition = 'bottomright' }: AlertsMapProps) {
  const { mode } = useDisplay();
  const located = useMemo(() => alerts.filter((a) => a.lat !== null && a.lng !== null), [alerts]);
  const selected = located.find((a) => a.id === selectedId);
  const points = useMemo<Array<[number, number]>>(() => (places.length >= 2 ? places.map((p) => [p.lat, p.lng]) : []), [places]);
  // Its tolerance widens each alert dot's tap area to about 44px without drawing it bigger.
  const renderer = useMemo(() => L.canvas({ tolerance: 12 }), []);
  // The tiles flip in dark mode, so the route takes a color that reads on each.
  const routeColor = mode === 'dark' ? '#FFC233' : '#1E5AA8';

  return (
    <div className="map-fill" role="region" aria-label={label}>
      <MapContainer center={CEBU} zoom={12} preferCanvas renderer={renderer} scrollWheelZoom={false} attributionControl={false} className="map-fill">
        <Tiles credit={`${OSM_CREDIT} · Traffic data &copy; TomTom`} />
        <AttributionControl prefix={false} position={creditPosition} />
        <AutoResize />
        <FitBounds points={points} bottomInset={bottomInset} />
        {selected && <FlyTo target={[selected.lat as number, selected.lng as number]} />}
        {route && (
          <Polyline
            positions={[
              [route[0].lat, route[0].lng],
              [route[1].lat, route[1].lng],
            ]}
            pathOptions={{ color: routeColor, weight: 4, dashArray: '8 10', opacity: 0.9 }}
          >
            <Tooltip permanent direction="center" className="route-tip">
              approximate route
            </Tooltip>
          </Polyline>
        )}
        {located.map((alert) => {
          const on = alert.id === selectedId;
          return (
            <CircleMarker
              key={alert.id}
              center={[alert.lat as number, alert.lng as number]}
              radius={on ? 13 : alert.severity === 'high' ? 10 : 8}
              pathOptions={{ color: on ? '#FFC233' : '#FFFFFF', weight: on ? 4 : 2, fillColor: SEVERITY_COLOR[alert.severity], fillOpacity: 0.95 }}
              eventHandlers={onSelect ? { click: () => onSelect(alert.id) } : undefined}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                {alert.title}
              </Tooltip>
            </CircleMarker>
          );
        })}
        {places.map((place) => (
          <Marker key={place.id} position={[place.lat, place.lng]} icon={placeIcon(place.kind, place.label)} keyboard={false}>
            <Tooltip direction="top" offset={[0, -40]}>
              {place.label}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

// At the zoom that fits Metro Cebu the towns sit closer than their labels are wide, so each label shifts a little.
const LABEL_NUDGE: Record<string, [number, number]> = {
  cebu_city: [-52, 10],
  mandaue_city: [0, -34],
  lapu_lapu_city: [44, 14],
  consolacion: [10, -12],
  liloan: [50, 10],
  talisay_city: [24, 0],
};

function rainIcon(weather: Weather, hour: number, on: boolean) {
  const h = weather.hourly[hour] ?? weather.hourly[0];
  const chance = h?.chanceOfRain ?? weather.current.chanceOfRain;
  const temp = Math.round(h?.tempC ?? weather.current.tempC);
  const step = rainStep(chance);
  const [dx, dy] = LABEL_NUDGE[weather.area.slug] ?? [0, 0];
  return L.divIcon({
    className: cx('rain-pin', on && 'is-on'),
    iconSize: [96, 50],
    iconAnchor: [48 - dx, 25 - dy],
    html: `<span class="rain-pin-name">${escapeHtml(weather.area.name)}</span><span class="rain-pin-row"><b>${temp}°</b><i style="background:${step.background};color:${step.color}">${chance}%</i></span>`,
  });
}

/** Brings the chosen area into view when it's off the map, without changing the zoom. */
function KeepInView({ target }: { target: [number, number] | null }) {
  const map = useMap();
  const key = target?.join(',');
  useEffect(() => {
    if (target && !map.getBounds().contains(target)) map.panTo(target, { animate: !getDisplay().still });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

interface WeatherMapProps {
  areas: Weather[];
  /** Hours from now; the slider's deferred value. */
  hour: number;
  selected?: string;
  onSelect?: (slug: string) => void;
  center?: [number, number];
}

/** One label per area with its temperature and rain chance for the chosen hour. The slider restyles these; the map stays. */
export function WeatherMap({ areas, hour, selected, onSelect, center = [10.31, 123.9] }: WeatherMapProps) {
  const icons = useMemo(() => areas.map((w) => rainIcon(w, hour, w.area.slug === selected)), [areas, hour, selected]);
  const chosen = areas.find((w) => w.area.slug === selected);
  return (
    <div className="map-fill" role="region" aria-label="Map of Metro Cebu with the temperature and rain chance for each area">
      <MapContainer center={center} zoom={11} preferCanvas scrollWheelZoom={false} attributionControl={false} className="map-fill">
        <Tiles />
        <AttributionControl prefix={false} />
        <AutoResize />
        <KeepInView target={chosen ? [chosen.area.lat, chosen.area.lng] : null} />
        {areas.map((w, i) => (
          <Marker
            key={w.area.slug}
            position={[w.area.lat, w.area.lng]}
            icon={icons[i]}
            zIndexOffset={w.area.slug === selected ? 1000 : 0}
            title={`${w.area.name}: ${Math.round(w.hourly[hour]?.tempC ?? w.current.tempC)} degrees, ${w.hourly[hour]?.chanceOfRain ?? w.current.chanceOfRain}% chance of rain`}
            eventHandlers={onSelect ? { click: () => onSelect(w.area.slug) } : undefined}
          />
        ))}
      </MapContainer>
    </div>
  );
}

function ClickToPin({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(round5(e.latlng.lat), round5(e.latlng.lng)) });
  return null;
}

function Recenter({ lat, lng, jump }: { lat: number; lng: number; jump: number }) {
  const map = useMap();
  useEffect(() => {
    if (jump > 0) map.setView([lat, lng], 14, { animate: !getDisplay().still });
    // Only when the form asks to jump, not every time the pin moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump, map]);
  return null;
}

interface PinDropMapProps {
  lat: number;
  lng: number;
  kind: LocationKind;
  onChange: (lat: number, lng: number) => void;
  /** Raise it to move the map to the pin, e.g. after choosing a town. */
  jump?: number;
  className?: string;
}

/**
 * Tap the map or drag the pin to set a place's coordinates. The browser must not call a geocoding service, so this is
 * how a place gets its spot. For keyboard users: pan with the arrow keys, then "Put the pin at the map's center".
 */
export function PinDropMap({ lat, lng, kind, onChange, jump = 0, className }: PinDropMapProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  return (
    <>
      <div className={cx('map-box', className)}>
        <MapContainer ref={setMap} center={[lat, lng]} zoom={14} preferCanvas scrollWheelZoom={false} attributionControl={false} className="map-fill">
          <Tiles />
          <AttributionControl prefix={false} />
          <AutoResize />
          <ClickToPin onPick={onChange} />
          <Recenter lat={lat} lng={lng} jump={jump} />
          <Marker
            position={[lat, lng]}
            icon={placeIcon(kind, 'Pinned place')}
            draggable
            keyboard={false}
            eventHandlers={{
              dragend: (e) => {
                const at = (e.target as L.Marker).getLatLng();
                onChange(round5(at.lat), round5(at.lng));
              },
            }}
          />
        </MapContainer>
      </div>
      <button
        type="button"
        className="btn btn-quiet pin-center"
        disabled={!map}
        onClick={() => {
          const at = map?.getCenter();
          if (at) onChange(round5(at.lat), round5(at.lng));
        }}
      >
        Put the pin at the map&apos;s center
      </button>
    </>
  );
}
