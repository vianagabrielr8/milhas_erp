import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMilesBalance, useExpiringMiles, usePrograms } from '@/hooks/useSupabaseData';
import { formatCPM } from '@/lib/installmentCalculator';
import { Plane, AlertTriangle, TrendingUp, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Estoque = () => {
  const { data: milesBalance, isLoading: loadingBalance } = useMilesBalance();
  const { data: expiringMiles, isLoading: loadingExpiring } = useExpiringMiles();
  const { data: programs } = usePrograms();

  // Group balance by program
  const balanceByProgram = milesBalance?.reduce((acc, item) => {
    if (!item.program_name) return acc;
    
    if (!acc[item.program_name]) {
      acc[item.program_name] = {
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
  }, {} as Record<string, { totalBalance: number; totalInvested: number; accounts: { name: string; balance: number; avgCpm: number; invested: number }[] }>);

  const totalMiles = milesBalance?.reduce((acc, item) => acc + (item.balance || 0), 0) || 0;
  const totalInvested = milesBalance?.reduce((acc, item) => acc + (item.total_invested || 0), 0) || 0;
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
      />

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
              {totalMiles.toLocaleString('pt-BR')}
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
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInvested)}
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
      {expiringMiles && expiringMiles.length > 0 && (
        <Card className="mb-8 border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Milhas a Vencer (próximos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiringMiles.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 rounded-lg bg-background border"
                >
                  <div>
                    <span className="font-medium">{item.program_name}</span>
                    <span className="text-muted-foreground"> - {item.account_name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{item.quantity?.toLocaleString('pt-BR')} milhas</div>
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
        {balanceByProgram && Object.entries(balanceByProgram).map(([programName, data]) => {
          const program = programs?.find(p => p.name === programName);
          const programCpm = data.totalBalance > 0 ? (data.totalInvested / data.totalBalance) * 1000 : 0;
          
          return (
            <Card key={programName} className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center justify-between">
                  <span>{programName}</span>
                  <Badge variant="secondary">
                    CPM: {formatCPM(programCpm)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="mb-4 pb-4 border-b">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="text-2xl font-bold">
                      {data.totalBalance.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-muted-foreground">Investido:</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.totalInvested)}
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
                          {account.balance.toLocaleString('pt-BR')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.invested)}
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

      {(!balanceByProgram || Object.keys(balanceByProgram).length === 0) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma milha em estoque. Registre uma compra para começar.
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
};

export default Estoque;
