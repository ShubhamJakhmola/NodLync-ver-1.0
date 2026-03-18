import { useEffect, useRef } from "react";

interface IndeterminateCheckboxProps {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  ariaLabel: string;
  className?: string;
}

const IndeterminateCheckbox = ({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
  className,
}: IndeterminateCheckboxProps) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
      className={className ?? "h-4 w-4 accent-primary"}
    />
  );
};

export default IndeterminateCheckbox;

