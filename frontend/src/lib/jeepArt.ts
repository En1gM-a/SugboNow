// The jeepney drawing (JEEP and WHEEL in docs/handoffs/frontend-sample.html). It faces left, has the same outline as the
// live icons, and its route sign reads TALAMBAN. The tailpipe is at (150, 53) in the 150×64 drawing.

export const JEEP_BODY =
  '<svg viewBox="0 0 150 64" aria-hidden="true"><g transform="translate(150 0) scale(-1 1)">' +
  '<rect x="10" y="7" width="96" height="7" rx="3" fill="#1E5AA8" stroke="#0E1726" stroke-width="1.8"/><rect x="78" y="0.5" width="30" height="7.5" rx="1.6" fill="#FFC233" stroke="#0E1726" stroke-width="1.8"/>' +
  '<rect x="8" y="13" width="104" height="38" rx="7" fill="#E9EEF4" stroke="#0E1726" stroke-width="1.8"/><path d="M110 22 L134 27 Q141 29 142 36 L143 50 L110 50 Z" fill="#E9EEF4" stroke="#0E1726" stroke-width="1.8"/>' +
  '<path d="M104 15 L116 15 L122 31 L104 31 Z" fill="#1F2A3A"/>' +
  '<rect x="15" y="17" width="18" height="13" rx="2.5" fill="#1F2A3A"/><rect x="37" y="17" width="18" height="13" rx="2.5" fill="#1F2A3A"/><rect x="59" y="17" width="18" height="13" rx="2.5" fill="#1F2A3A"/><rect x="81" y="17" width="18" height="13" rx="2.5" fill="#1F2A3A"/>' +
  '<rect x="17" y="18.5" width="6" height="2" rx="1" fill="#5A6B85"/>' +
  '<rect x="8" y="34" width="135" height="4.5" fill="#C8102E"/><rect x="8" y="39.5" width="135" height="3.2" fill="#FFC233"/><rect x="8" y="43.5" width="135" height="1.8" fill="#1E5AA8"/>' +
  '<rect x="137" y="33" width="6" height="11" rx="1.5" fill="#9AA7B8"/><circle cx="139.5" cy="30" r="2.6" fill="#FFE08A"/>' +
  '<rect x="5" y="49" width="142" height="4.5" rx="2" fill="#B8C2CF" stroke="#0E1726" stroke-width="1.8"/><path d="M126 22 L131 14" stroke="#B8C2CF" stroke-width="1.4" stroke-linecap="round"/>' +
  '</g>' +
  '<text x="57" y="6" font-size="4.6" font-weight="800" text-anchor="middle" fill="#0E1726" font-family="Arial, sans-serif">TALAMBAN</text>' +
  '<rect x="140" y="51.5" width="10" height="3" rx="1.2" fill="#5E6B7D" stroke="#0E1726" stroke-width="1.8"/>' +
  '</svg>';

export const JEEP_WHEEL =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9.5" fill="#141B26"/><circle cx="10" cy="10" r="4.6" fill="#C9D3DF"/><path d="M10 1.5v4M10 14.5v4M1.5 10h4M14.5 10h4" stroke="#8C99AA" stroke-width="1.6"/></svg>';

/** The whole jeepney as markup: shadow, body and two wheels. */
export const JEEP =
  `<div class="jeep"><span class="jeep-shadow"></span><span class="jeep-body">${JEEP_BODY}</span>` +
  `<span class="wheel wheel-1">${JEEP_WHEEL}</span><span class="wheel wheel-2">${JEEP_WHEEL}</span></div>`;
