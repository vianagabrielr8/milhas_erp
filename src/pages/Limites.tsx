import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTransactions, useAccounts } from '@/hooks/useSupabaseData';
import { Users, CalendarClock, CheckCircle, AlertCircle } from 'lucide-react';
import { format, addYears, isAfter, startOfYear } from 'date-fns';

const PROGRAM_RULES: Record<string, { limit: number; type: 'ROLLING' | 'CALENDAR' }> = {
  'LATAM': { limit: 25, type: 'ROLLING' },
  'SMILES': { limit: 25, type: 'CALENDAR' },
  'TUDOAZUL': { limit: 5, type: 'CALENDAR' },
  'AZUL': { limit: 5, type: 'CALENDAR' },
  'TAP': { limit: 10, type: 'CALENDAR' },
  'IBERIA': { limit: 10, type: 'ROLLING' }
};

const Limites = () => {
  const { data: accounts } = useAccounts();
  const { data: transactions } = useTransactions();
  
  const [selectedAccount, setSelectedAccount] = useState<string>('all');

  const salesTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(t => {
      const isSale = t.type === 'VENDA';
      const tAny = t as any; 
      // Verifica se tem Nome ou CPF preenchido
      const hasPassenger = tAny.buyer_name || tAny.buyer_cpf;
      return isSale && hasPassenger;
    });
  }, [transactions]);

  const getLiberationDate = (dateStr: string, ruleType: 'ROLLING' | 'CALENDAR') => {
    const date = new Date(dateStr);
    if (ruleType === 'CALENDAR') {
      return startOfYear(addYears(date, 1));
    } else {
      return addYears(date, 1);
    }
  };

  const limitStatus = useMemo(() => {
    if (!accounts || !salesTransactions) return [];

    return accounts.map(account => {
      const accountSales = salesTransactions.filter(t => t.account_id === account.id);
      
      const programsStatus = Object.entries(PROGRAM_RULES).map(([progKey, rule]) => {
        const progSales = accountSales.filter(t => {
            const pName = (t as any).program_name || ''; 
            return pName.toUpperCase().includes(progKey);
        });

        if (progSales.length === 0 && progKey !== 'LATAM' && progKey !== 'SMILES') return null;

        const uniqueBeneficiaries = new Map();

        progSales.forEach(sale => {
            const tAny = sale as any;
            const identifier = tAny.buyer_cpf || tAny.buyer_name; // Prioridade para o identificador único
            const name = tAny.buyer_name || 'Sem Nome';

            if (!identifier) return;

            const liberationDate = getLiberationDate(sale.transaction_date, rule.type);
            const isOccupied = isAfter(liberationDate, new Date());

            if (isOccupied) {
                if (!uniqueBeneficiaries.has(identifier)) {
                    uniqueBeneficiaries.set(identifier, {
                        name: name,
                        cpf: identifier,
                        since: sale.transaction_date,
                        freesAt: liberationDate,
                        ruleType: rule.type
                    });
                }
            }
        });

        const used = uniqueBeneficiaries.size;
        const percentage = Math.min((used / rule.limit) * 100, 100);

        return {
          program: progKey,
          limit: rule.limit,
          type: rule.type,
          used: used,
          available: rule.limit - used,
          percentage: percentage,
          beneficiaries: Array.from(uniqueBeneficiaries.values()).sort((a: any, b: any) => a.freesAt - b.freesAt)
        };
      }).filter(Boolean);

      return {
        accountId: account.id,
        accountName: account.name,
        programs: programsStatus
      };
    });
  }, [accounts, salesTransactions]);

  const displayedStatus = useMemo(() => {
    if (selectedAccount === 'all') return limitStatus;
    return limitStatus.filter(s => s.accountId === selectedAccount);
  }, [limitStatus, selectedAccount]);

  return (
    <MainLayout>
      <PageHeader
        title="Limites de CPF"
        description="Monitoramento inteligente de cotas por Cia Aérea"
        action={
             <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Todas as Contas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as Contas</SelectItem>
                        {accounts?.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
             </div>
        }
      />

      <div className="space-y-8">
        {displayedStatus.map((accStatus) => (
            <div key={accStatus.accountId} className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-2 text-foreground">
                    {accStatus.accountName}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {accStatus?.programs?.map((prog: any) => (
                        <Card key={prog.program} className="overflow-hidden border bg-card text-card-foreground shadow-sm">
                            <CardHeader className="pb-3 bg-muted/20 border-b">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                                            {prog.program}
                                        </CardTitle>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                            <CalendarClock className="h-3 w-3" />
                                            {prog.type === 'ROLLING' ? 'Renova 365 dias após uso' : 'Renova em 01/Jan'}
                                        </div>
                                    </div>
                                    <Badge 
                                        variant={prog.percentage >= 90 ? "destructive" : "outline"} 
                                        className={prog.percentage < 90 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : ""}
                                    >
                                        {prog.used} / {prog.limit}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Ocupação</span>
                                        <span className={`font-bold ${prog.percentage >= 90 ? "text-destructive" : "text-emerald-500"}`}>
                                            {prog.percentage.toFixed(0)}%
                                        </span>
                                    </div>
                                    <Progress value={prog.percentage} className="h-2" />
                                    <p className="text-xs text-muted-foreground pt-1 flex justify-between">
                                        <span>{prog.available} slots disponíveis</span>
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2 mb-2">
                                        Beneficiários em Contagem ({prog.beneficiaries.length})
                                    </h4>
                                    
                                    {prog.beneficiaries.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-4 bg-muted/10 rounded border border-dashed text-muted-foreground">
                                            <CheckCircle className="h-6 w-6 mb-2 opacity-50 text-emerald-500" /> 
                                            <span className="text-sm">Nenhum CPF consumindo cota.</span>
                                        </div>
                                    ) : (
                                        <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2">
                                            {prog.beneficiaries.map((b: any, idx: number) => (
                                                <div key={idx} className="flex flex-col text-sm p-2 bg-muted/30 border rounded hover:bg-muted/50 transition-colors">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-semibold truncate w-[140px]" title={b.name}>
                                                            {b.name}
                                                        </span>
                                                        <span className="text-[10px] bg-background border px-1.5 rounded text-muted-foreground">
                                                            {b.cpf.length > 11 ? 'NOME' : b.cpf}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs mt-1">
                                                        <span className="text-muted-foreground flex items-center gap-1">
                                                            Venda: {format(new Date(b.since), 'dd/MM/yy')}
                                                        </span>
                                                        <span className="text-emerald-600 font-medium bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
                                                            Libera: {format(b.freesAt, 'dd/MM/yy')}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        ))}
        
        {displayedStatus.length === 0 && (
            <div className="text-center py-10">
                <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-medium text-muted-foreground">Nenhuma conta encontrada</h3>
            </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Limites;
