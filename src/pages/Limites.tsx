import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// ADICIONEI O usePrograms AQUI
import { useTransactions, useAccounts, usePrograms } from '@/hooks/useSupabaseData';
import { Users, CalendarClock, CheckCircle } from 'lucide-react';
import { format, addYears, isAfter, startOfYear } from 'date-fns';

// --- CONFIGURAÇÃO DE LIMITES ---
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
  const { data: programs } = usePrograms(); // BUSCA A LISTA DE PROGRAMAS
  
  const [selectedAccount, setSelectedAccount] = useState<string>('all');

  // Filtra VENDAS
  const salesTransactions = useMemo(() => {
    if (!transactions) return [];
    // Verificamos se tem CPF OU se tem NOME (já que usamos o nome como chave no seu caso)
    return transactions.filter(t => t.type === 'VENDA' && (t.buyer_cpf || t.buyer_name));
  }, [transactions]);

  // Função Auxiliar de Data
  const getLiberationDate = (date: Date, ruleType: 'ROLLING' | 'CALENDAR') => {
    if (ruleType === 'CALENDAR') {
      return startOfYear(addYears(date, 1));
    } else {
      return addYears(date, 1);
    }
  };

  const limitStatus = useMemo(() => {
    if (!accounts || !salesTransactions || !programs) return [];

    return accounts.map(account => {
      const accountSales = salesTransactions.filter(t => t.account_id === account.id);
      
      const programsStatus = Object.entries(PROGRAM_RULES).map(([progKey, rule]) => {
        
        // --- CORREÇÃO PRINCIPAL AQUI ---
        // Filtramos cruzando com o ID do programa para achar o nome correto
        const progSales = accountSales.filter(t => {
            // Acha o programa dessa transação na lista de programas
            const prog = programs.find(p => p.id === t.program_id);
            // Verifica se o nome dele contem a chave (ex: "Latam Pass" contem "LATAM")
            return prog?.name?.toUpperCase().includes(progKey);
        });

        // Se não tiver vendas e não for os principais, esconde
        if (progSales.length === 0 && progKey !== 'LATAM' && progKey !== 'SMILES') return null;

        const uniqueCPFs = new Map();

        progSales.forEach(sale => {
            // Usamos buyer_cpf. Se estiver vazio (caso antigo), tenta usar buyer_name como identificador
            const cpfIdentifier = sale.buyer_cpf || sale.buyer_name;
            
            if (!cpfIdentifier) return; // Segurança

            const saleDate = new Date(sale.transaction_date);
            const liberationDate = getLiberationDate(saleDate, rule.type);
            
            // Verifica se HOJE ainda está ocupado
            const isOccupied = isAfter(liberationDate, new Date());

            if (isOccupied) {
                if (!uniqueCPFs.has(cpfIdentifier)) {
                    uniqueCPFs.set(cpfIdentifier, {
                        name: sale.buyer_name || 'Passageiro',
                        cpf: cpfIdentifier, // Mostra o que tiver (CPF ou Nome)
                        since: saleDate,
                        freesAt: liberationDate,
                        ruleType: rule.type
                    });
                }
            }
        });

        const used = uniqueCPFs.size;
        const percentage = Math.min((used / rule.limit) * 100, 100);

        return {
          program: progKey,
          limit: rule.limit,
          type: rule.type,
          used: used,
          available: rule.limit - used,
          percentage: percentage,
          beneficiaries: Array.from(uniqueCPFs.values()).sort((a, b) => a.freesAt.getTime() - b.freesAt.getTime())
        };
      }).filter(Boolean);

      return {
        accountId: account.id,
        accountName: account.name,
        programs: programsStatus
      };
    });
  }, [accounts, salesTransactions, programs]);

  const displayedStatus = useMemo(() => {
    if (selectedAccount === 'all') return limitStatus;
    return limitStatus.filter(s => s.accountId === selectedAccount);
  }, [limitStatus, selectedAccount]);

  return (
    <MainLayout>
      <PageHeader
        title="Controle de Limites CPF"
        description="Monitoramento automático de slots utilizados por conta e programa."
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
                <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-2">
                    {accStatus.accountName}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {accStatus?.programs?.map((prog: any) => (
                        <Card key={prog.program} className="overflow-hidden border-t-4 border-t-primary/20">
                            <CardHeader className="pb-2 bg-muted/10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">{prog.program}</CardTitle>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                            <CalendarClock className="h-3 w-3" />
                                            {prog.type === 'ROLLING' ? '365 Dias (Aniversário)' : 'Ano Civil (Jan-Dez)'}
                                        </div>
                                    </div>
                                    <Badge variant={prog.percentage >= 90 ? "destructive" : prog.percentage >= 70 ? "default" : "secondary"} className="text-sm px-2 py-1">
                                        {prog.used} / {prog.limit}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>Ocupação</span>
                                        <span className={prog.percentage >= 90 ? "text-red-500 font-bold" : ""}>{prog.percentage.toFixed(0)}%</span>
                                    </div>
                                    <Progress value={prog.percentage} className={`h-2 ${prog.percentage >= 90 ? "bg-red-100" : ""}`} />
                                    <p className="text-xs text-muted-foreground pt-1 flex justify-between">
                                        <span>{prog.available} slots livres</span>
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground border-b pb-1">
                                        <Users className="h-3 w-3" /> Beneficiários ({prog.beneficiaries.length})
                                    </h4>
                                    {prog.beneficiaries.length === 0 ? (
                                        <div className="flex items-center gap-2 p-3 bg-muted/20 rounded text-sm text-muted-foreground italic">
                                            <CheckCircle className="h-4 w-4 text-emerald-500" /> Nenhum CPF em uso.
                                        </div>
                                    ) : (
                                        <div className="max-h-[250px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                            {prog.beneficiaries.map((b: any, idx: number) => (
                                                <div key={idx} className="flex flex-col text-sm p-2.5 bg-card border rounded shadow-sm hover:bg-muted/50 transition-colors">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-semibold text-foreground truncate max-w-[140px]" title={b.name}>
                                                            {b.name}
                                                        </span>
                                                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                                                            {b.cpf}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-muted-foreground">
                                                            Venda: {format(b.since, 'dd/MM/yy')}
                                                        </span>
                                                        <div className="flex items-center gap-1 text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                                                            Libera: {format(b.freesAt, 'dd/MM/yy')}
                                                        </div>
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
      </div>
    </MainLayout>
  );
};

export default Limites;
