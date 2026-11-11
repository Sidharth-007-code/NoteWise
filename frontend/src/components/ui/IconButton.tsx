import React from 'react';
import './IconButton.css';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  size = 'md',
  active = false,
  className = '',
  ...rest
}) => {
  const classes = [
    'nw-icon-button',
    `nw-icon-button--${size}`,
    active ? 'nw-icon-button--active' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={classes}
      aria-label={label}
      title={label}
      {...rest}
    >
      {icon}
    </button>
  );
};
