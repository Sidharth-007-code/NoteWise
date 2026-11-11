import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconTrailing?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  iconTrailing,
  loading = false,
  disabled,
  className = '',
  ...rest
}) => {
  const classes = [
    'nw-button',
    `nw-button--${variant}`,
    `nw-button--${size}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="nw-button__spinner" aria-hidden="true" />
      ) : icon ? (
        <span className="nw-button__icon">{icon}</span>
      ) : null}
      {children}
      {!loading && iconTrailing ? (
        <span className="nw-button__icon-trailing">{iconTrailing}</span>
      ) : null}
    </button>
  );
};
