import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReceivableInstallments } from '@/hooks/useSupabaseData';
import { formatCurrency, formatDate } from '@/utils/financeLogic';
import { format, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Filter, Calendar, ArrowUpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ContasReceber = () => {
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));
  const { data: contasReceber } = useReceivableInstallments();

  const { inicioMes, finalMes } = useMemo(() => {
    const [ano, mes] = mesSelecionado.split('-');
    const dataBase = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    dataBase.setHours(12, 0, 0, 0);
    return { inicioMes: startOfMonth(dataBase), finalMes: endOfMonth(dataBase) };
  }, [mesSelecionado]);

  const aReceberFiltrado = useMemo(() => {
    return contasReceber?.filter(c => {
        const data = new Date(c.due_date.includes('T') ? c.due_date : `${c.due_date}T12:00:00`);
        return isWithinInterval(data, { start: inicioMes, end: finalMes });
    }) || [];
  }, [contasReceber, inicioMes, finalMes]);

  const totalReceber = aReceberFiltrado.reduce((acc, c) => acc + Number(c.amount), 0);

  return (
    <MainLayout>
      <PageHeader title="Contas a Receber" description="Previsão de entradas das vendas" />

      <div className="flex items-center gap-4 mb-6 bg-muted/20 p-4 rounded-lg border border-border/50">
        <div className="flex items-center gap-2 text-muted-foreground text-sm"><Filter className="h-4 w-4" /> Período:</div>
        <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
          <SelectTrigger className="w-[200px] bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: 13 }, (_, i) => {
              const d = addMonths(subMonths(new Date(), 2), i);
              const valor = format(d, 'yyyy-MM');
              const label = format(d, 'MMMM yyyy', { locale: ptBR });
              return <SelectItem key={valor} value={valor}>{label.charAt(0).toUpperCase() + label.slice(1)}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      <Card className="mb-8 border-l-4 border-l-success">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-success">Total a Receber no Mês</CardTitle></CardHeader>
        <CardContent><div className="text-3xl font-bold">{formatCurrency(totalReceber)}</div></CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {aReceberFiltrado.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum recebimento para este mês.</p>
          ) : (
            <div className="space-y-0">
              <div className="grid grid-cols-12 text-xs text-muted-foreground font-medium px-4 pb-3 border-b uppercase tracking-wider">
                <div className="col-span-2">Data</div>
                <div className="col-span-5">Descrição</div>
                <div className="col-span-2 text-center">Parcela</div>
                <div className="col-span-3 text-right">Valor</div>
              </div>
              {aReceberFiltrado.map(conta => (
                <div key={conta.id} className="grid grid-cols-12 items-center p-4 border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <div className="col-span-2 text-sm flex items-center gap-2 font-medium">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {formatDate(conta.due_date)}
                  </div>
                  <div className="col-span-5">
                    <p className="font-medium text-sm">{conta.receivables?.description}</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <Badge variant="secondary" className="font-normal">{conta.installment_number}/{conta.receivables?.installments || 1}</Badge>
                  </div>
                  <div className="col-span-3 text-right font-bold text-sm text-success">
                    {formatCurrency(conta.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default ContasReceber;
