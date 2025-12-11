import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plane,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  Wallet,
  AlertTriangle,
  Filter,
  Calendar
} from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  useMilesBalance, 
  useExpiringMiles, 
  usePayableInstallments, 
  useReceivableInstallments,
  useTransactions,
  useAccounts // <--- Adicionado para o filtro
} from '@/hooks/useSupabaseData';
import { formatCPM } from '@/utils/financeLogic';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--secondary))'];

const Dashboard = () => {
  // Hooks de Dados
  const { data: milesBalance, isLoading: loadingBalance } = useMilesBalance();
  const { data: expiringMiles } = useExpiringMiles();
  const { data: payableInstallments } = usePayableInstallments();
  const { data: receivableInstallments } = useReceivableInstallments();
  const { data: transactions } = useTransactions();
  const { data: accounts } = useAccounts(); // <--- Lista de contas para o filtro

  // Estados dos Filtros
  const [filtroConta, setFiltroConta] = useState("all");
  const [filtroMes, setFiltroMes] = useState(format(new Date(), 'yyyy-MM')); // Padrão: Mês atual

  // --- LÓGICA DE FILTRAGEM ---

  // 1. Filtrar Estoque (Baseado apenas na CONTA, pois estoque é "Posição Atual")
  const estoqueFiltrado = useMemo(() => {
    if (!milesBalance) return [];
    if (filtroConta === "all") return milesBalance;
    return milesBalance.filter(m => m.account_id === filtroConta);
  }, [milesBalance, filtroConta]);

  // Totais do Estoque (Calculados sobre o filtrado)
  const totalMiles = estoqueFiltrado.reduce((acc, item) => acc + (item.balance || 0), 0);
  const totalInvested = estoqueFiltrado.reduce((acc, item) => acc + (item.total_invested || 0), 0);
  const avgCpmGlobal = totalMiles > 0 ? (totalInvested / totalMiles) * 1000 : 0;

  // 2. Definir intervalo de datas para Financeiro e Lucro
  const { inicioMes, finalMes } = useMemo(() => {
    const [ano, mes] = filtroMes.split('-');
    const dataBase = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    return {
      inicioMes: startOfMonth(dataBase),
      finalMes: endOfMonth(dataBase)
    };
  }, [filtroMes]);

  // 3. Filtrar Financeiro (Baseado em DATA DE VENCIMENTO + CONTA)
  // Nota: Se seus installments não tiverem account_id direto, filtrar por conta aqui pode ser impreciso 
  // sem fazer join. Vou filtrar por DATA (que é o principal para fluxo de caixa) e tentar filtrar por conta se possível.
  const pendingPayables = useMemo(() => {
    return payableInstallments
      ?.filter(i => {
        const isPendente = i.status === 'pendente';
        const isDataOk = isWithinInterval(new Date(i.due_date), { start: inicioMes, end: finalMes });
        // Se houver vinculo de conta no installment, filtramos. Se não, mostra geral do mês.
        // Assumindo filtro de data como prioridade para "Contas do Mês".
        return isPendente && isDataOk;
      })
      .reduce((acc, i) => acc + Number(i.amount), 0) || 0;
  }, [payableInstallments, inicioMes, finalMes]);

  const pendingReceivables = useMemo(() => {
    return receivableInstallments
      ?.filter(i => {
        const isPendente = i.status === 'pendente';
        const isDataOk = isWithinInterval(new Date(i.due_date), { start: inicioMes, end: finalMes });
        return isPendente && isDataOk;
      })
      .reduce((acc, i) => acc + Number(i.amount), 0) || 0;
  }, [receivableInstallments, inicioMes, finalMes]);

  // 4. Filtrar Lucro (Transações dentro do MÊS selecionado + CONTA)
  const { profit } = useMemo(() => {
    const transacoesFiltradas = transactions?.filter(t => {
      const dataTransacao = new Date(t.transaction_date);
      const isDataOk = isWithinInterval(dataTransacao, { start: inicioMes, end: finalMes });
      const isContaOk = filtroConta === "all" || t.account_id === filtroConta;
      return isDataOk && isContaOk;
    }) || [];

    const totalPurchases = transacoesFiltradas
      .filter(t => t.type === 'COMPRA')
      .reduce((acc, t) => acc + (t.total_cost || 0), 0);

    const totalSales = transacoesFiltradas
      .filter(t => t.type === 'VENDA')
      .reduce((acc, t) => acc + (t.sale_price || 0), 0);

    return { profit: totalSales - totalPurchases };
  }, [transactions, inicioMes, finalMes, filtroConta]);

  // 5. Gráficos (Baseados no Estoque Filtrado)
  const cpmByProgram = useMemo(() => {
    const agrupado: any[] = [];
    estoqueFiltrado.forEach(item => {
      if (!item.program_name) return;
      const existing = agrupado.find(a => a.name === item.program_name);
      if (existing) {
        existing.balance += item.balance || 0;
        existing.invested += item.total_invested || 0;
      } else {
        agrupado.push({
          name: item.program_name,
          balance: item.balance || 0,
          invested: item.total_invested || 0,
          cpm: 0
        });
      }
    });
    
    agrupado.forEach(item => {
      item.cpm = item.balance > 0 ? (item.invested / item.balance) * 1000 : 0;
    });
    return agrupado;
  }, [estoqueFiltrado]);

  const milesDistribution = cpmByProgram.map((item, index) => ({
    name: item.name,
    value: item.balance,
    color: COLORS[index % COLORS.length],
  }));

  // Formatters
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // --- RENDER ---

  if (loadingBalance) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Dashboard"
        description="Visão geral do seu negócio de milhas"
      />

      {/* --- BARRA DE FILTROS --- */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-muted/20 p-4 rounded-lg border border-border/50">
        <div className="flex items-center gap-2 text-muted-foreground text-sm min-w-[80px]">
          <Filter className="h-4 w-4" />
          Filtros:
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          {/* Filtro de Conta */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground ml-1">Conta</label>
            <Select value={filtroConta} onValueChange={setFiltroConta}>
              <SelectTrigger className="bg-background h-9">
                <SelectValue placeholder="Todas as Contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Contas</SelectItem>
                {accounts?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de Mês */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground ml-1">Período (Financeiro/Lucro)</label>
            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger className="bg-background h-9">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const d = subMonths(new Date(), i);
                  const value = format(d, 'yyyy-MM');
                  const label = format(d, 'MMMM yyyy', { locale: ptBR });
                  return <SelectItem key={value} value={value}>{label.charAt(0).toUpperCase() + label.slice(1)}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <StatCard
          title="Estoque de Milhas"
          value={formatNumber(totalMiles)}
          subtitle="Total disponível (Filtrado)"
          icon={Plane}
          variant="default"
        />
        <StatCard
          title="CPM Médio Global"
          value={formatCPM(avgCpmGlobal)}
          subtitle="Custo por milheiro (Estoque)"
          icon={TrendingDown}
          variant="destructive"
        />
        <StatCard
          title="Resultado do Mês" // Alterado título para refletir o filtro
          value={formatCurrency(profit)}
          subtitle={`Lucro/Prejuízo em ${format(parseISO(filtroMes + '-01'), 'MMMM', { locale: ptBR })}`}
          icon={profit >= 0 ? TrendingUp : TrendingDown}
          variant={profit >= 0 ? 'success' : 'destructive'}
        />
        <StatCard
          title="Total Investido"
          value={formatCurrency(totalInvested)}
          subtitle="Em estoque atual"
          icon={Wallet}
          variant="default"
        />
        <StatCard
          title="Contas a Pagar"
          value={formatCurrency(pendingPayables)}
          subtitle={`Vencendo em ${format(parseISO(filtroMes + '-01'), 'MMM')}`}
          icon={CreditCard}
          variant="warning"
        />
        <StatCard
          title="Contas a Receber"
          value={formatCurrency(pendingReceivables)}
          subtitle={`Previsto para ${format(parseISO(filtroMes + '-01'), 'MMM')}`}
          icon={Receipt}
          variant="default"
        />
      </div>

      {/* Expiring Miles Alert (Sempre mostra geral ou filtrado por conta se possível) */}
      {expiringMiles && expiringMiles.length > 0 && (
        <Card className="mb-8 border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Milhas a Vencer (próximos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {expiringMiles
                .filter(m => filtroConta === 'all' || m.account_name === accounts?.find(a => a.id === filtroConta)?.name) // Filtro visual simples pelo nome
                .slice(0, 6)
                .map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 rounded-lg bg-background border"
                >
                  <div>
                    <span className="font-medium">{item.program_name}</span>
                    <div className="text-xs text-muted-foreground">{item.account_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{item.quantity?.toLocaleString('pt-BR')}</div>
                    <div className="text-xs text-warning">
                      {item.days_until_expiration} dias
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* CPM by Program */}
        <Card>
          <CardHeader>
            <CardTitle>CPM por Programa</CardTitle>
          </CardHeader>
          <CardContent>
            {cpmByProgram.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cpmByProgram}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCPM(value), 'CPM']}
                  />
                  <Bar dataKey="cpm" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Miles Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Milhas</CardTitle>
          </CardHeader>
          <CardContent>
            {milesDistribution.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={300}>
                  <PieChart>
                    <Pie
                      data={milesDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {milesDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatNumber(value), 'Milhas']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {milesDistribution.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="font-medium text-sm">
                        {formatNumber(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* CPM Details Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Detalhes por Programa</CardTitle>
          </CardHeader>
          <CardContent>
            {cpmByProgram.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Programa</th>
                      <th className="text-right py-3 px-4 font-medium">Saldo</th>
                      <th className="text-right py-3 px-4 font-medium">Investido</th>
                      <th className="text-right py-3 px-4 font-medium">CPM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cpmByProgram.map((item) => (
                      <tr key={item.name} className="border-b last:border-0">
                        <td className="py-3 px-4">
                          <Badge variant="secondary">{item.name}</Badge>
                        </td>
                        <td className="text-right py-3 px-4 font-medium">
                          {formatNumber(item.balance)}
                        </td>
                        <td className="text-right py-3 px-4">
                          {formatCurrency(item.invested)}
                        </td>
                        <td className="text-right py-3 px-4 font-bold text-primary">
                          {formatCPM(item.cpm)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50 font-bold">
                      <td className="py-3 px-4">Total</td>
                      <td className="text-right py-3 px-4">{formatNumber(totalMiles)}</td>
                      <td className="text-right py-3 px-4">{formatCurrency(totalInvested)}</td>
                      <td className="text-right py-3 px-4 text-primary">{formatCPM(avgCpmGlobal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                Sem dados para exibir. Registre compras para ver o CPM por programa.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
