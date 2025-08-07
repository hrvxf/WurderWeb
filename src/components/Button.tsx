"use client";

import Link from "next/link";

interface ButtonProps {
  href?: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset"; // <-- Added this
}

export default function Button({
  href,
  children,
  onClick,
  className = "",
  fullWidth = false,
  disabled = false,
  type = "button", // <-- Default to "button" so forms don’t auto-submit
}: ButtonProps) {
  const baseClasses = `
    ${fullWidth ? "w-full" : ""}
    px-6 py-3 rounded-lg shadow text-white text-lg font-semibold 
    bg-gradient-to-r from-yellow-500 to-red-600 
    hover:opacity-90 transition
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  if (href) {
    return (
      <Link href={href}>
        <button className={`${baseClasses} ${className}`} disabled={disabled}>
          {children}
        </button>
      </Link>
    );
  }

  return (
    <button
      type={type} // <-- Pass type to button
      onClick={onClick}
      className={`${baseClasses} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
