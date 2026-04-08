import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
    useAccounts, 
    usePrograms, 
    useMilesBalance, 
    useCreateTransfer
} from '@/hooks/useSupabaseData';
import { formatCurrency } from '@/utils/financeLogic';
import { toast } from 'sonner';
import { ArrowRight, Calculator, CalendarIcon, User, Wallet, ArrowRightLeft, Scale, Percent, ShoppingCart } from 'lucide-react';

// Importamos o Modal de Compra Real
import { TransactionModal } from '@/components/transactions/TransactionModal';

// --- UTILITÁRIO DATA SEGURA ---
const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const Transferencias = () => {
  const { data: accounts } = useAccounts();
  const { data: programs } = usePrograms();
  const { data: milesBalance } = useMilesBalance();
  
  const createTransfer = useCreateTransfer();

  // Estados Base
  const [selectedAccount, setSelectedAccount] = useState('');
  const [sourceProgram, setSourceProgram] = useState('');
  const [destProgram, setDestProgram] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayString());
  
  // Estados de Regra de Negócio
  const [parityIn, setParityIn] = useState('1');
  const [parityOut, setParityOut] = useState('1');
  const [bonusPercent, setBonusPercent] = useState('0');

  // Estados de Compra Vinculada (Visual)
  const [purchasedTotalCost, setPurchasedTotalCost] = useState<number | null>(null);
  const [linkedPurchaseId, setLinkedPurchaseId] = useState<string | null>(null);

  // Estado do Modal de Compra
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

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

  // --- CÁLCULOS VISUAIS ---
  const calculation = useMemo(() => {
    const qtdOrigem = parseFloat(amount) || 0;
    const pIn = parseFloat(parityIn) || 1;
    const pOut = parseFloat(parityOut) || 1;
    const bonus = parseFloat(bonusPercent) || 0;
    
    // Calcula a conversão base
    const baseDestino = Math.floor((qtdOrigem / pIn) * pOut);
    
    // Calcula o bônus em cima do que chegou no destino
    const bonusAmount = Math.floor(baseDestino * (bonus / 100));
    
    const totalDestino = baseDestino + bonusAmount;
    const hasBalance = currentBalance >= qtdOrigem;
    
    return { qtdOrigem, pIn, pOut, baseDestino, bonus, bonusAmount, totalDestino, hasBalance };
  }, [amount, parityIn, parityOut, bonusPercent, currentBalance]);

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

    if (calculation.qtdOrigem <= 0 || calculation.pIn <= 0 || calculation.pOut <= 0) {
      toast.error('Quantidades e paridades devem ser maiores que zero.');
      return;
    }

    if (calculation.qtdOrigem > currentBalance) {
        if (!confirm(`ATENÇÃO: Você tem apenas ${currentBalance.toLocaleString()} na origem, mas quer transferir ${calculation.qtdOrigem.toLocaleString()}. O estoque ficará negativo. Deseja continuar?`)) {
            return;
        }
    }

    try {
        await createTransfer.mutateAsync({
            contaOrigemId: selectedAccount,
            programaOrigemId: sourceProgram,
            contaDestinoId: selectedAccount, 
            programaDestinoId: destProgram,
            quantidadeOrigem: calculation.qtdOrigem,
            quantidadeDestino: calculation.totalDestino, 
            dataTransferencia: date,
            // ATENÇÃO: Como a compra foi feita no Modal, ela já entrou no custo da Origem!
            // Não enviamos custo extra aqui para não duplicar no Contas a Pagar.
            custoTransferencia: 0, 
            observacao: `Paridade ${parityIn}:${parityOut} | Bônus: ${bonusPercent}%${linkedPurchaseId ? ` (Carrinho #${linkedPurchaseId.slice(0, 8)})` : ''}`
        });

        // Limpa formulário
        setAmount('');
        setBonusPercent('0');
        setParityIn('1');
        setParityOut('1');
        setPurchasedTotalCost(null);
        setLinkedPurchaseId(null);
        
    } catch (error) {
        console.error("Erro no formulário:", error);
    }
  };

  // --- FUNÇÃO DE SUCESSO DO MODAL DE COMPRA ---
  const handlePurchaseComplete = (newTransactionId: string, totalCost: number) => {
      setLinkedPurchaseId(newTransactionId);
      setPurchasedTotalCost(totalCost);
      setIsPurchaseModalOpen(false);
      toast.success(`Compra registrada! Seu saldo na Origem foi atualizado.`);
  };

  return (
    <MainLayout>
      <PageHeader 
        title="Transferência Inteligente" 
        description="Transfira pontos com paridade personalizada, bônus real e vincule compras detalhadas."
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

          {/* PASSO 2: REGRAS E QUANTIDADE (AGORA COM A DATA AQUI) */}
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
                          <Input type="number" className="h-12 text-xl font-black text-center shadow-sm" value={parityIn} onChange={e => setParityIn(e.target.value)} />
                      </div>
                      <div className="flex flex-col items-center justify-center w-1/3 pt-6">
                          <ArrowRight className="h-6 w-6 text-muted-foreground mb-1" />
                          <Badge variant="secondary" className="text-[10px]">EQUIVALE A</Badge>
                      </div>
                      <div className="flex flex-col items-center gap-2 w-1/3">
                          <span className="text-xs text-muted-foreground uppercase font-semibold text-center truncate w-full">{destProgramName}</span>
                          <Input type="number" className="h-12 text-xl font-black text-center shadow-sm" value={parityOut} onChange={e => setParityOut(e.target.value)} />
                      </div>
                  </div>
              </div>

              {/* GRID DE 3 COLUNAS: Qtd, Bônus, Data */}
              <div className="grid md:grid-cols-3 gap-4 pt-2">
                {/* Quantidade */}
                <div className="space-y-2">
                  <Label className="text-destructive font-medium">Qtd. de Saída</Label>
                  <div className="relative">
                    <Input 
                        type="number" 
                        placeholder="0" 
                        className={`h-11 font-bold pl-3 border-destructive/30 focus-visible:ring-destructive ${!calculation.hasBalance ? 'text-destructive' : ''}`}
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                    />
                  </div>
                  {selectedAccount && sourceProgram && (
                      <div className="flex items-center justify-between text-[11px] mt-1">
                          <span className={`${!calculation.hasBalance ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                              Estoque: {currentBalance.toLocaleString('pt-BR')}
                          </span>
                          <Button variant="link" className="h-auto p-0 text-[11px] text-primary" onClick={handleUseMax}>Usar tudo</Button>
                      </div>
                  )}
                </div>
                
                {/* Bônus */}
                <div className="space-y-2">
                  <Label className="text-emerald-500 font-medium">Bônus Promo (%)</Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-3 h-4 w-4 text-emerald-500/50" />
                    <Input 
                        type="number" 
                        placeholder="0" 
                        className="h-11 font-bold text-emerald-500 pl-9 border-emerald-500/30 focus-visible:ring-emerald-500"
                        value={bonusPercent}
                        onChange={e => setBonusPercent(e.target.value)}
                    />
                  </div>
                </div>

                {/* Data */}
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
              </div>
            </CardContent>
          </Card>

          {/* PASSO 3: COMPRA DE PONTOS (UX LIMPO) */}
          <Card className="shadow-sm border-l-4 border-l-accent">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-accent">
                <ShoppingCart className="h-5 w-5" />
                3. Compra de Pontos (Opcional)
              </CardTitle>
            </CardHeader>
            <CardContent>
                {!linkedPurchaseId ? (
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl bg-muted/10 hover:bg-muted/30 transition-colors">
                        <p className="text-sm text-muted-foreground mb-4 text-center leading-relaxed">
                            Faltaram milhas na conta de origem?<br/>
                            Registre a compra que você fez no carrinho para que o sistema<br/>
                            atualize seu estoque e alimente o <strong>Contas a Pagar</strong> corretamente.
                        </p>
                        <Button 
                            type="button" 
                            className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm"
                            onClick={() => setIsPurchaseModalOpen(true)}
                        >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            + Registrar Compra de Pontos
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between p-4 bg-success/10 border border-success/20 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-success/20 p-3 rounded-full">
                                <ShoppingCart className="h-5 w-5 text-success" />
                            </div>
                            <div>
                                <p className="font-bold text-success-foreground">Compra vinculada e Estoque atualizado!</p>
                                <p className="text-xs text-success-foreground/80 mt-0.5">
                                    Valor da compra: {purchasedTotalCost?.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} (Ref: #{linkedPurchaseId.slice(0,8)})
                                </p>
                            </div>
                        </div>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                                setLinkedPurchaseId(null);
                                setPurchasedTotalCost(null);
                            }}
                        >
                            Remover Vínculo
                        </Button>
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
                            <span className="text-sm text-muted-foreground">Conversão Base ({calculation.pIn}:{calculation.pOut})</span>
                            <span className="font-medium text-foreground">{calculation.baseDestino.toLocaleString('pt-BR')}</span>
                        </div>

                        {calculation.bonus > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Bônus Real (+{calculation.bonus}%)</span>
                                <span className="font-bold text-emerald-500">+ {calculation.bonusAmount.toLocaleString('pt-BR')}</span>
                            </div>
                        )}

                        {calculation.cost > 0 && (
                            <div className="flex justify-between items-center bg-accent/10 p-2.5 rounded-lg border border-accent/20 text-accent mt-2">
                                <span className="text-sm font-semibold flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> Custo do Carrinho</span>
                                <span className="font-bold">{formatCurrency(calculation.cost)}</span>
                            </div>
                        )}

                        <div className="bg-primary/10 p-5 rounded-xl border border-primary/30 mt-6 shadow-sm">
                            <div className="text-xs text-primary uppercase tracking-widest mb-1 text-center font-bold">Saldo Final a Receber</div>
                            <div className="text-4xl font-black text-center text-primary tracking-tight">{calculation.totalDestino.toLocaleString('pt-BR')}</div>
                            <div className="text-center text-xs text-muted-foreground mt-2 font-medium">creditados em {destProgramName}</div>
                        </div>
                    </div>
                </CardContent>

                <div className="p-6 pt-0 mt-auto">
                    <Button 
                        className="w-full h-14 text-lg font-bold shadow-lg gradient-primary hover:scale-[1.02] transition-transform" 
                        onClick={handleTransfer}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Processando...' : 'Confirmar Transferência'}
                    </Button>
                </div>
            </Card>
        </div>
      </div>

      {/* --- MODAL DE COMPRA --- */}
      <TransactionModal
          open={isPurchaseModalOpen}
          onOpenChange={(open) => {
              setIsPurchaseModalOpen(open);
              if (!open && !linkedPurchaseId) {
                  setPurchasedTotalCost(null);
                  setLinkedPurchaseId(null);
              }
          }}
          onSuccessCallback={handlePurchaseComplete}
      />
    </MainLayout>
  );
};

export default Transferencias;
