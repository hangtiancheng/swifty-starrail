import { Check } from "lucide-react";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: CheckboxProps) {
  return (
    <label
      className={`flex items-center gap-2 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
          checked
            ? "border-purple-500 bg-purple-500"
            : "border-gray-400 bg-white"
        }`}
        onClick={() => !disabled && onChange(!checked)}
      >
        {checked && <Check size={12} className="text-white" />}
      </span>
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}
