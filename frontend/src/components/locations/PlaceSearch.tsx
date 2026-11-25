// A search box over the pin map: type a street, barangay or landmark, choose one, and the pin goes there. It follows the
// ARIA combobox pattern: focus stays in the input, arrow keys move through the list, Enter chooses and Escape closes.

import { useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/icons/Icon';
import { usePlaceSearch } from '@/hooks/usePlaceSearch';
import type { PlaceResult } from '@/lib/placeSearch';

interface PlaceSearchProps {
  id: string;
  /** Matches with equal names are listed nearest to this point first. */
  near: { lat: number; lng: number };
  onPick: (place: PlaceResult) => void;
}

const MIN_LETTERS = 2;

export function PlaceSearch({ id, near, onPick }: PlaceSearchProps) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [wanted, setWanted] = useState(false);
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const { results, ready, failed, retry } = usePlaceSearch(text, near, wanted);

  const typed = text.trim().length >= MIN_LETTERS;
  const showList = open && typed && results.length > 0;
  const current = Math.min(active, results.length - 1);
  const optionId = (i: number) => `${id}-option-${i}`;

  let note = '';
  if (open && typed && results.length === 0) {
    if (failed) note = "Search isn't loading. Check your connection, or tap the map instead.";
    else if (!ready) note = 'Loading places…';
    else note = 'No match in Cebu. Try a nearby street, barangay or landmark.';
  }

  function choose(place: PlaceResult) {
    setText(place.name);
    setOpen(false);
    setPicked(`Pin moved to ${place.name}.`);
    onPick(place);
  }

  function clear() {
    setText('');
    setOpen(false);
    setPicked('');
    input.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      // Never submits the form: Enter here means "go there", not "save the place".
      e.preventDefault();
      // Not while the list still shows matches for the letters before the last key.
      if (showList && ready) choose(results[current]);
      else setOpen(true);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!showList) {
        setOpen(true);
        setActive(0);
        return;
      }
      const step = e.key === 'ArrowDown' ? 1 : -1;
      const next = (current + step + results.length) % results.length;
      setActive(next);
      list.current?.children[next]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Escape' && open && typed) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div className="field place-search">
      <div className="field-top">
        <label htmlFor={id}>Search the map</label>
      </div>
      <div className="place-search-box">
        <Icon name="magnifying-glass" />
        <input
          ref={input}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-activedescendant={showList ? optionId(current) : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={100}
          placeholder="Street, barangay or landmark"
          value={text}
          onFocus={() => {
            setWanted(true);
            if (failed) retry();
          }}
          onChange={(e) => {
            setText(e.target.value);
            setActive(0);
            setPicked('');
            setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {text && (
          <button
            type="button"
            className="place-search-clear"
            aria-label="Clear the search"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clear}
          >
            <Icon name="x" />
          </button>
        )}
        {/* Pressing a row or the scrollbar must not blur the input, which would close the list before the click lands. */}
        <ul
          ref={list}
          id={`${id}-list`}
          className="place-search-list"
          role="listbox"
          aria-label="Matching places"
          hidden={!showList}
          onMouseDown={(e) => e.preventDefault()}
        >
          {results.map((place, i) => (
            <li
              key={`${place.kind}|${place.name}|${place.lat}|${place.lng}`}
              id={optionId(i)}
              role="option"
              aria-selected={i === current}
              className="place-search-option"
              onClick={() => choose(place)}
            >
              <b>{place.name}</b>
              {place.context && <span>{place.context}</span>}
            </li>
          ))}
        </ul>
        {note && <p className="place-search-list place-search-note">{note}</p>}
      </div>
      <span className="sr-only" role="status" aria-atomic="true">
        {note ||
          picked ||
          (showList ? `${results.length} ${results.length === 1 ? 'place' : 'places'} found.` : '')}
      </span>
    </div>
  );
}
