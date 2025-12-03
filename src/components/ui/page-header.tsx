import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const PageHeader = ({ title, description, action, className }: PageHeaderProps) => {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8', className)}>
      <div className="space-y-1">
        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
};
