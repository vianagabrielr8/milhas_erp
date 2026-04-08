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
import { toast } from 'sonner';
import { ArrowRight, Calculator, CalendarIcon, User, Wallet, ArrowRightLeft, CreditCard, Scale, Percent, ShoppingCart, Plus, CalendarCheck } from 'lucide-react';

// IMPORTANTE: Importamos o Modal de Compra Real
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
  
  // Estados de Regra de Negócio (UX)
  const [parityIn, setParityIn] = useState('1');
  const [parityOut, setParityOut] = useState('1');
  const [bonusPercent, setBonusPercent] = useState('0');

  // Estados de Compra Vinculada (NOVO UX)
  const [purchasedTotalCost, setPurchasedTotalCost] = useState<number | null>(null);
  const [linkedPurchaseId, setLinkedPurchaseId] = useState<string | null>(null);

  // Estado do Modal de Compra (NOVO UX)
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

  // --- CÁLCULOS VISUAIS (Com Paridade Real) ---
  const calculation = useMemo(() => {
    const qtdOrigem = parseFloat(amount) || 0;
    const pIn = parseFloat(parityIn) || 1;
    const pOut = parseFloat(parityOut) || 1;
    const bonus = parseFloat(bonusPercent) || 0;
    const cost = purchasedTotalCost || 0;
    
    // Calcula a conversão base (ex: 148000 / 2 * 1 = 74000)
    const baseDestino = Math.floor((qtdOrigem / pIn) * pOut);
    
    // Calcula o bônus em cima do que chegou no destino (ex: 20% de 74000 = 14800)
    const bonusAmount = Math.floor(baseDestino * (bonus / 100));
    
    const totalDestino = baseDestino + bonusAmount;
    const hasBalance = currentBalance >= qtdOrigem;
    
    return { qtdOrigem, pIn, pOut, baseDestino, bonus, bonusAmount, totalDestino, hasBalance, cost };
  }, [amount, parityIn, parityOut, bonusPercent, currentBalance, purchasedTotalCost]);

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
            // Custo agora vem da compra vinculada
            custoTransferencia: purchasedTotalCost || 0,
            linkedPurchaseId: linkedPurchaseId || null, 
            observacao: `Paridade ${parityIn}:${parityOut} | Bônus: ${bonusPercent}%${linkedPurchaseId ? ` | Custo de Compra #${linkedPurchaseId.slice(0, 8)}` : ''}`
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
      // 1. Vincula o ID da compra à transferência para rastreio
      setLinkedPurchaseId(newTransactionId);
      // 2. Preenche automaticamente o custo total na transferência (O PULO DO GATO!)
      setPurchasedTotalCost(totalCost);
      // 3. Fecha o modal
      setIsPurchaseModalOpen(false);
      // 4. Feedback visual
      toast.success(`Compra #${newTransactionId.slice(0, 8)} de R$ ${totalCost.toLocaleString('pt-BR')} vinculada com sucesso!`);
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

          {/* PASSO 2: REGRAS E QUANTIDADE */}
          <Card className="border-l-4 border-l-secondary shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-5 w-5 text-secondary" />
                2. Regras e Quantidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
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

              <div className="grid md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <Label className="text-destructive font-medium">Qtd. de Pontos a Enviar</Label>
                  <div className="relative">
                    <Input type="number" placeholder="0" className={`h-12 text-lg font-bold pl-4 border-destructive/30 focus-visible:ring-destructive ${!calculation.hasBalance ? 'text-destructive' : ''}`} value={amount} onChange={e => setAmount(e.target.value)} />
                    <div className="absolute right-3 top-3 text-xs font-bold text-destructive/70 px-2 py-0.5 rounded bg-destructive/10">SAÍDA</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-emerald-500 font-medium flex items-center gap-1">Bônus da Promoção (%)</Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-3 h-5 w-5 text-emerald-500/50" />
                    <Input type="number" placeholder="0" className="h-12 text-lg font-bold text-emerald-500 pl-10 border-emerald-500/30 focus-visible:ring-emerald-500" value={bonusPercent} onChange={e => setBonusPercent(e.target.value)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PASSO 3: CUSTOS - NOVA UX VINCULADA À COMPRA REAL */}
          <Card className="shadow-sm border-l-4 border-l-accent">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-accent">
                <ShoppingCart className="h-5 w-5" />
                3. Custos Adicionais (Carrinho) e Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
                <div className="grid md:grid-cols-2 gap-6 items-end">
                    <div className="space-y-2 relative">
                        <Label>Data da Operação (Saída)</Label>
                        <Input type="date" className="h-11" value={date} onChange={e => setDate(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                            Custo da Operação (R$)
                            {linkedPurchaseId && (<Badge className="bg-success text-success-foreground h-5 text-[10px]" variant="secondary">Vinculado à Compra #{linkedPurchaseId.slice(0, 8)}</Badge>)}
                        </Label>
                        <div className="flex gap-2">
                            {/* O campo de custo agora é READ-ONLY. O valor vem do modal. */}
                            <Input 
                                type="text" 
                                placeholder="Clique no botão para vincular compra" 
                                className="h-11 bg-muted/50 font-semibold"
                                value={purchasedTotalCost !== null ? purchasedTotalCost.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : ''}
                                readOnly
                            />
                            {/* NOVO BOTÃO UX: Abre o modal de compra detalhada */}
                            <Button 
                                type="button" 
                                className="gradient-primary h-11 flex items-center gap-2"
                                onClick={() => setIsPurchaseModalOpen(true)}
                                title="Abra a janela de Nova Compra para detalhar o custo do carrinho, cartão e parcelas."
                            >
                                <ShoppingCart className="h-4 w-4" />
                                + Vincular Compra
                            </Button>
                        </div>
                    </div>
                </div>
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
                            <div className="flex justify-between items-center bg-destructive/10 p-2.5 rounded-lg border border-destructive/20 text-destructive mt-2">
                                <span className="text-sm font-semibold flex items-center gap-1"><CreditCard className="h-3 w-3" /> Custo Vinculado (Carrinho)</span>
                                <span className="font-bold">- {formatCurrency(calculation.cost)}</span>
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

      {/* --- O PULO DO GATO NO UX: Injeta o Modal de Nova Compra/Transação --- */}
      <TransactionModal
          open={isPurchaseModalOpen}
          onOpenChange={(open) => {
              setIsPurchaseModalOpen(open);
              // Limpa os vínculos se fechar o modal sem salvar (cancelar)
              if (!open && !linkedPurchaseId) {
                  setPurchasedTotalCost(null);
                  setLinkedPurchaseId(null);
              }
          }}
          // IMPORTANTE: Adiciona uma propriedade para receber o ID e o custo calculados
          onSuccessCallback={handlePurchaseComplete}
      />
    </MainLayout>
  );
};

export default Transferencias;
