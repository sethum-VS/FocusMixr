'use client';

const PRESET_COLORS = [
  '#3b82f6', // rain blue
  '#f97316', // fire orange
  '#22c55e', // forest green
  '#06b6d4', // ocean cyan
  '#a855f7', // violet
  '#f43f5e', // rose
];

interface AccentColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function AccentColorPicker({ value, onChange }: AccentColorPickerProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50"
          style={{
            backgroundColor: color,
            borderColor: value === color ? 'white' : 'transparent',
            boxShadow: value === color ? `0 0 8px ${color}80` : 'none',
          }}
          aria-label={`Select accent color ${color}`}
          aria-pressed={value === color}
        />
      ))}

      {/* Custom color input */}
      <label className="relative w-6 h-6 rounded-full overflow-hidden border border-white/20 hover:border-white/50 cursor-pointer transition-colors">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
            opacity: 0.7,
          }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          aria-label="Custom accent color"
        />
      </label>
    </div>
  );
}
