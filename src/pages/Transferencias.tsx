import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
    useAccounts, 
    usePrograms, 
    useMilesBalance, 
    useCreateTransfer,
    useCreditCards 
} from '@/hooks/useSupabaseData';
import { calculateCardDates, generateInstallments, formatCurrency } from '@/utils/financeLogic';
import { toast } from 'sonner';
import { ArrowRight, Calculator, CalendarIcon, User, Wallet, ArrowRightLeft, CreditCard, CalendarCheck, Calendar, Scale, Percent } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- UTILITÁRIO DATA SEGURA ---
const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const createSafeDate = (dateString: string) => {
    if (!dateString) return new Date();
    return new Date(`${dateString}T12:00:00`);
};

const Transferencias = () => {
  const { data: accounts } = useAccounts();
  const { data: programs } = usePrograms();
  const { data: milesBalance } = useMilesBalance();
  const { data: creditCards } = useCreditCards();
  
  const createTransfer = useCreateTransfer();

  // Estados Base
  const [selectedAccount, setSelectedAccount] = useState('');
  const [sourceProgram, setSourceProgram] = useState('');
  const [destProgram, setDestProgram] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayString());
  
  // Estados de Regra de Negócio (NOVO UX)
  const [parityIn, setParityIn] = useState('1');
  const [parityOut, setParityOut] = useState('1');
  const [bonusPercent, setBonusPercent] = useState('0');

  // Estados Financeiros
  const [costAmount, setCostAmount] = useState('');
  const [useCreditCard, setUseCreditCard] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [installmentCount, setInstallmentCount] = useState('1');
  const [manualDueDate, setManualDueDate] = useState(getTodayString());

  const isSubmitting = createTransfer.isPending;

  // Nomes para exibição
  const accountName = accounts?.find(a => a.id === selectedAccount)?.name || 'Titular';
  const sourceProgramName = programs?.find(p => p.id === sourceProgram)?.name || 'Origem';
  const destProgramName = programs?.find(p => p.id === destProgram)?.name || 'Destino';

  // --- LÓGICA DE SALDO ---
  const currentBalance = useMemo(() => {
    if (!selectedAccount || !sourceProgram || !milesBalance) return 0;
    const registro = milesBalance.find(
        m => m.account_id === selectedAccount && m.program_id === sourceProgram
    );
    return registro ? registro.balance : 0;
  }, [selectedAccount, sourceProgram, milesBalance]);

  // --- CÁLCULOS VISUAIS (Com Paridade Real) ---
  const calculation = useMemo(() => {
    const qtdOrigem = parseFloat(amount) || 0;
    const pIn = parseFloat(parityIn) || 1;
    const pOut = parseFloat(parityOut) || 1;
    const bonus = parseFloat(bonusPercent) || 0;
    const cost = parseFloat(costAmount.toString().replace(',', '.')) || 0;
    
    // Calcula a conversão base (ex: 148000 / 2 * 1 = 74000)
    const baseDestino = Math.floor((qtdOrigem / pIn) * pOut);
    
    // Calcula o bônus em cima do que chegou no destino (ex: 20% de 74000 = 14800)
    const bonusAmount = Math.floor(baseDestino * (bonus / 100));
    
    const totalDestino = baseDestino + bonusAmount;
    const hasBalance = currentBalance >= qtdOrigem;
    
    return { qtdOrigem, pIn, pOut, baseDestino, bonus, bonusAmount, totalDestino, hasBalance, cost };
  }, [amount, parityIn, parityOut, bonusPercent, currentBalance, costAmount]);

  const handleUseMax = () => {
    setAmount(currentBalance.toString());
  };

  // --- CÁLCULOS DO CARTÃO ---
  const firstPaymentDate = useMemo(() => {
    if (useCreditCard && selectedCardId) {
      const card = creditCards?.find(c => c.id === selectedCardId);
      if (card) {
        return calculateCardDates(
          createSafeDate(date), 
          card.closing_day,
          card.due_day,
        );
      }
    }
    return manualDueDate ? createSafeDate(manualDueDate) : createSafeDate(date);
  }, [useCreditCard, selectedCardId, date, manualDueDate, creditCards]);

  const installmentPreview = useMemo(() => {
    const count = Number(installmentCount);
    if (!calculation.cost || count <= 0) return [];
    return generateInstallments(calculation.cost, count, firstPaymentDate);
  }, [calculation.cost, installmentCount, firstPaymentDate]);

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

    if (calculation.qtdOrigem <= 0 || calculation.pIn <= 0 || calculation.pOut <= 0) {
      toast.error('Quantidades e paridades devem ser maiores que zero.');
      return;
    }

    if (calculation.cost > 0 && useCreditCard && !selectedCardId) {
        toast.error('Selecione o cartão de crédito utilizado no custo.');
        return;
    }

    if (calculation.qtdOrigem > currentBalance) {
        if (!confirm(`ATENÇÃO: Você tem apenas ${currentBalance.toLocaleString()} na origem, mas quer transferir ${calculation.qtdOrigem.toLocaleString()}. O estoque ficará negativo. Deseja continuar?`)) {
            return;
        }
    }

    const dueDateList = installmentPreview.map(i => ({
        installmentNumber: i.installmentNumber,
        amount: i.amount,
        dueDate: format(i.dueDate, 'yyyy-MM-dd')
    }));

    try {
        await createTransfer.mutateAsync({
            contaOrigemId: selectedAccount,
            programaOrigemId: sourceProgram,
            contaDestinoId: selectedAccount, 
            programaDestinoId: destProgram,
            quantidadeOrigem: calculation.qtdOrigem,
            quantidadeDestino: calculation.totalDestino, 
            dataTransferencia: date,
            custoTransferencia: calculation.cost,
            useCreditCard: useCreditCard,
            cardId: selectedCardId,
            installments: Number(installmentCount),
            dueDateList: dueDateList,
            observacao: `Paridade ${parityIn}:${parityOut} | Bônus: ${bonusPercent}%`
        });

        // Limpa formulário
        setAmount('');
        setBonusPercent('0');
        setParityIn('1');
        setParityOut('1');
        setCostAmount('');
        
    } catch (error) {
        console.error("Erro no formulário:", error);
    }
  };

  return (
    <MainLayout>
      <PageHeader 
        title="Transferência Inteligente" 
        description="Transfira pontos com paridade personalizada, bônus real e custos."
      />

      <div className="grid gap-6 lg:grid-cols-12 max-w-7xl mx-auto pb-10">
        
        {/* ESQUERDA: INPUTS */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* PASSO 1: ROTA */}
          <Card className="border-l-4 border-l-primary shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                1. Rota da Transferência
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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

              <div className="grid md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3">
                    <Label className="text-muted-foreground">Sai de (Origem)</Label>
                    <Select value={sourceProgram} onValueChange={setSourceProgram}>
                        <SelectTrigger className="h-11 border-destructive/50 focus:ring-destructive">
                        <SelectValue placeholder="Ex: Esfera" />
                        </SelectTrigger>
                        <SelectContent>
                        {programs?.map(prog => (
                            <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-muted-foreground">Entra em (Destino)</Label>
                    <Select value={destProgram} onValueChange={setDestProgram}>
                        <SelectTrigger className="h-11 border-emerald-500/50 focus:ring-emerald-500">
                        <SelectValue placeholder="Ex: Iberia" />
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

          {/* PASSO 2: REGRAS E QUANTIDADE */}
          <Card className="border-l-4 border-l-secondary shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-5 w-5 text-secondary" />
                2. Regras e Quantidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Paridade Visual */}
              <div className="space-y-3">
                  <Label>Paridade (Fator de Conversão)</Label>
                  <div className="flex items-center justify-between bg-muted/20 p-4 rounded-xl border border-border/50">
                      <div className="flex flex-col items-center gap-2 w-1/3">
                          <span className="text-xs text-muted-foreground uppercase font-semibold text-center truncate w-full">{sourceProgramName}</span>
                          <Input 
                              type="number" 
                              className="h-12 text-xl font-black text-center shadow-sm" 
                              value={parityIn} 
                              onChange={e => setParityIn(e.target.value)} 
                          />
                      </div>
                      <div className="flex flex-col items-center justify-center w-1/3 pt-6">
                          <ArrowRight className="h-6 w-6 text-muted-foreground mb-1" />
                          <Badge variant="secondary" className="text-[10px]">EQUIVALE A</Badge>
                      </div>
                      <div className="flex flex-col items-center gap-2 w-1/3">
                          <span className="text-xs text-muted-foreground uppercase font-semibold text-center truncate w-full">{destProgramName}</span>
                          <Input 
                              type="number" 
                              className="h-12 text-xl font-black text-center shadow-sm" 
                              value={parityOut} 
                              onChange={e => setParityOut(e.target.value)} 
                          />
                      </div>
                  </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-2">
                {/* Quantidade */}
                <div className="space-y-2">
                  <Label className="text-destructive font-medium">Qtd. de Pontos a Enviar</Label>
                  <div className="relative">
                    <Input 
                        type="number" 
                        placeholder="0" 
                        className={`h-12 text-lg font-bold pl-4 border-destructive/30 focus-visible:ring-destructive ${!calculation.hasBalance ? 'text-destructive' : ''}`}
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                    />
                    <div className="absolute right-3 top-3 text-xs font-bold text-destructive/70 px-2 py-0.5 rounded bg-destructive/10">SAÍDA</div>
                  </div>
                  {selectedAccount && sourceProgram && (
                      <div className="flex items-center justify-between text-xs mt-1">
                          <span className={`font-medium ${!calculation.hasBalance ? 'text-destructive' : 'text-muted-foreground'}`}>
                              Estoque atual: {currentBalance.toLocaleString('pt-BR')}
                          </span>
                          <Button variant="link" className="h-auto p-0 text-xs text-primary" onClick={handleUseMax}>Usar tudo</Button>
                      </div>
                  )}
                </div>
                
                {/* Bônus */}
                <div className="space-y-2">
                  <Label className="text-emerald-500 font-medium flex items-center gap-1">Bônus da Promoção</Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-3 h-5 w-5 text-emerald-500/50" />
                    <Input 
                        type="number" 
                        placeholder="0" 
                        className="h-12 text-lg font-bold text-emerald-500 pl-10 border-emerald-500/30 focus-visible:ring-emerald-500"
                        value={bonusPercent}
                        onChange={e => setBonusPercent(e.target.value)}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">O bônus é aplicado sobre a conversão base.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PASSO 3: FINANCEIRO */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                3. Custos e Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Data da Operação</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="date" 
                      className="pl-9 h-11"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Custo da Operação (R$)</Label>
                  <Input 
                      type="text" 
                      placeholder="Ex: 1154,75 (Compra de pontos)" 
                      className="h-11"
                      value={costAmount}
                      onChange={e => setCostAmount(e.target.value)}
                  />
                </div>
              </div>

              {calculation.cost > 0 && (
                <div className="space-y-4 pt-4 border-t animate-in fade-in">
                    <div className="flex items-center justify-between bg-muted/20 p-3 rounded-lg border">
                        <Label className="flex items-center gap-2 cursor-pointer font-medium">
                            <CreditCard className="h-4 w-4 text-primary" />
                            Paguei com Cartão de Crédito
                        </Label>
                        <Switch checked={useCreditCard} onCheckedChange={setUseCreditCard} />
                    </div>

                    {useCreditCard ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cartão Utilizado</Label>
                                <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>{creditCards?.map(card => (<SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>))}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Parcelas</Label>
                                <Select value={installmentCount} onValueChange={setInstallmentCount}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(n => (<SelectItem key={n} value={n.toString()}>{n}x</SelectItem>))}</SelectContent>
                                </Select>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label className="flex items-center justify-between">
                                Vencimento (Dinheiro/Pix)
                                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-primary p-0" onClick={() => setManualDueDate(getTodayString())}>
                                    <CalendarCheck className="w-3 h-3 mr-1"/> Hoje
                                </Button>
                            </Label>
                            <Input type="date" className="max-w-[200px]" value={manualDueDate} onChange={e => setManualDueDate(e.target.value)} />
                        </div>
                    )}

                    {installmentPreview.length > 0 && (
                        <div className="pt-2">
                            <Label className="text-xs text-muted-foreground mb-2 block">Previsão Contas a Pagar</Label>
                            <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2 bg-background/50">
                                {installmentPreview.map(inst => (
                                    <div key={inst.installmentNumber} className="flex justify-between items-center text-xs p-1">
                                        <span className="text-muted-foreground">{inst.installmentNumber}ª parc - {format(inst.dueDate, 'dd/MM/yy')}</span>
                                        <span className="font-medium text-destructive">{formatCurrency(inst.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* DIREITA: RESUMO */}
        <div className="lg:col-span-5 space-y-6">
            <Card className="h-full border border-primary/20 shadow-xl sticky top-6 flex flex-col bg-gradient-to-b from-card to-muted/10">
                <CardHeader className="bg-muted/20 border-b pb-4">
                    <CardTitle className="flex items-center justify-center gap-2 text-primary">
                        <Wallet className="h-5 w-5" />
                        Resumo da Operação
                    </CardTitle>
                </CardHeader>
                
                <CardContent className="flex-1 space-y-6 pt-6">
                    <div className="text-center space-y-1">
                        <span className="text-sm text-muted-foreground">Titular da Conta</span>
                        <div className="font-bold text-lg flex items-center justify-center gap-2">
                            <User className="h-4 w-4 text-primary" /> {accountName}
                        </div>
                    </div>
                    
                    <div className="relative p-5 rounded-xl border bg-background shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground font-bold tracking-wider">SAI DE</span>
                            <Badge variant="destructive" className="uppercase">{sourceProgramName}</Badge>
                        </div>
                        <div className="flex justify-center -my-4 z-10">
                            <div className="bg-background p-1.5 rounded-full border shadow-sm">
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-muted-foreground font-bold tracking-wider">ENTRA EM</span>
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 uppercase">{destProgramName}</Badge>
                        </div>
                    </div>

                    <div className="border-t border-dashed" />

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground font-medium">Saída (Origem)</span>
                            <span className="font-bold text-destructive text-lg">- {calculation.qtdOrigem.toLocaleString('pt-BR')}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                                Conversão ({calculation.pIn}:{calculation.pOut})
                            </span>
                            <span className="font-medium text-foreground">
                                {calculation.baseDestino.toLocaleString('pt-BR')}
                            </span>
                        </div>

                        {calculation.bonus > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Bônus (+{calculation.bonus}%)</span>
                                <span className="font-bold text-emerald-500">+ {calculation.bonusAmount.toLocaleString('pt-BR')}</span>
                            </div>
                        )}

                        {calculation.cost > 0 && (
                            <div className="flex justify-between items-center bg-destructive/10 p-2.5 rounded-lg border border-destructive/20 text-destructive mt-2">
                                <span className="text-sm font-semibold">Custo em Dinheiro</span>
                                <span className="font-bold">- {formatCurrency(calculation.cost)}</span>
                            </div>
                        )}

                        <div className="bg-primary/10 p-5 rounded-xl border border-primary/30 mt-6 shadow-sm">
                            <div className="text-xs text-primary uppercase tracking-widest mb-1 text-center font-bold">Saldo Final a Receber</div>
                            <div className="text-4xl font-black text-center text-primary tracking-tight">
                                {calculation.totalDestino.toLocaleString('pt-BR')}
                            </div>
                            <div className="text-center text-xs text-muted-foreground mt-2 font-medium">
                                creditados em {destProgramName}
                            </div>
                        </div>
                    </div>
                </CardContent>

                <div className="p-6 pt-0 mt-auto">
                    <Button 
                        className="w-full h-14 text-lg font-bold shadow-lg hover:scale-[1.02] transition-transform" 
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
