import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-6 sm:p-8',
};

export default function Card({
  children,
  padding = 'md',
  hoverable = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`
        ${hoverable ? 'glass-card-hover' : 'glass-card'}
        ${paddingStyles[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
