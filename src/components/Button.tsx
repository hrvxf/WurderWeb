import Link from "next/link";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "ghost" | "glass";

type BaseProps = {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  onClick?: () => void;
};

type ActionButtonProps = BaseProps & {
  href?: undefined;
  type?: "button" | "submit" | "reset";
};

type LinkButtonProps = BaseProps & {
  href: string;
  type?: never;
};

type ButtonProps = ActionButtonProps | LinkButtonProps;

function getVariantClasses(variant: ButtonVariant): string {
  switch (variant) {
    case "ghost":
      return "bg-transparent border border-white/30 hover:bg-white/10 text-white";
    case "glass":
      return "bg-white/10 border border-white/20 hover:bg-white/15 text-white backdrop-blur";
    default:
      return "bg-gradient-to-r from-[#C7355D] to-[#8E1F45] hover:from-[#D96A5A] hover:to-[#C7355D] text-white";
  }
}

export default function Button({
  href,
  children,
  onClick,
  className = "",
  fullWidth = false,
  disabled = false,
  variant = "primary",
  type = "button",
}: ButtonProps) {
  const baseClasses = [
    fullWidth ? "w-full" : "",
    "inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm sm:text-base font-semibold",
    "transition disabled:opacity-50 disabled:cursor-not-allowed",
    getVariantClasses(variant),
    className,
  ]
    .join(" ")
    .trim();

  if (href) {
    return (
      <Link href={href} className={baseClasses} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={baseClasses} disabled={disabled}>
      {children}
    </button>
  );
}


