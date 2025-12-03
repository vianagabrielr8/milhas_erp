import { useData } from '@/contexts/DataContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/dashboard/StatCard';
import { MilhasChart } from '@/components/dashboard/MilhasChart';
import {
  Plane,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  Wallet,
} from 'lucide-react';

const Dashboard = () => {
  const { getDashboardStats } = useData();
  const stats = getDashboardStats();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Dashboard"
        description="Visão geral do seu negócio de milhas"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <StatCard
          title="Estoque de Milhas"
          value={formatNumber(stats.totalMilhasEstoque)}
          subtitle="Total disponível"
          icon={Plane}
          variant="default"
        />
        <StatCard
          title="Total em Compras"
          value={formatCurrency(stats.totalCompras)}
          subtitle="Valor investido"
          icon={TrendingDown}
          variant="destructive"
        />
        <StatCard
          title="Total em Vendas"
          value={formatCurrency(stats.totalVendas)}
          subtitle="Valor recebido"
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Lucro Total"
          value={formatCurrency(stats.lucroTotal)}
          subtitle={stats.lucroTotal >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
          icon={Wallet}
          variant={stats.lucroTotal >= 0 ? 'success' : 'destructive'}
        />
        <StatCard
          title="Contas a Pagar"
          value={formatCurrency(stats.contasPagarPendentes)}
          subtitle="Pendentes"
          icon={CreditCard}
          variant="warning"
        />
        <StatCard
          title="Contas a Receber"
          value={formatCurrency(stats.contasReceberPendentes)}
          subtitle="Pendentes"
          icon={Receipt}
          variant="default"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MilhasChart
          data={stats.milhasPorPrograma.map(p => ({ nome: p.programa, quantidade: p.quantidade }))}
          title="Milhas por Programa"
        />
        <MilhasChart
          data={stats.milhasPorConta.map(c => ({ nome: c.conta, quantidade: c.quantidade }))}
          title="Milhas por Conta"
        />
      </div>
    </MainLayout>
  );
};

export default Dashboard;
