import React from 'react';
import './Tag.css';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'success' | 'danger' | 'warning';
  icon?: React.ReactNode;
}

export const Tag: React.FC<TagProps> = ({
  children,
  variant = 'default',
  icon,
  className = '',
  ...rest
}) => {
  const classes = ['nw-tag', `nw-tag--${variant}`, className].filter(Boolean).join(' ');

  return (
    <span className={classes} {...rest}>
      {icon ? <span className="nw-tag__icon">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
};
