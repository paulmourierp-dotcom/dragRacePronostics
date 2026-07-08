"use client";
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "btn-elevated bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-500/20",
  secondary:
    "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1 text-sm rounded-lg",
  md: "px-4 py-2 rounded-xl",
  lg: "w-full py-4 rounded-xl text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`font-bold transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    />
  );
}
