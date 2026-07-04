import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        className="flex h-8 items-center gap-1 rounded border border-gray-300 bg-white px-3 text-sm hover:border-purple-400"
        onClick={() => setOpen(!open)}
      >
        <span>{selected?.label ?? placeholder ?? "Select"}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-10 mt-1 max-h-48 w-full overflow-y-auto rounded border border-gray-200 bg-white py-1 shadow-md">
          {options.map((opt) => (
            <button
              key={opt.value}
              className={`w-full px-3 py-1.5 text-left text-sm hover:bg-purple-50 ${
                opt.value === value ? "bg-purple-50 text-purple-600" : ""
              }`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
