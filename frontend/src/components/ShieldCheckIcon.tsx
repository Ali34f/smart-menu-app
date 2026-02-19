import React from 'react';

interface ShieldCheckIconProps {
  className?: string;
  size?: number;
}

const ShieldCheckIcon: React.FC<ShieldCheckIconProps> = ({ className = '', size = 20 }) => {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L4 5v6.09a8 8 0 0 0 5.5 7.61L12 21l2.5-1.3A8 8 0 0 0 20 11.09V5L12 2z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
};

export default ShieldCheckIcon;
