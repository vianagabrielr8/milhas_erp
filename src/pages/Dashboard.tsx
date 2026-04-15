import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Plane,
  TrendingDown,
  CreditCard,
  Wallet,
  Filter,
  ShieldCheck,
  BarChart3,
  ArrowUpRight,
  Banknote,
  Target,
  Percent,
  TrendingUp,
  CalendarDays
} from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

// NOVOS IMPORTS PARA O CALENDÁRIO (UX)
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

import { 
  useMilesBalance, 
  usePayableInstallments, 
  useReceivableInstallments,
  useTransactions,
  useAccounts,
  useSales
} from '@/hooks/useSupabaseData';
import { formatCPM } from '@/utils/financeLogic';
import { format, addMonths, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Area, ComposedChart, Line 
} from 'recharts';

const MARKET_PRICES: Record<string, number> = {
  'LATAM PASS': 25.50,
  'SMILES': 15.50,
  'ESFERA': 30.00,
  'LIVELO': 35.00,
  'AZUL': 21.00,
  'C6 BANK': 35.00,
  'ITAU': 35.00
};

const Dashboard = () => {
  const { data: milesBalance, isLoading: loadingBalance } = useMilesBalance();
  const { data: payableInstallments } = usePayableInstallments();
  const { data: receivableInstallments } = useReceivableInstallments();
  const { data: transactions } = useTransactions();
  const { data: accounts } = useAccounts();
  const { data: vendasData } = useSales(); 

  // --- ESTADOS DOS FILTROS ---
  const [filtroConta, setFiltroConta] = useState("all");
  // Agora os estados de data guardam um objeto Date real (melhor para o Calendário)
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();

  // --- 1. LÓGICA DE PATRIMÔNIO E MERCADO (GLOBAL) ---
  const { totalMiles, totalInvested, marketValue, avgCpmGlobal } = useMemo(() => {
    if (!milesBalance) return { totalMiles: 0, totalInvested: 0, marketValue: 0, avgCpmGlobal: 0 };
    
    const filtered = filtroConta === "all" ? milesBalance : milesBalance.filter(m => m.account_id === filtroConta);
    
    const miles = filtered.reduce((acc, item) => acc + (item.balance || 0), 0);
    const invested = filtered.reduce((acc, item) => acc + (item.total_invested || 0), 0);
    const market = filtered.reduce((acc, item) => {
      const price = MARKET_PRICES[item.program_name?.toUpperCase() || ''] || 0;
      return acc + ((item.balance || 0) / 1000 * price);
    }, 0);

    return {
      totalMiles: miles,
      totalInvested: invested,
      marketValue: market,
      avgCpmGlobal: miles > 0 ? (invested / miles) * 1000 : 0
    };
  }, [milesBalance, filtroConta]);

  // --- 2. LÓGICA DE ENDIVIDAMENTO (GLOBAL) ---
  const { totalPayableAllTime, totalReceivableAllTime } = useMemo(() => {
    const pay = payableInstallments?.filter(i => i.status === 'pendente').reduce((acc, i) => acc + Number(i.amount), 0) || 0;
    const rec = receivableInstallments?.filter(i => i.status === 'pendente').reduce((acc, i) => acc + Number(i.amount), 0) || 0;
    return { totalPayableAllTime: pay, totalReceivableAllTime: rec };
  }, [payableInstallments, receivableInstallments]);

  const equity = (marketValue + totalReceivableAllTime) - totalPayableAllTime;
  const coverageIndex = totalPayableAllTime > 0 ? marketValue / totalPayableAllTime : 0;

  // --- 3. LÓGICA DE PERFORMANCE DE VENDAS (COM FILTRO DE DATA) ---
  const { receitaTotal, custoVendas, lucroOperacional, cpmVendido, cpmCustoVenda, margemLucro, spread } = useMemo(() => {
    if (!vendasData) return { receitaTotal: 0, custoVendas: 0, lucroOperacional: 0, cpmVendido: 0, cpmCustoVenda: 0, margemLucro: 0, spread: 0 };

    let vendasFiltradas = filtroConta === "all" ? vendasData : vendasData.filter(v => v.account_id === filtroConta);

    // Converte as datas selecionadas para o formato YYYY-MM-DD para comparar com o banco
    const dataInicioStr = dataInicio ? format(dataInicio, 'yyyy-MM-dd') : null;
    const dataFimStr = dataFim ? format(dataFim, 'yyyy-MM-dd') : null;

    if (dataInicioStr) {
        vendasFiltradas = vendasFiltradas.filter(v => v.transaction_date >= dataInicioStr);
    }
    if (dataFimStr) {
        vendasFiltradas = vendasFiltradas.filter(v => v.transaction_date <= dataFimStr);
    }

    let receita = 0;
    let custo = 0;
    let milhas = 0;

    vendasFiltradas.forEach(v => {
        const receitaVenda = v.receivables?.[0]?.total_amount || v.sale_price || 0;
        receita += Number(receitaVenda);
        custo += Number(v.total_cost || 0); 
        milhas += Math.abs(Number(v.quantity || 0));
    });

    const lucro = receita - custo;
    const margem = receita > 0 ? (lucro / receita) * 100 : 0;
    const cpmVenda = milhas > 0 ? (receita / (milhas / 1000)) : 0;
    const cpmCusto = milhas > 0 ? (custo / (milhas / 1000)) : 0;
    const calculoSpread = cpmVenda - cpmCusto;

    return { 
        receitaTotal: receita, 
        custoVendas: custo, 
        lucroOperacional: lucro, 
        cpmVendido: cpmVenda, 
        cpmCustoVenda: cpmCusto, 
        margemLucro: margem,
        spread: calculoSpread
    };
  }, [vendasData, filtroConta, dataInicio, dataFim]);

  // --- 4. DADOS DO GRÁFICO: PERFORMANCE DE VENDAS ---
  const salesChartData = useMemo(() => {
    if (!vendasData) return [];
    
    let baseData = filtroConta === "all" ? vendasData : vendasData.filter(v => v.account_id === filtroConta);
    
    const dataInicioStr = dataInicio ? format(dataInicio, 'yyyy-MM-dd') : null;
    const dataFimStr = dataFim ? format(dataFim, 'yyyy-MM-dd') : null;

    if (dataInicioStr) baseData = baseData.filter(v => v.transaction_date >= dataInicioStr);
    if (dataFimStr) baseData = baseData.filter(v => v.transaction_date <= dataFimStr);

    const grouped: Record<string, any> = {};
    
    baseData.forEach(v => {
        const monthKey = v.transaction_date.substring(0, 7); 
        if (!grouped[monthKey]) {
            grouped[monthKey] = { key: monthKey, receita: 0, custo: 0, lucro: 0 };
        }
        const rec = Number(v.receivables?.[0]?.total_amount || v.sale_price || 0);
        const cust = Number(v.total_cost || 0);
        grouped[monthKey].receita += rec;
        grouped[monthKey].custo += cust;
        grouped[monthKey].lucro += (rec - cust);
    });

    return Object.values(grouped).sort((a, b) => a.key.localeCompare(b.key)).map(item => ({
        ...item,
        label: format(new Date(`${item.key}-15T12:00:00`), 'MMM/yy', { locale: ptBR })
    }));
  }, [vendasData, filtroConta, dataInicio, dataFim]);

  // --- 5. DADOS DO GRÁFICO: FLUXO DE CAIXA ---
  const cashFlowData = useMemo(() => {
    const months = [];
    const currentDate = new Date();
    const startDate = new Date(2026, 0, 1);
    const diffMonths = differenceInMonths(startDate, currentDate);

    for (let i = diffMonths; i <= 4; i++) {
      const date = addMonths(currentDate, i);
      months.push({
        label: format(date, 'MMM/yy', { locale: ptBR }), 
        key: format(date, 'yyyy-MM'),
        entradas: 0,
        saidas: 0,
        saldo: 0
      });
    }

    payableInstallments?.forEach(i => {
      const monthKey = i.due_date.substring(0, 7);
      const month = months.find(m => m.key === monthKey);
      if (month) month.saidas += Number(i.amount);
    });

    receivableInstallments?.forEach(i => {
      const monthKey = i.due_date.substring(0, 7);
      const month = months.find(m => m.key === monthKey);
      if (month) month.entradas += Number(i.amount);
    });

    let accum = 0;
    return months.map(m => {
      accum += (m.entradas - m.saidas);
      return { ...m, saldo: accum };
    });
  }, [payableInstallments, receivableInstallments]);

  // --- 6. CPM POR PROGRAMA ---
  const cpmByProgram = useMemo(() => {
    const agrupado: any[] = [];
    const base = filtroConta === "all" ? milesBalance : milesBalance?.filter(m => m.account_id === filtroConta);
    
    base?.forEach(item => {
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
        });
      }
    });
    
    return agrupado.map(item => ({
      ...item,
      cpm: item.balance > 0 ? (item.invested / item.balance) * 1000 : 0
    }));
  }, [milesBalance, filtroConta]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value);

  const limparFiltroData = () => {
      setDataInicio(undefined);
      setDataFim(undefined);
  };

  if (loadingBalance) return <MainLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div></MainLayout>;

  return (
    <MainLayout>
      <PageHeader title="Dashboard Estratégico" description="Visão de patrimônio, fluxo de caixa e resultados operacionais" />

      {/* --- BARRA DE FILTROS --- */}
      <div className="flex flex-col md:flex-row gap-6 mb-6 bg-muted/20 p-4 rounded-lg border border-border/50 md:items-end">
        <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Filter className="h-3 w-3" /> Conta</Label>
            <Select value={filtroConta} onValueChange={setFiltroConta}>
            <SelectTrigger className="w-full md:w-[220px] bg-background"><SelectValue placeholder="Todas as Contas" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todas as Contas</SelectItem>
                {accounts?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
            </Select>
        </div>

        <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Período (Para Vendas)</Label>
            <div className="flex items-center gap-2">
                
                {/* DATE PICKER INÍCIO */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={`w-[140px] justify-start text-left font-normal bg-background ${!dataInicio && "text-muted-foreground"}`}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {dataInicio ? format(dataInicio, "dd/MM/yyyy") : <span>Data Inicial</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataInicio}
                      onSelect={setDataInicio}
                      locale={ptBR}
                      initialFocus
                      captionLayout="dropdown-buttons"
                      fromYear={2020}
                      toYear={2035}
                    />
                  </PopoverContent>
                </Popover>

                <span className="text-muted-foreground text-sm">até</span>

                {/* DATE PICKER FIM */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={`w-[140px] justify-start text-left font-normal bg-background ${!dataFim && "text-muted-foreground"}`}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {dataFim ? format(dataFim, "dd/MM/yyyy") : <span>Data Final</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataFim}
                      onSelect={setDataFim}
                      locale={ptBR}
                      initialFocus
                      captionLayout="dropdown-buttons"
                      fromYear={2020}
                      toYear={2035}
                    />
                  </PopoverContent>
                </Popover>

            </div>
        </div>

        {(dataInicio || dataFim) && (
            <Button variant="ghost" size="sm" onClick={limparFiltroData} className="text-xs text-muted-foreground hover:text-destructive">
                Limpar Datas
            </Button>
        )}
      </div>

      {/* BLOCO 1: CAIXA E MERCADO */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Patrimônio Líquido (Equity)"
          value={formatCurrency(equity)}
          subtitle="Valor Real do Negócio"
          icon={ShieldCheck}
          variant={equity >= 0 ? 'success' : 'destructive'}
        />
        <StatCard
          title="Valor de Mercado"
          value={formatCurrency(marketValue)}
          subtitle="Potencial de Venda Hoje"
          icon={ArrowUpRight}
          variant="default"
        />
        <StatCard
          title="Dívida Total"
          value={formatCurrency(totalPayableAllTime)}
          subtitle="Contas a Pagar (Total)"
          icon={CreditCard}
          variant="warning"
        />
        <StatCard
          title="Índice de Cobertura"
          value={coverageIndex.toFixed(2)}
          subtitle="Estoque / Dívida"
          icon={BarChart3}
          variant={coverageIndex >= 1 ? 'success' : 'destructive'}
        />
      </div>

      {/* BLOCO 2: RESULTADOS DE VENDAS */}
      <div className="mb-3 mt-8">
          <h2 className="text-lg font-bold flex items-center gap-2"><Target className="h-5 w-5 text-emerald-500"/> Performance de Vendas</h2>
          <p className="text-sm text-muted-foreground">Resultados operacionais baseados no Custo (Estoque) vs Receita (A Receber).</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard 
          title="Receita Bruta" 
          value={formatCurrency(receitaTotal)} 
          subtitle="Total faturado" 
          icon={Banknote} 
          variant="default" 
        />
        <StatCard 
          title="Lucro Bruto" 
          value={formatCurrency(lucroOperacional)} 
          subtitle={`Custo Estoque: ${formatCurrency(custoVendas)}`} 
          icon={TrendingUp} 
          variant={lucroOperacional >= 0 ? 'success' : 'destructive'} 
        />
        <StatCard 
          title="CPM Médio de Venda" 
          value={formatCPM(cpmVendido)} 
          subtitle={`Spread ganho: ${formatCurrency(spread)}`} 
          icon={ArrowUpRight} 
          variant="success" 
        />
        <StatCard 
          title="Margem de Lucro" 
          value={`${margemLucro.toFixed(2)}%`} 
          subtitle={`CPM Custo: ${formatCPM(cpmCustoVenda)}`} 
          icon={Percent} 
          variant={margemLucro >= 0 ? 'success' : 'destructive'} 
        />
      </div>

      {/* BLOCO 3: ESTOQUE */}
      <div className="mb-3 mt-8">
          <h2 className="text-lg font-bold flex items-center gap-2"><Plane className="h-5 w-5 text-secondary"/> Posição de Estoque</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <StatCard title="Milhas em Estoque" value={formatNumber(totalMiles)} icon={Plane} />
        <StatCard title="CPM Médio Global" value={formatCPM(avgCpmGlobal)} icon={TrendingDown} variant="destructive" />
        <StatCard title="Custo do Estoque" value={formatCurrency(totalInvested)} icon={Wallet} />
      </div>

      {/* BLOCO 4: GRÁFICOS */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        
        {/* Gráfico 1: Evolução de Vendas e Lucro */}
        <Card>
          <CardHeader><CardTitle>Performance de Vendas (Mensal)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Bar dataKey="receita" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="custo" name="Custo do Estoque" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="lucro" name="Lucro Líquido" stroke="hsl(var(--success))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico 2: Fluxo de Caixa Futuro */}
        <Card>
          <CardHeader><CardTitle>Projeção de Fluxo de Caixa (Próx. Meses)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Bar dataKey="entradas" name="Entradas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saidas" name="Saídas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  <Area type="monotone" dataKey="saldo" name="Saldo Acumulado" fill="hsl(var(--primary)/0.1)" stroke="hsl(var(--primary))" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de CPMs */}
      <Card>
        <CardHeader><CardTitle>Gestão por Programa (Mark-to-Market)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-muted-foreground text-sm">
                  <th className="text-left py-3 px-4">Programa</th>
                  <th className="text-right py-3 px-4">Saldo</th>
                  <th className="text-right py-3 px-4">CPM Atual</th>
                  <th className="text-right py-3 px-4">Preço Mercado</th>
                  <th className="text-right py-3 px-4">Spread Virtual</th>
                </tr>
              </thead>
              <tbody>
                {cpmByProgram.map((item) => {
                  const mktPrice = MARKET_PRICES[item.name.toUpperCase()] || 0;
                  const spreadVirtual = mktPrice - (item.cpm || 0);
                  return (
                    <tr key={item.name} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4"><Badge variant="outline">{item.name}</Badge></td>
                      <td className="text-right py-3 px-4 font-medium">{formatNumber(item.balance)}</td>
                      <td className="text-right py-3 px-4 text-destructive font-bold">{formatCPM(item.cpm)}</td>
                      <td className="text-right py-3 px-4 text-success font-bold">{formatCPM(mktPrice)}</td>
                      <td className={`text-right py-3 px-4 font-bold ${spreadVirtual >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(spreadVirtual)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default Dashboard;
