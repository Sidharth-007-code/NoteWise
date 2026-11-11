import React from 'react';
import './EmptyState.css';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`nw-empty-state ${className}`}>
      {icon ? <div className="nw-empty-state__icon">{icon}</div> : null}
      <h3 className="nw-empty-state__title">{title}</h3>
      {description ? <p className="nw-empty-state__description">{description}</p> : null}
      {action ? <div className="nw-empty-state__action">{action}</div> : null}
    </div>
  );
};
