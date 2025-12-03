import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';

interface MilhasChartProps {
  data: { nome: string; quantidade: number }[];
  title: string;
  className?: string;
}

const COLORS = ['hsl(173, 80%, 45%)', 'hsl(190, 80%, 50%)', 'hsl(152, 69%, 45%)', 'hsl(200, 70%, 50%)'];

export const MilhasChart = ({ data, title, className }: MilhasChartProps) => {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-6 animate-fade-in', className)}>
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis 
              type="number" 
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(value) => value.toLocaleString()}
            />
            <YAxis 
              dataKey="nome" 
              type="category" 
              stroke="hsl(var(--muted-foreground))"
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
              }}
              formatter={(value: number) => [value.toLocaleString() + ' milhas', 'Quantidade']}
            />
            <Bar dataKey="quantidade" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
