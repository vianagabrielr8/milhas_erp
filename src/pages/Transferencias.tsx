import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccounts, usePrograms } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowRight, Calculator, CalendarIcon, Send, Wallet, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';

const Transferencias = () => {
  const { data: accounts } = useAccounts();
  const { data: programs } = usePrograms();

  // Estados
  const [sourceAccount, setSourceAccount] = useState('');
  const [destProgram, setDestProgram] = useState('');
  const [destAccount, setDestAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [bonusPercent, setBonusPercent] = useState('0');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- CÁLCULOS VISUAIS (PREVISÃO) ---
  const calculation = useMemo(() => {
    const qtd = parseFloat(amount) || 0;
    const bonus = parseFloat(bonusPercent) || 0;
    const bonusAmount = Math.floor(qtd * (bonus / 100));
    const total = qtd + bonusAmount;

    return { qtd, bonus, bonusAmount, total };
  }, [amount, bonusPercent]);

  // --- AÇÃO DE TRANSFERIR ---
  const handleTransfer = async () => {
    if (!sourceAccount || !destProgram || !destAccount || !amount || !date) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (calculation.qtd <= 0) {
      toast.error('A quantidade deve ser maior que zero.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não logado');

      // Chama a função BLINDADA no banco
      const { error } = await supabase.rpc('perform_transfer', {
        p_user_id: user.id,
        p_source_account_id: sourceAccount,
        p_program_id: destProgram,
        p_dest_account_id: destAccount,
        p_amount: calculation.qtd,
        p_bonus_percent: calculation.bonus,
        p_date: date,
        p_cost_per_thousand: 0 
      });

      if (error) throw error;

      toast.success('Transferência realizada com sucesso!');
      
      // Limpa formulário
      setAmount('');
      setBonusPercent('0');
      
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao transferir: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Encontra nomes para o resumo visual
  const sourceName = accounts?.find(a => a.id === sourceAccount)?.name || '...';
  const destProgramName = programs?.find(p => p.id === destProgram)?.name || '...';
  const destAccountName = accounts?.find(a => a.id === destAccount)?.name || '...';

  return (
    <MainLayout>
      <PageHeader 
        title="Transferência Bonificada" 
        description="Mova pontos entre bancos e companhias aéreas com segurança."
      />

      <div className="grid gap-6 lg:grid-cols-12 max-w-7xl mx-auto">
        
        {/* COLUNA ESQUERDA: INPUTS (8 colunas) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* BLOCO 1: ORIGEM E DESTINO */}
          <Card className="border-l-4 border-l-primary shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
                <ArrowRightLeft className="h-5 w-5" />
                Rota da Transferência
              </CardTitle>
              <CardDescription>Defina de onde sai e para onde vai.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              
              {/* ORIGEM */}
              <div className="space-y-3">
                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">De onde saem os pontos? (Origem)</Label>
                <div className="grid md:grid-cols-1 gap-4">
                    <div className="space-y-1">
                        <Label>Banco / Programa Origem</Label>
                        <Select value={sourceAccount} onValueChange={setSourceAccount}>
                        <SelectTrigger className="h-11 bg-muted/10">
                            <SelectValue placeholder="Selecione (Ex: Livelo, Esfera, Itaú...)" />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts?.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                </div>
              </div>

              {/* DIVISOR VISUAL */}
              <div className="relative flex items-center justify-center">
                 <div className="border-t w-full absolute"></div>
                 <div className="bg-background relative px-3 text-muted-foreground text-xs font-medium uppercase">Envia para</div>
              </div>

              {/* DESTINO */}
              <div className="space-y-3">
                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Para onde vão? (Destino)</Label>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Programa de Destino</Label>
                    <Select value={destProgram} onValueChange={setDestProgram}>
                      <SelectTrigger className="h-11 bg-muted/10">
                        <SelectValue placeholder="Ex: Latam, Smiles..." />
                      </SelectTrigger>
                      <SelectContent>
                        {programs?.map(prog => (
                          <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Titular da Conta (CPF)</Label>
                    <Select value={destAccount} onValueChange={setDestAccount}>
                      <SelectTrigger className="h-11 bg-muted/10">
                        <SelectValue placeholder="Selecione o Titular" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts?.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* BLOCO 2: VALORES */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Calculator className="h-5 w-5 text-muted-foreground" />
                Matemática da Promoção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Quantidade a Transferir</Label>
                  <div className="relative">
                    <Input 
                        type="number" 
                        placeholder="0" 
                        className="h-12 text-lg font-bold pl-4"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                    />
                    <div className="absolute right-3 top-3 text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">PTS</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Bônus da Promoção (%)</Label>
                  <div className="relative">
                    <Input 
                        type="number" 
                        placeholder="0" 
                        className="h-12 text-lg font-bold text-emerald-600"
                        value={bonusPercent}
                        onChange={e => setBonusPercent(e.target.value)}
                    />
                    <span className="absolute right-4 top-3 font-bold text-emerald-600">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label>Data da Operação</Label>
                <div className="relative max-w-[240px]">
                  <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date" 
                    className="pl-9 h-11"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA: RESUMO (4 colunas) */}
        <div className="lg:col-span-5 space-y-6">
            
            <Card className="h-full border-primary/20 bg-muted/10 flex flex-col shadow-lg sticky top-6">
                <CardHeader className="bg-white rounded-t-lg border-b pb-4">
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <Wallet className="h-5 w-5" />
                        Resumo da Operação
                    </CardTitle>
                    <CardDescription>Confira os dados antes de confirmar.</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1 space-y-6 pt-6">
                    {/* Visualização da Rota */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground font-medium">Sai de:</span>
                            <span className="font-bold text-foreground">{sourceName}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground font-medium">Entra em:</span>
                            <div className="text-right">
                                <div className="font-bold text-foreground">{destProgramName}</div>
                                <div className="text-xs text-muted-foreground">{destAccountName}</div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-dashed my-4" />

                    {/* Cálculos */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Pontos Base</span>
                            <span className="font-medium text-destructive">- {calculation.qtd.toLocaleString('pt-BR')}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Bônus Aplicado ({calculation.bonus}%)</span>
                            <span className="font-medium text-emerald-600">+ {calculation.bonusAmount.toLocaleString('pt-BR')}</span>
                        </div>

                        <div className="bg-background p-4 rounded-lg border border-primary/30 mt-4">
                            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 text-center">Total a Receber na {destProgramName}</div>
                            <div className="text-3xl font-black text-center text-primary">
                                {calculation.total.toLocaleString('pt-BR')}
                            </div>
                        </div>
                    </div>
                </CardContent>

                <div className="p-6 pt-0 bg-transparent">
                    <Button 
                        className="w-full h-14 text-lg font-bold shadow-md hover:shadow-xl hover:scale-[1.01] transition-all" 
                        onClick={handleTransfer}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <div className="flex items-center gap-2">
                                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                                Processando...
                            </div>
                        ) : (
                            'Confirmar Transferência'
                        )}
                    </Button>
                </div>
            </Card>

        </div>
      </div>
    </MainLayout>
  );
};

export default Transferencias;
