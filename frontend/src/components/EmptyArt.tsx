import { JEEP_BODY, JEEP_WHEEL } from '@/lib/jeepArt';

// Empty-state drawings in the live icon style, without loops (handoff <icons>, Other touches).

const LINE = 'stroke="#0E1726" stroke-width="2.4" stroke-linejoin="round"';
const CALM_SEA =
  '<svg viewBox="0 0 64 64" aria-hidden="true">' +
  `<circle cx="32" cy="25" r="12.5" fill="#F5A300"/><circle cx="30.6" cy="23.4" r="10.7" fill="#FFC233"/><circle cx="32" cy="25" r="12.5" fill="none" ${LINE}/>` +
  `<path d="M4 40q7-4 14 0t14 0 14 0 14 0v16a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill="#8FC2F5" ${LINE}/>` +
  `<path d="M4 49q7 3 14 0t14 0 14 0 14 0v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill="#3E8BE8" ${LINE}/>` +
  '</svg>';

/** "All clear": a calm sea and sun. */
export function AllClearArt() {
  return <span className="empty-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: CALM_SEA }} />;
}

/** "Add your weekly trips": the parked jeepney. */
export function JeepneyArt() {
  return (
    <span className="empty-jeep" aria-hidden="true">
      <span className="jeep-shadow" />
      <span className="jeep-body" dangerouslySetInnerHTML={{ __html: JEEP_BODY }} />
      <span className="wheel wheel-1" dangerouslySetInnerHTML={{ __html: JEEP_WHEEL }} />
      <span className="wheel wheel-2" dangerouslySetInnerHTML={{ __html: JEEP_WHEEL }} />
    </span>
  );
}
