import React from 'react';
import './Surface.css';

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 'resting' | 'lifted' | 'raised' | 'modal' | 'glass';
  as?: React.ElementType;
}

export const Surface: React.FC<SurfaceProps> = ({
  children,
  elevation = 'resting',
  as: Component = 'div',
  className = '',
  ...rest
}) => {
  const classes = [
    'nw-surface',
    `nw-surface--${elevation}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
};
