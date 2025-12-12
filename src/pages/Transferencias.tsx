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
import { ArrowRight, Calculator, CalendarIcon, Send, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const Transferencias = () => {
  const { data: accounts } = useAccounts();
  const { data: programs } = usePrograms();

  // Estados
  const [sourceAccount, setSourceAccount] = useState('');
  const [destProgram, setDestProgram] = useState('');
  const [destAccount, setDestAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [bonusPercent, setBonusPercent] = useState('0'); // Começa com 0
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- CÁLCULOS VISUAIS (A PREVISÃO QUE VOCÊ GOSTA) ---
  const calculation = useMemo(() => {
    const qtd = parseFloat(amount) || 0;
    const bonus = parseFloat(bonusPercent) || 0;
    const bonusAmount = Math.floor(qtd * (bonus / 100));
    const total = qtd + bonusAmount;

    return { qtd, bonus, bonusAmount, total };
  }, [amount, bonusPercent]);

  // --- AÇÃO DE TRANSFERIR (LÓGICA BLINDADA) ---
  const handleTransfer = async () => {
    // 1. Validações
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

      // 2. Chama a função SEGURA no banco (Atomicidade)
      const { error } = await supabase.rpc('perform_transfer', {
        p_user_id: user.id,
        p_source_account_id: sourceAccount,
        p_program_id: destProgram,
        p_dest_account_id: destAccount,
        p_amount: calculation.qtd,
        p_bonus_percent: calculation.bonus,
        p_date: date,
        p_cost_per_thousand: 0 // Se tiver lógica de custo, insira aqui
      });

      if (error) throw error;

      toast.success('Transferência realizada com sucesso!');
      
      // Limpa os campos principais
      setAmount('');
      setBonusPercent('0');
      
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao transferir: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <PageHeader 
        title="Transferência Bonificada" 
        description="Envie pontos do banco para companhias aéreas com bônus."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* COLUNA DA ESQUERDA: FORMULÁRIO */}
        <div className="space-y-6">
          
          {/* 1. Origem e Destino */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> Dados da Transferência
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Conta de Origem (Banco)</Label>
                <Select value={sourceAccount} onValueChange={setSourceAccount}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione o banco (Ex: Livelo, Esfera...)" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative py-2 flex justify-center">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative bg-background px-2 text-muted-foreground text-xs uppercase">Para</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Programa Destino</Label>
                  <Select value={destProgram} onValueChange={setDestProgram}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ex: Latam" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs?.map(prog => (
                        <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>CPF / Conta Destino</Label>
                  <Select value={destAccount} onValueChange={setDestAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o titular" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Valores e Datas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" /> Valores da Promoção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pontos a Transferir</Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    className="font-bold text-lg"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bônus (%)</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder="0" 
                      className="pr-8"
                      value={bonusPercent}
                      onChange={e => setBonusPercent(e.target.value)}
                    />
                    <span className="absolute right-3 top-2.5 text-muted-foreground font-bold">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data da Operação</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date" 
                    className="pl-9"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DA DIREITA: RESUMO E AÇÃO */}
        <div className="space-y-6">
          <Card className="h-full border-primary/20 bg-muted/10 flex flex-col justify-between">
            <div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Resumo da Operação
                </CardTitle>
                <CardDescription>Confira os valores antes de confirmar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Visualização do fluxo */}
                <div className="bg-background rounded-lg p-4 border space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Saindo de:</span>
                    <span className="font-medium">
                      {accounts?.find(a => a.id === sourceAccount)?.name || '...'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold text-destructive">
                    <span>Pontos Base</span>
                    <span>- {calculation.qtd.toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                <div className="flex justify-center text-muted-foreground">
                  <ArrowRight className="h-6 w-6 rotate-90 md:rotate-0" />
                </div>

                <div className="bg-background rounded-lg p-4 border space-y-3 border-l-4 border-l-primary">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Entrando em:</span>
                    <span className="font-medium">
                      {programs?.find(p => p.id === destProgram)?.name || '...'}
                    </span>
                  </div>
                  
                  {calculation.bonus > 0 && (
                    <div className="flex justify-between items-center text-sm text-emerald-600">
                      <span>Bônus ({calculation.bonus}%)</span>
                      <span>+ {calculation.bonusAmount.toLocaleString('pt-BR')}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t flex justify-between items-center text-xl font-bold text-primary">
                    <span>Total a Receber</span>
                    <span>{calculation.total.toLocaleString('pt-BR')}</span>
                  </div>
                </div>

              </CardContent>
            </div>

            <div className="p-6 pt-0">
              <Button 
                className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all" 
                onClick={handleTransfer}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                    <span className="flex items-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Processando...
                    </span>
                ) : (
                    'Confirmar Transferência'
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                A transação será registrada automaticamente no estoque.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Transferencias;
