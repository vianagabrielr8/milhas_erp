import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTransactions, usePrograms } from '@/hooks/useSupabaseData';
import { formatCurrency, formatNumber, formatDate } from '@/utils/financeLogic';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, History } from 'lucide-react';

const ProgramDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: transactions } = useTransactions();
  const { data: programs } = usePrograms();

  const programName = programs?.find(p => p.id === id)?.name || 'Programa';

  const history = useMemo(() => {
    if (!transactions || !id) return [];
    return transactions
      .filter(t => t.program_id === id)
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [transactions, id]);

  const totals = useMemo(() => {
    const entradas = history.filter(t => t.quantity > 0).reduce((acc, t) => acc + t.quantity, 0);
    const saidas = history.filter(t => t.quantity < 0).reduce((acc, t) => acc + Math.abs(t.quantity), 0);
    const saldo = entradas - saidas;
    const custoTotal = history.filter(t => t.quantity > 0).reduce((acc, t) => acc + (t.total_cost || 0), 0);
    const cpmMedio = saldo > 0 ? (custoTotal / saldo) * 1000 : 0;
    return { entradas, saidas, saldo, cpmMedio };
  }, [history]);

  const getTypeBadge = (type: string) => {
    const map: any = {
      'COMPRA': { l: 'Compra', c: 'bg-emerald-500/10 text-emerald-500' },
      'BONUS': { l: 'Bônus', c: 'bg-blue-500/10 text-blue-500' },
      'VENDA': { l: 'Venda', c: 'bg-red-500/10 text-red-500' },
      'TRANSF_ENTRADA': { l: 'Entrada Transf.', c: 'bg-indigo-500/10 text-indigo-500' },
      'TRANSF_SAIDA': { l: 'Saída Transf.', c: 'bg-orange-500/10 text-orange-500' },
    };
    const s = map[type] || { l: type, c: 'bg-gray-500/10 text-gray-500' };
    return <Badge variant="outline" className={s.c}>{s.l}</Badge>;
  };

  return (
    <MainLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate('/estoque')}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader title={`Extrato: ${programName}`} description="Histórico completo." className="mb-0" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Saldo Atual</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatNumber(totals.saldo)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">CPM Médio</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-primary">{formatCurrency(totals.cpmMedio)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Fluxo</CardTitle></CardHeader><CardContent className="flex justify-between text-sm"><div className="text-emerald-500 flex items-center gap-1"><ArrowUpRight className="h-4 w-4"/> {formatNumber(totals.entradas)}</div><div className="text-rose-500 flex items-center gap-1"><ArrowDownRight className="h-4 w-4"/> {formatNumber(totals.saidas)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" /> Transações</CardTitle></CardHeader>
        <CardContent>
            {history.length === 0 ? <div className="text-center py-10 text-muted-foreground">Sem dados.</div> : (
                <div className="relative overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-muted-foreground uppercase bg-muted/30"><tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3 text-right">Qtd</th><th className="px-4 py-3 text-right">Custo</th></tr></thead><tbody>{history.map(t => (<tr key={t.id} className="border-b hover:bg-muted/10"><td className="px-4 py-3">{formatDate(t.transaction_date)}</td><td className="px-4 py-3">{getTypeBadge(t.type)}</td><td className={`px-4 py-3 text-right font-bold ${t.quantity > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{t.quantity > 0 ? '+' : ''}{formatNumber(t.quantity)}</td><td className="px-4 py-3 text-right">{t.total_cost > 0 ? formatCurrency(t.total_cost) : '-'}</td></tr>))}</tbody></table></div>
            )}
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default ProgramDetails;
