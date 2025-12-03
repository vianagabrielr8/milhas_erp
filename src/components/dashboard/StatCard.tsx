import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  className?: string;
}

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) => {
  const variantStyles = {
    default: 'bg-card border-border',
    success: 'bg-card border-success/30 glow-success',
    warning: 'bg-card border-warning/30',
    destructive: 'bg-card border-destructive/30 glow-destructive',
  };

  const iconVariantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border p-6 transition-all duration-300 hover:scale-[1.02] animate-fade-in',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-display font-bold tracking-tight text-foreground">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-lg',
            iconVariantStyles[variant]
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
      
      {/* Decorative gradient */}
      <div
        className={cn(
          'absolute -bottom-4 -right-4 h-24 w-24 rounded-full opacity-10 blur-2xl',
          variant === 'success' && 'bg-success',
          variant === 'warning' && 'bg-warning',
          variant === 'destructive' && 'bg-destructive',
          variant === 'default' && 'bg-primary'
        )}
      />
    </div>
  );
};
