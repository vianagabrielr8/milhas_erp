import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Importamos os hooks de dados. Se der erro no useTransactions, me avise que criamos ele.
import { useTransactions, usePrograms } from '@/hooks/useSupabaseData';
import { formatCurrency, formatNumber } from '@/utils/financeLogic';
import { ArrowLeft, History, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ProgramDetails = () => {
  const { id } = useParams(); // Pega o ID da URL
  const navigate = useNavigate();
  
  // Busca dados
  const { data: transactions } = useTransactions();
  const { data: programs } = usePrograms();

  // 1. Descobre o nome do programa pelo ID
  const programName = programs?.find(p => p.id === id)?.name || 'Detalhes do Programa';

  // 2. Filtra e Ordena as transações desse programa
  const history = useMemo(() => {
    if (!transactions || !id) return [];
    
    return transactions
      .filter(t => t.program_id === id)
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [transactions, id]);

  // 3. Calcula os Totais para os Cards de Resumo
  const totals = useMemo(() => {
    const entradas = history.filter(t => t.quantity > 0).reduce((acc, t) => acc + t.quantity, 0);
    const saidas = history.filter(t => t.quantity < 0).reduce((acc, t) => acc + Math.abs(t.quantity), 0);
    const saldo = entradas - saidas;
    
    // Custo total apenas das entradas para calcular CPM
    const custoTotalEntradas = history.filter(t => t.quantity > 0).reduce((acc, t) => acc + (t.total_cost || 0), 0);
    const cpmMedio = saldo > 0 ? (custoTotalEntradas / entradas) * 1000 : 0; // CPM simples baseado nas entradas

    return { entradas, saidas, saldo, cpmMedio };
  }, [history]);

  // Função para deixar a tabela bonita (Badges coloridos)
  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'COMPRA': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'BONUS': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'VENDA': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'TRANSF_ENTRADA': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'TRANSF_SAIDA': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <MainLayout>
      {/* Cabeçalho com Botão Voltar */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate('/estoque')}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{programName}</h1>
            <p className="text-muted-foreground">Extrato completo de movimentações.</p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Saldo Atual Calculado</CardTitle></CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatNumber(totals.saldo)}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">CPM Médio (Entradas)</CardTitle></CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-primary">{formatCurrency(totals.cpmMedio)}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Fluxo Total</CardTitle></CardHeader>
            <CardContent className="flex justify-between text-sm items-center h-8">
                <div className="text-emerald-500 flex items-center gap-1 font-medium">
                    <ArrowUpRight className="h-4 w-4"/> {formatNumber(totals.entradas)}
                </div>
                <div className="h-4 w-px bg-border"></div>
                <div className="text-rose-500 flex items-center gap-1 font-medium">
                    <ArrowDownRight className="h-4 w-4"/> {formatNumber(totals.saidas)}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Tabela de Extrato */}
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" /> Histórico de Transações
            </CardTitle>
        </CardHeader>
        <CardContent>
            {history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                    Nenhuma movimentação encontrada para este programa.
                </div>
            ) : (
                <div className="relative overflow-x-auto rounded-md border">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 font-medium">Data</th>
                                <th className="px-4 py-3 font-medium">Tipo</th>
                                <th className="px-4 py-3 font-medium text-right">Quantidade</th>
                                <th className="px-4 py-3 font-medium text-right">Custo Total</th>
                                <th className="px-4 py-3 font-medium text-right">CPM Operação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((t) => {
                                const isPositive = t.quantity > 0;
                                const cpmOperacao = t.quantity !== 0 ? (t.total_cost / Math.abs(t.quantity)) * 1000 : 0;
                                
                                return (
                                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/5 transition-colors">
                                        <td className="px-4 py-3">
                                            {format(new Date(t.transaction_date), 'dd/MM/yyyy', { locale: ptBR })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className={getTypeStyle(t.type)}>
                                                {t.type}
                                            </Badge>
                                        </td>
                                        <td className={`px-4 py-3 text-right font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {isPositive ? '+' : ''}{formatNumber(t.quantity)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted-foreground">
                                            {t.total_cost > 0 ? formatCurrency(t.total_cost) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                                            {t.total_cost > 0 ? formatCurrency(cpmOperacao) : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default ProgramDetails;
