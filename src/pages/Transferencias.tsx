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
import { ArrowRight, Calculator, CalendarIcon, User, Wallet, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';

const Transferencias = () => {
  const { data: accounts } = useAccounts();
  const { data: programs } = usePrograms();

  // Estados
  const [selectedAccount, setSelectedAccount] = useState(''); // Titular (Gabriel/Ingrid)
  const [sourceProgram, setSourceProgram] = useState('');     // Origem (Livelo)
  const [destProgram, setDestProgram] = useState('');         // Destino (Latam)
  const [amount, setAmount] = useState('');
  const [bonusPercent, setBonusPercent] = useState('0');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- CÁLCULOS VISUAIS ---
  const calculation = useMemo(() => {
    const qtd = parseFloat(amount) || 0;
    const bonus = parseFloat(bonusPercent) || 0;
    const bonusAmount = Math.floor(qtd * (bonus / 100));
    const total = qtd + bonusAmount;

    return { qtd, bonus, bonusAmount, total };
  }, [amount, bonusPercent]);

  // --- AÇÃO DE TRANSFERIR ---
  const handleTransfer = async () => {
    if (!selectedAccount || !sourceProgram || !destProgram || !amount || !date) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (sourceProgram === destProgram) {
      toast.error('O programa de origem e destino não podem ser iguais.');
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

      // Chama a função ATUALIZADA no banco
      const { error } = await supabase.rpc('perform_transfer', {
        p_user_id: user.id,
        p_account_id: selectedAccount,      // Titular único
        p_source_program_id: sourceProgram, // De onde sai
        p_dest_program_id: destProgram,     // Para onde vai
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
      toast.error('Erro ao transferir: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nomes para o resumo
  const accountName = accounts?.find(a => a.id === selectedAccount)?.name || '...';
  const sourceProgramName = programs?.find(p => p.id === sourceProgram)?.name || '...';
  const destProgramName = programs?.find(p => p.id === destProgram)?.name || '...';

  return (
    <MainLayout>
      <PageHeader 
        title="Transferência Bonificada" 
        description="Mova pontos entre programas da mesma conta."
      />

      <div className="grid gap-6 lg:grid-cols-12 max-w-7xl mx-auto">
        
        {/* COLUNA ESQUERDA: INPUTS */}
        <div className="lg:col-span-7 space-y-6">
          
          <Card className="border-l-4 border-l-primary shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
                <ArrowRightLeft className="h-5 w-5" />
                Rota da Transferência
              </CardTitle>
              <CardDescription>Defina o titular e os programas envolvidos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              
              {/* 1. TITULAR DA CONTA */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Titular da Conta (Dono dos pontos)
                </Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="h-12 text-lg font-medium bg-muted/10">
                    <SelectValue placeholder="Selecione (Ex: Gabriel, Ingrid...)" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t my-2" />

              {/* 2. ORIGEM E DESTINO */}
              <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sai de (Origem)</Label>
                    <Select value={sourceProgram} onValueChange={setSourceProgram}>
                        <SelectTrigger className="h-11 bg-red-50/50 border-red-100">
                        <SelectValue placeholder="Ex: Livelo, Itaú..." />
                        </SelectTrigger>
                        <SelectContent>
                        {programs?.map(prog => (
                            <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Vai para (Destino)</Label>
                    <Select value={destProgram} onValueChange={setDestProgram}>
                        <SelectTrigger className="h-11 bg-emerald-50/50 border-emerald-100">
                        <SelectValue placeholder="Ex: Latam, Smiles..." />
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
                  <Label>Pontos a Transferir</Label>
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
                  <Label>Bônus (%)</Label>
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
                <Label>Data</Label>
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

        {/* COLUNA DIREITA: RESUMO */}
        <div className="lg:col-span-5 space-y-6">
            <Card className="h-full border-primary/20 bg-muted/10 flex flex-col shadow-lg sticky top-6">
                <CardHeader className="bg-white rounded-t-lg border-b pb-4">
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <Wallet className="h-5 w-5" />
                        Resumo da Operação
                    </CardTitle>
                    <CardDescription>Confira antes de confirmar.</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1 space-y-6 pt-6">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg border shadow-sm">
                            <span className="text-sm text-muted-foreground">Titular:</span>
                            <span className="font-bold text-foreground flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" /> {accountName}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Sai de:</span>
                            <span className="font-medium">{sourceProgramName}</span>
                        </div>
                        <div className="flex justify-center text-muted-foreground/30">
                            <ArrowRight className="h-5 w-5 rotate-90 md:rotate-0" />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Entra em:</span>
                            <span className="font-bold text-foreground">{destProgramName}</span>
                        </div>
                    </div>

                    <div className="border-t border-dashed my-4" />

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Pontos Base</span>
                            <span className="font-medium text-destructive">- {calculation.qtd.toLocaleString('pt-BR')}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Bônus ({calculation.bonus}%)</span>
                            <span className="font-medium text-emerald-600">+ {calculation.bonusAmount.toLocaleString('pt-BR')}</span>
                        </div>

                        <div className="bg-background p-4 rounded-lg border border-primary/30 mt-4">
                            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 text-center">Total a Receber</div>
                            <div className="text-3xl font-black text-center text-primary">
                                {calculation.total.toLocaleString('pt-BR')}
                            </div>
                        </div>
                    </div>
                </CardContent>

                <div className="p-6 pt-0 bg-transparent">
                    <Button 
                        className="w-full h-14 text-lg font-bold shadow-md hover:shadow-xl transition-all" 
                        onClick={handleTransfer}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Processando...' : 'Confirmar Transferência'}
                    </Button>
                </div>
            </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Transferencias;
