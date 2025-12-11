import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { usePayableInstallments, useReceivableInstallments } from '@/hooks/useSupabaseData';
import { formatCurrency, formatDate } from '@/utils/financeLogic';
import { format, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Check, X, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Financeiro = () => {
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: contasPagar } = usePayableInstallments();
  const { data: contasReceber } = useReceivableInstallments();

  // --- FILTRAGEM RIGOROSA DO MÊS ---
  const { inicioMes, finalMes } = useMemo(() => {
    const [ano, mes] = mesSelecionado.split('-');
    const dataBase = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    // Usamos hora 12:00 para evitar problemas de fuso na comparação
    dataBase.setHours(12, 0, 0, 0);
    return {
      inicioMes: startOfMonth(dataBase),
      finalMes: endOfMonth(dataBase)
    };
  }, [mesSelecionado]);

  // Função auxiliar para verificar se a data cai no mês
  const pertenceAoMes = (dataString: string) => {
    if (!dataString) return false;
    // Adiciona T12:00:00 para garantir leitura correta
    const data = new Date(dataString.includes('T') ? dataString : `${dataString}T12:00:00`);
    return isWithinInterval(data, { start: inicioMes, end: finalMes });
  };

  const aPagarFiltrado = useMemo(() => {
    return contasPagar?.filter(c => pertenceAoMes(c.due_date)) || [];
  }, [contasPagar, mesSelecionado]);

  const aReceberFiltrado = useMemo(() => {
    return contasReceber?.filter(c => pertenceAoMes(c.due_date)) || [];
  }, [contasReceber, mesSelecionado]);

  // Totais do Mês
  const totalPagar = aPagarFiltrado.reduce((acc, c) => acc + Number(c.amount), 0);
  const totalReceber = aReceberFiltrado.reduce((acc, c) => acc + Number(c.amount), 0);
  const saldoMes = totalReceber - totalPagar;

  return (
    <MainLayout>
      <PageHeader 
        title="Fluxo de Caixa" 
        description="Gestão de contas a pagar e receber"
        action={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Lançamento
          </Button>
        }
      />

      {/* --- BARRA DE FILTROS --- */}
      <div className="flex items-center gap-4 mb-6 bg-muted/20 p-4 rounded-lg border border-border/50">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Filter className="h-4 w-4" /> Período:
        </div>
        <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
          <SelectTrigger className="w-[200px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 13 }, (_, i) => {
              const d = addMonths(subMonths(new Date(), 2), i); // Mostra 2 meses atrás até 10 meses na frente
              const valor = format(d, 'yyyy-MM');
              const label = format(d, 'MMMM yyyy', { locale: ptBR });
              return <SelectItem key={valor} value={valor}>{label.charAt(0).toUpperCase() + label.slice(1)}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      {/* --- CARDS RESUMO --- */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-destructive">A Pagar</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalPagar)}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-success">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-success">A Receber</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalReceber)}</div></CardContent>
        </Card>
        <Card className={`border-l-4 ${saldoMes >= 0 ? 'border-l-primary' : 'border-l-warning'}`}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Saldo do Mês</CardTitle></CardHeader>
          <CardContent><div className={`text-2xl font-bold ${saldoMes >= 0 ? 'text-primary' : 'text-warning'}`}>{formatCurrency(saldoMes)}</div></CardContent>
        </Card>
      </div>

      {/* --- TABELAS --- */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* TABELA A PAGAR */}
        <Card>
          <CardHeader><CardTitle className="text-destructive">Contas a Pagar</CardTitle></CardHeader>
          <CardContent>
            {aPagarFiltrado.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhuma conta para este mês.</p>
            ) : (
              <div className="space-y-4">
                {aPagarFiltrado.map(conta => (
                  <div key={conta.id} className="flex justify-between items-center p-3 border rounded-lg bg-background">
                    <div>
                      <p className="font-medium text-sm">{conta.payables?.description}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{formatDate(conta.due_date)}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{conta.installment_number}ª Parc</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">{formatCurrency(conta.amount)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{conta.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* TABELA A RECEBER */}
        <Card>
          <CardHeader><CardTitle className="text-success">Contas a Receber</CardTitle></CardHeader>
          <CardContent>
            {aReceberFiltrado.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhum recebimento para este mês.</p>
            ) : (
              <div className="space-y-4">
                {aReceberFiltrado.map(conta => (
                  <div key={conta.id} className="flex justify-between items-center p-3 border rounded-lg bg-background">
                    <div>
                      <p className="font-medium text-sm">{conta.receivables?.description}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{formatDate(conta.due_date)}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{conta.installment_number}ª Parc</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">{formatCurrency(conta.amount)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{conta.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TransactionModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </MainLayout>
  );
};

export default Financeiro;
