import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccounts, usePrograms, useMilesBalance } from '@/hooks/useSupabaseData'; // <--- Adicionei useMilesBalance
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowRight, Calculator, CalendarIcon, User, Wallet, ArrowRightLeft, Coins } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const Transferencias = () => {
  const { data: accounts } = useAccounts();
  const { data: programs } = usePrograms();
  const { data: milesBalance } = useMilesBalance(); // <--- Pega os saldos

  // Estados
  const [selectedAccount, setSelectedAccount] = useState('');
  const [sourceProgram, setSourceProgram] = useState('');
  const [destProgram, setDestProgram] = useState('');
  const [amount, setAmount] = useState('');
  const [bonusPercent, setBonusPercent] = useState('0');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- LÓGICA DE SALDO (Novidade) ---
  const currentBalance = useMemo(() => {
    if (!selectedAccount || !sourceProgram || !milesBalance) return 0;
    
    // Procura o saldo específico dessa conta naquele programa
    const registro = milesBalance.find(
        m => m.account_id === selectedAccount && m.program_id === sourceProgram
    );
    return registro ? registro.balance : 0;
  }, [selectedAccount, sourceProgram, milesBalance]);

  // --- CÁLCULOS VISUAIS ---
  const calculation = useMemo(() => {
    const qtd = parseFloat(amount) || 0;
    const bonus = parseFloat(bonusPercent) || 0;
    const bonusAmount = Math.floor(qtd * (bonus / 100));
    const total = qtd + bonusAmount;
    
    // Verifica se tem saldo suficiente
    const hasBalance = currentBalance >= qtd;

    return { qtd, bonus, bonusAmount, total, hasBalance };
  }, [amount, bonusPercent, currentBalance]);

  // --- AÇÃO: USAR MÁXIMO ---
  const handleUseMax = () => {
    setAmount(currentBalance.toString());
  };

  // --- AÇÃO: TRANSFERIR ---
  const handleTransfer = async () => {
    if (!selectedAccount || !sourceProgram || !destProgram || !amount || !date) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (sourceProgram === destProgram) {
      toast.error('Origem e destino não podem ser iguais.');
      return;
    }

    if (calculation.qtd <= 0) {
      toast.error('Quantidade inválida.');
      return;
    }

    // Trava se não tiver saldo (Opcional: pode deixar passar negativo se quiser, mas geralmente não pode)
    if (calculation.qtd > currentBalance) {
        if (!confirm('ATENÇÃO: Você está transferindo mais pontos do que consta no estoque. Deseja continuar e ficar negativo?')) {
            return;
        }
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não logado');

      const { error } = await supabase.rpc('perform_transfer', {
        p_user_id: user.id,
        p_account_id: selectedAccount,
        p_source_program_id: sourceProgram,
        p_dest_program_id: destProgram,
        p_amount: calculation.qtd,
        p_bonus_percent: calculation.bonus,
        p_date: date,
        p_cost_per_thousand: 0 
      });

      if (error) throw error;

      toast.success('Transferência realizada com sucesso!');
      setAmount('');
      setBonusPercent('0');
      
    } catch (error: any) {
      console.error(error);
      toast.error('Erro: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nomes para exibição
  const accountName = accounts?.find(a => a.id === selectedAccount)?.name || '...';
  const sourceProgramName = programs?.find(p => p.id === sourceProgram)?.name || '...';
  const destProgramName = programs?.find(p => p.id === destProgram)?.name || '...';

  return (
    <MainLayout>
      <PageHeader 
        title="Transferência Bonificada" 
        description="Mova pontos internamente entre programas da mesma conta."
      />

      <div className="grid gap-6 lg:grid-cols-12 max-w-7xl mx-auto">
        
        {/* ESQUERDA: INPUTS */}
        <div className="lg:col-span-7 space-y-6">
          
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                Configurar Rota
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* 1. TITULAR */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-primary font-semibold">
                    <User className="h-4 w-4" />
                    Quem é o titular?
                </Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Selecione o dono dos pontos" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t border-border/50" />

              {/* 2. ORIGEM E DESTINO */}
              <div className="grid md:grid-cols-2 gap-6">
                  {/* ORIGEM */}
                  <div className="space-y-3">
                    <Label className="text-muted-foreground">Sai de (Origem)</Label>
                    <Select value={sourceProgram} onValueChange={setSourceProgram}>
                        <SelectTrigger className="h-11 border-destructive/50 focus:ring-destructive">
                        <SelectValue placeholder="Ex: Livelo" />
                        </SelectTrigger>
                        <SelectContent>
                        {programs?.map(prog => (
                            <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    
                    {/* VISUALIZADOR DE SALDO */}
                    {selectedAccount && sourceProgram && (
                        <div className="flex items-center justify-between text-xs bg-muted/30 p-2 rounded border">
                            <span className="text-muted-foreground">Disponível:</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold">{currentBalance.toLocaleString('pt-BR')}</span>
                                <Button 
                                    variant="link" 
                                    className="h-auto p-0 text-xs text-primary" 
                                    onClick={handleUseMax}
                                >
                                    Usar tudo
                                </Button>
                            </div>
                        </div>
                    )}
                  </div>

                  {/* DESTINO */}
                  <div className="space-y-3">
                    <Label className="text-muted-foreground">Entra em (Destino)</Label>
                    <Select value={destProgram} onValueChange={setDestProgram}>
                        <SelectTrigger className="h-11 border-emerald-500/50 focus:ring-emerald-500">
                        <SelectValue placeholder="Ex: Latam" />
                        </SelectTrigger>
                        <SelectContent>
                        {programs?.map(prog => (
                            <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                  </div>
              </div>
            </CardContent>
          </Card>

          {/* VALORES */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Definir Valores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* QUANTIDADE */}
                <div className="space-y-2">
                  <Label>Quantidade de Pontos</Label>
                  <div className="relative">
                    <Input 
                        type="number" 
                        placeholder="0" 
                        className={`h-12 text-lg font-bold pl-4 ${!calculation.hasBalance ? 'border-destructive text-destructive' : ''}`}
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                    />
                    <div className="absolute right-3 top-3 text-xs font-bold text-muted-foreground px-2 py-0.5 rounded bg-muted">PTS</div>
                  </div>
                  {!calculation.hasBalance && (
                      <p className="text-xs text-destructive font-medium">Saldo insuficiente</p>
                  )}
                </div>
                
                {/* BÔNUS */}
                <div className="space-y-2">
                  <Label>Bônus da Promoção (%)</Label>
                  <div className="relative">
                    <Input 
                        type="number" 
                        placeholder="0" 
                        className="h-12 text-lg font-bold text-emerald-500"
                        value={bonusPercent}
                        onChange={e => setBonusPercent(e.target.value)}
                    />
                    <span className="absolute right-4 top-3 font-bold text-emerald-500">%</span>
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

        {/* DIREITA: RESUMO */}
        <div className="lg:col-span-5 space-y-6">
            <Card className="h-full border border-primary/20 shadow-lg sticky top-6 flex flex-col">
                <CardHeader className="bg-muted/10 border-b pb-4">
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <Wallet className="h-5 w-5" />
                        Resumo
                    </CardTitle>
                </CardHeader>
                
                <CardContent className="flex-1 space-y-6 pt-6">
                    {/* CAMINHO */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Titular:</span>
                            <span className="font-bold flex items-center gap-1">
                                <User className="h-3 w-3" /> {accountName}
                            </span>
                        </div>
                        
                        <div className="relative p-4 rounded-lg border bg-card flex flex-col gap-2">
                            <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground uppercase">Sai de</span>
                                <span className="font-bold text-destructive">{sourceProgramName}</span>
                            </div>
                            <div className="flex justify-center -my-3 z-10">
                                <div className="bg-card p-1 rounded-full border">
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground uppercase">Entra em</span>
                                <span className="font-bold text-emerald-500">{destProgramName}</span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-dashed" />

                    {/* MATEMÁTICA */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Pontos Base</span>
                            <span className="font-medium text-destructive">- {calculation.qtd.toLocaleString('pt-BR')}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Bônus ({calculation.bonus}%)</span>
                            <span className="font-medium text-emerald-500">+ {calculation.bonusAmount.toLocaleString('pt-BR')}</span>
                        </div>

                        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 mt-4">
                            <div className="text-xs text-primary/70 uppercase tracking-wide mb-1 text-center font-bold">Total a Receber</div>
                            <div className="text-3xl font-black text-center text-primary">
                                {calculation.total.toLocaleString('pt-BR')}
                            </div>
                            <div className="text-center text-xs text-muted-foreground mt-1">
                                na conta {destProgramName}
                            </div>
                        </div>
                    </div>
                </CardContent>

                <div className="p-6 pt-0">
                    <Button 
                        className="w-full h-12 text-lg font-bold shadow-lg" 
                        onClick={handleTransfer}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Processando...' : 'Confirmar'}
                    </Button>
                </div>
            </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Transferencias;
