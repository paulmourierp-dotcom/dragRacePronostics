"use client";
import { HTMLAttributes } from "react";

export default function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-surface border border-surface-border shadow-card rounded-card p-6 ${className}`}
      {...props}
    />
  );
}
