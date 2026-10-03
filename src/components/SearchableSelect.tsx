import React, { useEffect, useMemo, useRef, useState } from 'react';
import './SearchableSelect.css';

export interface SearchableOption {
  value: number | string;
  label: string;
  group?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: number | string | '';
  onChange: (value: number | string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

// A select with a search box: type to filter, arrows + Enter to pick, Esc to close
const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled,
  ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const pick = (option: SearchableOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[active]) pick(filtered[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  let lastGroup: string | undefined;

  return (
    <div className={`searchable-select ${open ? 'open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="searchable-select-trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={selected ? '' : 'searchable-select-placeholder'}>{selected ? selected.label : placeholder}</span>
        <span className="searchable-select-caret">▾</span>
      </button>
      {open && (
        <div className="searchable-select-panel">
          <input
            type="search"
            className="searchable-select-search"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <ul className="searchable-select-list" role="listbox" ref={listRef}>
            {filtered.length === 0 && (
              <li className="searchable-select-empty">{query.trim() ? `No match for "${query.trim()}"` : 'Nothing to choose from'}</li>
            )}
            {filtered.map((option, index) => {
              const showGroup = option.group && option.group !== lastGroup;
              lastGroup = option.group;
              return (
                <React.Fragment key={`${option.group ?? ''}-${option.value}`}>
                  {showGroup && <li className="searchable-select-group">{option.group}</li>}
                  <li
                    role="option"
                    aria-selected={option.value === value}
                    data-index={index}
                    className={`searchable-select-option ${index === active ? 'active' : ''} ${option.value === value ? 'selected' : ''}`}
                    onMouseEnter={() => setActive(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(option);
                    }}
                  >
                    {option.label}
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
