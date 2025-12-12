import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // <--- Import Novo
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMilesBalance, useExpiringMiles, usePrograms, useAccounts } from '@/hooks/useSupabaseData';
import { formatCPM, formatCurrency, formatNumber } from '@/utils/financeLogic';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { Plane, AlertTriangle, TrendingUp, Wallet, Plus, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Estoque = () => {
  const navigate = useNavigate(); // <--- Hook de navegação
  const { data: milesBalance, isLoading: loadingBalance } = useMilesBalance();
  const { data: expiringMiles, isLoading: loadingExpiring } = useExpiringMiles();
  const { data: programs } = usePrograms();
  const { data: accounts } = useAccounts();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountFilter, setAccountFilter] = useState<string>('all');

  // Filter balance by account
  const filteredBalance = useMemo(() => {
    if (!milesBalance) return [];
    if (accountFilter === 'all') return milesBalance;
    return milesBalance.filter(item => item.account_id === accountFilter);
  }, [milesBalance, accountFilter]);

  // Filter expiring miles by account
  const filteredExpiringMiles = useMemo(() => {
    if (!expiringMiles) return [];
    if (accountFilter === 'all') return expiringMiles;
    const accountName = accounts?.find(a => a.id === accountFilter)?.name;
    return expiringMiles.filter(item => item.account_name === accountName);
  }, [expiringMiles, accountFilter, accounts]);

  // Group balance by program
  const balanceByProgram = useMemo(() => {
    return filteredBalance.reduce((acc, item) => {
      if (!item.program_name) return acc;
      
      if (!acc[item.program_name]) {
        acc[item.program_name] = {
          programId: item.program_id, // <--- Guardamos o ID aqui para usar no clique
          totalBalance: 0,
          totalInvested: 0,
          accounts: [],
        };
      }
      
      acc[item.program_name].totalBalance += item.balance || 0;
      acc[item.program_name].totalInvested += item.total_invested || 0;
      acc[item.program_name].accounts.push({
        name: item.account_name || '',
        balance: item.balance || 0,
        avgCpm: item.avg_cpm || 0,
        invested: item.total_invested || 0,
      });
      
      return acc;
    }, {} as Record<string, { programId: string; totalBalance: number; totalInvested: number; accounts: { name: string; balance: number; avgCpm: number; invested: number }[] }>);
  }, [filteredBalance]);

  const totalMiles = filteredBalance.reduce((acc, item) => acc + (item.balance || 0), 0);
  const totalInvested = filteredBalance.reduce((acc, item) => acc + (item.total_invested || 0), 0);
  const avgCpmGlobal = totalMiles > 0 ? (totalInvested / totalMiles) * 1000 : 0;

  if (loadingBalance || loadingExpiring) {
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
        title="Estoque de Milhas"
        description="Visualize seu saldo de milhas por programa e conta"
        action={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Transação
          </Button>
        }
      />

      {/* Account Filter */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Filtrar por conta:</span>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todas as contas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {accounts?.map(acc => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Plane className="h-4 w-4" />
              Total em Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatNumber(totalMiles)}
            </div>
            <p className="text-sm text-muted-foreground">milhas disponíveis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Total Investido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(totalInvested)}
            </div>
            <p className="text-sm text-muted-foreground">valor em milhas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              CPM Médio Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {formatCPM(avgCpmGlobal)}
            </div>
            <p className="text-sm text-muted-foreground">custo por milheiro</p>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Miles Alert */}
      {filteredExpiringMiles.length > 0 && (
        <Card className="mb-8 border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Milhas a Vencer (próximos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredExpiringMiles.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 rounded-lg bg-background border"
                >
                  <div>
                    <span className="font-medium">{item.program_name}</span>
                    <span className="text-muted-foreground"> - {item.account_name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatNumber(item.quantity || 0)} milhas</div>
                    <div className="text-sm text-warning">
                      {item.expiration_date && format(new Date(item.expiration_date), 'dd/MM/yyyy', { locale: ptBR })}
                      <span className="ml-1">({item.days_until_expiration} dias)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance by Program */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(balanceByProgram).map(([programName, data]) => {
          const programCpm = data.totalBalance > 0 ? (data.totalInvested / data.totalBalance) * 1000 : 0;
          
          return (
            <Card 
                key={programName} 
                // --- CLASSES DE CLIQUE E HOVER ---
                className="overflow-hidden cursor-pointer hover:border-primary/50 transition-all hover:shadow-md"
                // --- AÇÃO DE NAVEGAR ---
                onClick={() => navigate(`/estoque/${data.programId}`)}
            >
              <CardHeader className="bg-muted/30 pointer-events-none">
                <CardTitle className="flex items-center justify-between">
                  <span>{programName}</span>
                  <Badge variant="secondary">
                    CPM: {formatCPM(programCpm)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pointer-events-none">
                <div className="mb-4 pb-4 border-b">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="text-2xl font-bold">
                      {formatNumber(data.totalBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-muted-foreground">Investido:</span>
                    <span className="font-medium">
                      {formatCurrency(data.totalInvested)}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {data.accounts.map((account) => (
                    <div
                      key={account.name}
                      className="flex justify-between items-center p-2 rounded bg-muted/50"
                    >
                      <div>
                        <div className="font-medium text-sm">{account.name}</div>
                        <div className="text-xs text-muted-foreground">
                          CPM: {formatCPM(account.avgCpm)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {formatNumber(account.balance)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(account.invested)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {Object.keys(balanceByProgram).length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma milha em estoque. Registre uma compra para começar.
          </CardContent>
        </Card>
      )}

      <TransactionModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </MainLayout>
  );
};

export default Estoque;
