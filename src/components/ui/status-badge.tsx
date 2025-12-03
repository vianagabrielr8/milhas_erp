import { cn } from '@/lib/utils';

type StatusType = 'pendente' | 'pago' | 'recebido' | 'vencido';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  pendente: {
    label: 'Pendente',
    className: 'bg-warning/10 text-warning border-warning/30',
  },
  pago: {
    label: 'Pago',
    className: 'bg-success/10 text-success border-success/30',
  },
  recebido: {
    label: 'Recebido',
    className: 'bg-success/10 text-success border-success/30',
  },
  vencido: {
    label: 'Vencido',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
};
