import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTransactions, usePrograms, useAccounts } from '@/hooks/useSupabaseData';
import { formatCurrency, formatNumber } from '@/utils/financeLogic';
import { ArrowLeft, History, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ProgramDetails = () => {
  const { id } = useParams(); // ID do Programa
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Lê o filtro da URL (se existir)
  const urlAccountId = searchParams.get('accountId') || 'all';
  
  // Estado local para os filtros
  const [selectedAccount, setSelectedAccount] = useState(urlAccountId);
  
  // Busca dados
  const { data: transactions } = useTransactions();
  const { data: programs } = usePrograms();
  const { data: accounts } = useAccounts();

  // 1. Atualiza a URL quando muda o filtro local
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedAccount !== 'all') {
        params.set('accountId', selectedAccount);
    }
    setSearchParams(params);
  }, [selectedAccount, setSearchParams]);

  // 2. Manipula troca de Programa (navega para outra URL)
  const handleProgramChange = (newProgramId: string) => {
    let url = `/estoque/${newProgramId}`;
    if (selectedAccount !== 'all') url += `?accountId=${selectedAccount}`;
    navigate(url);
  };

  const currentProgramName = programs?.find(p => p.id === id)?.name || 'Detalhes';

  // 3. Filtra e Ordena as transações
  const history = useMemo(() => {
    if (!transactions || !id) return [];
    
    return transactions
      .filter(t => {
        const matchProgram = t.program_id === id;
        const matchAccount = selectedAccount === 'all' || t.account_id === selectedAccount;
        return matchProgram && matchAccount;
      })
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [transactions, id, selectedAccount]);

  // 4. Calcula os Totais com base no FILTRO
  const totals = useMemo(() => {
    const entradas = history.filter(t => t.quantity > 0).reduce((acc, t) => acc + t.quantity, 0);
    const saidas = history.filter(t => t.quantity < 0).reduce((acc, t) => acc + Math.abs(t.quantity), 0);
    const saldo = entradas - saidas;
    
    const custoTotalEntradas = history.filter(t => t.quantity > 0).reduce((acc, t) => acc + (t.total_cost || 0), 0);
    const cpmMedio = saldo > 0 ? (custoTotalEntradas / entradas) * 1000 : 0;

    return { entradas, saidas, saldo, cpmMedio };
  }, [history]);

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
      <div className="flex flex-col gap-6">
        
        {/* TOPO: VOLTAR + FILTROS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/estoque')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{currentProgramName}</h1>
                    <p className="text-muted-foreground text-sm">Extrato detalhado.</p>
                </div>
            </div>

            {/* ÁREA DE FILTROS */}
            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border">
                <Filter className="h-4 w-4 text-muted-foreground ml-2" />
                
                {/* Filtro de Programa */}
                <Select value={id} onValueChange={handleProgramChange}>
                    <SelectTrigger className="w-[180px] bg-background h-9">
                        <SelectValue placeholder="Programa" />
                    </SelectTrigger>
                    <SelectContent>
                        {programs?.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Filtro de Conta */}
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger className="w-[180px] bg-background h-9">
                        <SelectValue placeholder="Todas as Contas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as Contas</SelectItem>
                        {accounts?.map(a => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>

        {/* CARDS DE RESUMO (Respeitam o filtro) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Saldo no Período</CardTitle></CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(totals.saldo)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Filtrado por: {selectedAccount === 'all' ? 'Todas contas' : accounts?.find(a => a.id === selectedAccount)?.name}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">CPM Médio (Entradas)</CardTitle></CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-primary">{formatCurrency(totals.cpmMedio)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Fluxo</CardTitle></CardHeader>
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

        {/* TABELA */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4" /> Histórico de Transações
                </CardTitle>
            </CardHeader>
            <CardContent>
                {history.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                        Nenhuma movimentação encontrada com estes filtros.
                    </div>
                ) : (
                    <div className="relative overflow-x-auto rounded-md border">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Data</th>
                                    <th className="px-4 py-3 font-medium">Conta</th> {/* Coluna Nova */}
                                    <th className="px-4 py-3 font-medium">Tipo</th>
                                    <th className="px-4 py-3 font-medium text-right">Qtd</th>
                                    <th className="px-4 py-3 font-medium text-right">Custo</th>
                                    <th className="px-4 py-3 font-medium text-right">CPM Op.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((t) => {
                                    const isPositive = t.quantity > 0;
                                    const cpmOperacao = t.quantity !== 0 ? (t.total_cost / Math.abs(t.quantity)) * 1000 : 0;
                                    const accountName = accounts?.find(a => a.id === t.account_id)?.name || '-';
                                    
                                    return (
                                        <tr key={t.id} className="border-b last:border-0 hover:bg-muted/5 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {format(new Date(t.transaction_date), 'dd/MM/yyyy', { locale: ptBR })}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground font-medium">
                                                {accountName}
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
      </div>
    </MainLayout>
  );
};

export default ProgramDetails;
