import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface AccordionSectionProps {
  title: string;
  defaultOpen?: boolean;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  defaultOpen = true,
  rightAction,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="accordion-section">
      <div className="accordion-head" onClick={() => setOpen((o) => !o)}>
        <div className="accordion-head-left">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <span>{title}</span>
        </div>
        {rightAction && (
          <div onClick={(e) => e.stopPropagation()}>{rightAction}</div>
        )}
      </div>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  );
};

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  label,
  checked,
  onChange,
}) => (
  <div className="studio-toggle-row">
    <span className="studio-toggle-label">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`toggle-pill ${checked ? 'checked' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-knob" />
    </button>
  </div>
);

interface StudioSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals?: number;
  onChange: (val: number) => void;
}

export const StudioSlider: React.FC<StudioSliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  decimals = 2,
  onChange,
}) => (
  <div className="studio-slider-row">
    <span className="studio-slider-label" title={label}>
      {label}
    </span>
    <input
      type="range"
      className="studio-range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
    <span className="studio-slider-val">{value.toFixed(decimals)}</span>
  </div>
);

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  columns?: 2 | 3;
  onChange: (val: T) => void;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  columns = 2,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className={`segmented-control cols-${columns}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`seg-btn ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
