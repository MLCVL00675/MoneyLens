import React from "react";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  variant?: "dark" | "light" | "auto";
}

export function Logo({
  size = 28,
  variant = "auto",
  className = "",
  ...props
}: LogoProps) {
  // Determine fill color based on variant
  const fillColor =
    variant === "light"
      ? "#FFFFFF"
      : variant === "dark"
      ? "#111827"
      : "currentColor";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {/* Top-Right Angular Hook */}
      <path
        d="M68 6 L84 14 L55 45 L84 60 L70 74 L37 57 L60 21 Z"
        fill={fillColor}
      />
      {/* Bottom-Left Interlocking Angular Hook */}
      <path
        d="M32 94 L16 86 L45 55 L16 40 L30 26 L63 43 L40 79 Z"
        fill={fillColor}
      />
    </svg>
  );
}
