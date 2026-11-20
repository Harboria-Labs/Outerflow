import React from 'react';

interface OuterflowMarkProps {
  size?: number;
  primaryColor?: string;
  secondaryColor?: string;
}

export const OuterflowMark: React.FC<OuterflowMarkProps> = ({
  size = 20,
  primaryColor = '#2680eb',
  secondaryColor = '#22d3ee',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="of-ring" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={secondaryColor} />
        <stop offset="100%" stopColor={primaryColor} />
      </linearGradient>
      <radialGradient id="of-core" cx="45%" cy="40%" r="55%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="45%" stopColor={secondaryColor} />
        <stop offset="100%" stopColor={primaryColor} />
      </radialGradient>
    </defs>
    <ellipse
      cx="16"
      cy="16"
      rx="13"
      ry="6.5"
      transform="rotate(-32 16 16)"
      stroke="url(#of-ring)"
      strokeWidth="2.2"
    />
    <ellipse
      cx="16"
      cy="16"
      rx="13"
      ry="6.5"
      transform="rotate(32 16 16)"
      stroke={primaryColor}
      strokeOpacity="0.65"
      strokeWidth="1.6"
    />
    <path
      d="M11.8 14.5C12.6 11.4 17.2 10.6 19.6 13.1C21.6 15.2 19.7 20.4 15.4 20.5C12.1 20.6 11 17.5 11.8 14.5Z"
      fill="url(#of-core)"
    />
  </svg>
);
