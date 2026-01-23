import { useEffect, useMemo, useState } from 'react';
import { format, subYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; 
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select'; 
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Calendar,
  Wallet,
  AlertTriangle,
  CalendarCheck,
  Loader2,
  Plane, 
} from 'lucide-react';

import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useData } from '@/contexts/DataContext';

import {
  useCreditCards,
  useSuppliers,
  useCreateTransaction,
  useCreatePayable,
  useCreatePayableInstallments,
  useCreateReceivable,
  useCreateReceivableInstallments,
} from '@/hooks/useSupabaseData';

import {
  calculateCardDates,
  generateInstallments,
  formatCPM,
  formatCurrency,
  calculateSaleProfit,
} from '@/utils/financeLogic';

import { Database } from '@/integrations/supabase/types';

// --- UTILITÁRIO 1: PEGAR DATA DE HOJE SEM ERRO DE FUSO ---
// Retorna string "YYYY-MM-DD" baseada no horário local do navegador
const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- UTILITÁRIO 2: CRIAR DATA SEGURA PARA CÁLCULOS ---
// Adiciona T12:00:00 para garantir que o fuso horário não jogue pro dia anterior
const createSafeDate = (dateString: string) => {
    if (!dateString) return new Date();
    return new Date(`${dateString}T12:00:00`);
};

type TransactionType =
  Database['public']['Enums']['transaction_type'];

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionModal({
  open,
  onOpenChange,
}: TransactionModalProps) {
  const { vendas, programas, contas, passageiros, isLoading } = useData();
  const vendasSafe = vendas ?? []; 

  const { data: creditCards } = useCreditCards();
  const { data: suppliers } = useSuppliers(); 

  const createTransaction = useCreateTransaction();
  const createPayable = useCreatePayable();
  const createPayableInstallments = useCreatePayableInstallments();
  const createReceivable = useCreateReceivable();
  const createReceivableInstallments = useCreateReceivableInstallments();

  // IDs
  const [accountId, setAccountId] = useState('');
  const [programId, setProgramId] = useState('');
  const [clientId, setClientId] = useState(''); 
  const [supplierId, setSupplierId] = useState(''); 

  // Inputs de Busca
  const [searchConta, setSearchConta] = useState('');
  const [searchPrograma, setSearchPrograma] = useState('');
  const [searchPassageiro, setSearchPassageiro] = useState('');

  const [transactionType, setTransactionType] = useState<TransactionType>('COMPRA');
  const [quantity, setQuantity] = useState('');
  const [pricePerThousand, setPricePerThousand] = useState('');
  
  // --- DATAS (Inicializa como string simples) ---
  const [transactionDate, setTransactionDate] = useState(getTodayString());
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');

  // Taxas
  const [hasTax, setHasTax] = useState(false);
  const [taxType, setTaxType] = useState<'MONEY' | 'MILES'>('MONEY');
  const [taxAmount, setTaxAmount] = useState(''); 

  const [useCreditCard, setUseCreditCard] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [installmentCount, setInstallmentCount] = useState('1');
  const [manualDueDate, setManualDueDate] = useState(getTodayString());

  const [useInstallments, setUseInstallments] = useState(false);
  const [saleInstallments, setSaleInstallments] = useState('1');
  const [firstReceiveDate, setFirstReceiveDate] = useState(getTodayString());

  const [isSubmitting, setIsSubmitting] = useState(false);

  // RESET
  useEffect(() => {
    if (open) {
      const hoje = getTodayString();
      setAccountId('');
      setProgramId('');
      setClientId('');
      setSupplierId('');
      setSearchConta('');
      setSearchPrograma('');
      setSearchPassageiro('');
      setTransactionType('COMPRA');
      setQuantity('');
      setPricePerThousand('');
      setTransactionDate(hoje);
      setManualDueDate(hoje);
      setExpirationDate('');
      setNotes('');
      setHasTax(false);
      setTaxType('MONEY');
      setTaxAmount('');
      setUseCreditCard(false);
      setSelectedCardId('');
      setInstallmentCount('1');
      setUseInstallments(false);
      setSaleInstallments('1');
      setFirstReceiveDate(hoje);
    }
  }, [open]);

  // Lógica Visual Dropdowns
  const showContaList = searchConta && !contas?.some(c => c.name === searchConta);
  const showProgramaList = searchPrograma && !programas?.some(p => p.name === searchPrograma);
  const showPassageiroList = searchPassageiro && !passageiros?.some(p => p.name === searchPassageiro);

  const finalValues = useMemo(() => {
    const baseQ = Number(quantity) || 0;
    const price = Number(pricePerThousand) || 0;
    const taxVal = Number(taxAmount) || 0;

    let finalQty = baseQ;
    let finalRevenue = (baseQ / 1000) * price;

    if (hasTax && taxVal > 0) {
        if (taxType === 'MONEY') {
            finalRevenue += taxVal;
        } else {
            finalQty += taxVal;
            finalRevenue = (finalQty / 1000) * price;
        }
    }

    return { 
        qty: finalQty, 
        revenue: finalRevenue,
        baseRevenue: (baseQ / 1000) * price 
    };
  }, [quantity, pricePerThousand, hasTax, taxType, taxAmount]);

  const calculatedTotal = finalValues.revenue;

  // --- CÁLCULO DE DATA DO CARTÃO (USANDO DATA SEGURA COM MEIO-DIA) ---
  const firstPaymentDate = useMemo(() => {
    if (useCreditCard && selectedCardId) {
      const card = creditCards?.find(c => c.id === selectedCardId);
      if (card) {
        return calculateCardDates(
          createSafeDate(transactionDate), // AQUI: Força meio-dia
          card.closing_day,
          card.due_day,
        );
      }
    }
    // Pagamento manual
    return manualDueDate 
      ? createSafeDate(manualDueDate) // AQUI: Força meio-dia
      : createSafeDate(transactionDate);
  }, [useCreditCard, selectedCardId, transactionDate, manualDueDate, creditCards]);

  const installmentPreview = useMemo(() => {
    const count = Number(installmentCount);
    if (!calculatedTotal || count <= 0) return [];
    return generateInstallments(calculatedTotal, count, firstPaymentDate);
  }, [calculatedTotal, installmentCount, firstPaymentDate]);

  const avgCpm = useMemo(() => {
    const prog = programas?.find(p => p.id === programId);
    return Number((prog as any)?.avg_cpm) || 0;
  }, [programas, programId]);

  const saleProfit = useMemo(() => {
    if (finalValues.qty <= 0 || !finalValues.revenue) return null;
    return calculateSaleProfit(finalValues.revenue, finalValues.qty, avgCpm / 1000);
  }, [finalValues, avgCpm]);

  const purchaseCpm = useMemo(() => Number(pricePerThousand), [pricePerThousand]);

  const cpfAlert = useMemo(() => {
    if (transactionType !== 'VENDA' || !programId || !accountId || !clientId) return null;
    const prog = programas?.find(p => p.id === programId);
    const limite = Number((prog as any)?.cpf_limit) || 25;
    const umAnoAtras = subYears(new Date(), 1);
    const vendasRelevantes = vendasSafe.filter(
      v => v.contaId === accountId && v.programaId === programId && new Date(v.dataVenda) >= umAnoAtras,
    );
    const clientes = new Set(vendasRelevantes.map(v => v.clienteId));
    if (clientes.has(clientId)) return { type: 'success', msg: 'Passageiro já utilizado.' };
    if (clientes.size >= limite) return { type: 'error', msg: 'Limite de CPFs atingido.' };
    return { type: 'warning', msg: `Consumirá nova cota (${clientes.size + 1}/${limite})` };
  }, [transactionType, programId, accountId, clientId, vendasSafe, programas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountId || !programId || !quantity || !pricePerThousand || (transactionType === 'VENDA' && !clientId)) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não logado');

      const qty = Math.abs(finalValues.qty);
      const revenue = finalValues.revenue;

      let finalNotes = notes;
      if (hasTax && Number(taxAmount) > 0) {
          const taxInfo = taxType === 'MONEY' 
            ? `Taxa: R$ ${formatCurrency(Number(taxAmount))}` 
            : `Taxa: ${Number(taxAmount)} milhas`;
          finalNotes = notes ? `${notes} | ${taxInfo}` : taxInfo;
      }

      // --- O PULO DO GATO NO ENVIO ---
      // Enviamos a string PURA (ex: "2026-01-23"). 
      // Não convertemos para Date() antes de enviar.
      // O Supabase recebe string no campo Date e grava exatamente o que recebeu.
      const safeTransactionDate = transactionDate; 
      const safeExpirationDate = expirationDate || null;

      // 1. TRANSAÇÃO PRINCIPAL
      const transaction = await createTransaction.mutateAsync({
        account_id: accountId,
        program_id: programId,
        type: transactionType,
        quantity:
          transactionType === 'VENDA' || transactionType === 'USO' || transactionType === 'TRANSF_SAIDA' || transactionType === 'EXPIROU'
            ? -qty 
            : qty,
        total_cost:
          (transactionType === 'COMPRA' || transactionType === 'TRANSF_ENTRADA' || transactionType === 'BONUS')
            ? revenue
            : null,
        sale_price:
          transactionType === 'VENDA'
            ? revenue
            : null,
        transaction_date: safeTransactionDate, // ENVIA STRING PURA
        expiration_date: safeExpirationDate,   // ENVIA STRING PURA
        notes: finalNotes || null,
        supplier_id: supplierId || null,
        client_id: clientId || null,
        user_id: user.id,
      });

      // 2. CONTAS A PAGAR
      if (transactionType === 'COMPRA') {
        const payable = await createPayable.mutateAsync({
            transaction_id: transaction.id,
            credit_card_id: useCreditCard ? selectedCardId : null,
            description: 'Compra de Milhas', 
            total_amount: revenue,
            installments: Number(installmentCount),
            user_id: user.id,
          });

        await createPayableInstallments.mutateAsync(
          installmentPreview.map(i => ({
            payable_id: payable.id,
            installment_number: i.installmentNumber,
            amount: i.amount,
            // Formatamos a data calculada (que já foi protegida com T12:00:00) de volta para string YYYY-MM-DD
            due_date: format(i.dueDate, 'yyyy-MM-dd'),
            status: 'pendente',
            user_id: user.id,
          })),
        );
      }
      
      // 3. CONTAS A RECEBER
      if (transactionType === 'VENDA' && useInstallments) {
            const program = programas?.find(p => p.id === programId);
            const passageiro = passageiros?.find(p => p.id === clientId);
            const description = `Venda Milhas - ${program?.name || 'Programa'}${passageiro ? ` - ${passageiro.name}` : ''}`;

            const receivable = await createReceivable.mutateAsync({
                transaction_id: transaction.id,
                description,
                total_amount: revenue, 
                installments: Number(saleInstallments),
                user_id: user.id,
            });

            // Gera parcelas usando data segura (Meio-dia)
            const safeReceivingDate = createSafeDate(firstReceiveDate);

            await createReceivableInstallments.mutateAsync(
                generateInstallments(revenue, Number(saleInstallments), safeReceivingDate).map(i => ({
                    receivable_id: receivable.id,
                    installment_number: i.installmentNumber,
                    amount: i.amount,
                    due_date: format(i.dueDate, 'yyyy-MM-dd'),
                    status: 'pendente',
                    user_id: user.id,
                }))
            );
        }

      toast.success('Transação registrada');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {transactionType === 'COMPRA' && <TrendingDown className="h-5 w-5 text-destructive" />}
            {transactionType === 'VENDA' && <TrendingUp className="h-5 w-5 text-success" />}
            {transactionType === 'BONUS' && <Wallet className="h-5 w-5 text-primary" />}
            Nova Transação
        </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* --- BLOCO CONTA E PROGRAMA (LIMPO) --- */}
          <div className="grid grid-cols-2 gap-4">
            {/* CONTA */}
            <div className="relative">
              <Label htmlFor="searchConta">Conta *</Label>
              <Input
                id="searchConta"
                value={searchConta}
                onChange={e => setSearchConta(e.target.value)}
                placeholder="Buscar Conta"
                className="mt-1"
                autoComplete="off"
              />
              {/* SÓ MOSTRA SE TIVER TEXTO E NÃO FOR IGUAL AO SELECIONADO */}
              {showContaList && (
                <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-[200px] overflow-y-auto">
                  {(contas ?? [])
                    .filter(c => c.name.toLowerCase().includes(searchConta.toLowerCase()))
                    .map(c => (
                      <div
                        key={c.id}
                        className="px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          setAccountId(c.id);
                          setSearchConta(c.name);
                        }}
                      >
                        {c.name}
                    </div>
                  ))}
                  {contas?.filter(c => c.name.toLowerCase().includes(searchConta.toLowerCase())).length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhuma conta encontrada</div>
                  )}
              </div>
            )}
          </div>

            {/* PROGRAMA */}
            <div className="relative">
              <Label htmlFor="searchPrograma">Programa *</Label>
              <Input
                id="searchPrograma"
                value={searchPrograma}
                onChange={e => setSearchPrograma(e.target.value)}
                placeholder="Buscar Programa"
                className="mt-1"
                autoComplete="off"
              />
              {/* SÓ MOSTRA SE TIVER TEXTO E NÃO FOR IGUAL AO SELECIONADO */}
              {showProgramaList && (
                <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-[200px] overflow-y-auto">
                  {(programas ?? [])
                    .filter(p => p.name.toLowerCase().includes(searchPrograma.toLowerCase()))
                    .map(p => (
                      <div
                        key={p.id}
                        className="px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          setProgramId(p.id);
                          setSearchPrograma(p.name);
                        }}
                      >
                        {p.name}
                    </div>
                  ))}
                  {programas?.filter(p => p.name.toLowerCase().includes(searchPrograma.toLowerCase())).length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum programa encontrado</div>
                  )}
              </div>
            )}
            </div>
          </div>

            {/* TIPO DE TRANSAÇÃO */}
            <div className="space-y-2">
                <Label>Tipo de Transação *</Label>
                <Select value={transactionType} onValueChange={(v) => setTransactionType(v as TransactionType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="COMPRA">Compra</SelectItem>
                        <SelectItem value="VENDA">Venda</SelectItem>
                        <SelectItem value="BONUS">Bônus</SelectItem>
                        <SelectItem value="TRANSF_ENTRADA">Transferência Entrada</SelectItem>
                        <SelectItem value="TRANSF_SAIDA">Transferência Saída</SelectItem>
                        <SelectItem value="USO">Uso/Resgate</SelectItem>
                        <SelectItem value="EXPIROU">Expirado</SelectItem>
                    </SelectContent>
                </Select>
            </div>

          <Separator />
            
            {/* QUANTIDADE E VALOR UNITÁRIO */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Quantidade de Milhas (Base) *</Label>
                    <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Ex: 50000" min="1" required />
                </div>
                <div className="space-y-2">
                    <Label>{transactionType === 'VENDA' ? 'Valor Unitário (R$/1000) *' : 'Valor Compra (Milheiro) *'}</Label>
                    <div className="space-y-1">
                        <Input type="number" step="0.000001" value={pricePerThousand} onChange={e => setPricePerThousand(e.target.value)} placeholder="Ex: 20.50" min="0" required />
                        <div className="text-right text-sm font-medium text-muted-foreground">
                            Subtotal: {formatCurrency(finalValues.baseRevenue)}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SEÇÃO DE TAXAS --- */}
            {transactionType === 'VENDA' && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 cursor-pointer font-semibold text-primary">
                                <Plane className="h-4 w-4" />
                                Incluir Taxas de Embarque?
                            </Label>
                            <Switch checked={hasTax} onCheckedChange={setHasTax} />
                        </div>

                        {hasTax && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label>Como a taxa foi paga?</Label>
                                    <RadioGroup value={taxType} onValueChange={(v) => setTaxType(v as 'MONEY' | 'MILES')} className="flex gap-4">
                                        <div className="flex items-center space-x-2 border p-2 rounded w-full hover:bg-muted/50 cursor-pointer">
                                            <RadioGroupItem value="MONEY" id="r1" />
                                            <Label htmlFor="r1" className="cursor-pointer flex-1">Em Dinheiro (R$)</Label>
                                        </div>
                                        <div className="flex items-center space-x-2 border p-2 rounded w-full hover:bg-muted/50 cursor-pointer">
                                            <RadioGroupItem value="MILES" id="r2" />
                                            <Label htmlFor="r2" className="cursor-pointer flex-1">Em Milhas</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div className="space-y-2">
                                    <Label>
                                        {taxType === 'MONEY' ? 'Valor da Taxa (R$)' : 'Quantidade de Milhas da Taxa'}
                                    </Label>
                                    <Input 
                                        type="number" 
                                        value={taxAmount} 
                                        onChange={e => setTaxAmount(e.target.value)} 
                                        placeholder={taxType === 'MONEY' ? "0,00" : "0"}
                                        step={taxType === 'MONEY' ? "0.01" : "1"}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {taxType === 'MONEY' 
                                            ? "Esse valor será somado ao Contas a Receber." 
                                            : `Serão descontadas mais ${taxAmount || 0} milhas do estoque e o valor financeiro subirá proporcionalmente.`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* PREVIEWS */}
            {transactionType === 'COMPRA' && purchaseCpm > 0 && (
                <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">CPM desta compra:</span>
                            <Badge variant="secondary" className="text-lg">{formatCPM(purchaseCpm)}</Badge>
                        </div>
                    </CardContent>
                </Card>
            )}
            {transactionType === 'VENDA' && saleProfit && (
                <Card className={saleProfit.profit >= 0 ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}>
                    <CardContent className="pt-4 space-y-2">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                {saleProfit.profit >= 0 ? (<TrendingUp className="h-4 w-4 text-success" />) : (<AlertTriangle className="h-4 w-4 text-destructive" />)}
                                <span className="font-medium">Previsão Final</span>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                                Total a Receber: <span className="font-bold text-foreground text-sm">{formatCurrency(finalValues.revenue)}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div><span className="text-muted-foreground">Lucro Total</span><div className={`font-bold ${saleProfit.profit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(saleProfit.profit)}</div></div>
                            <div><span className="text-muted-foreground">Lucro/Milheiro</span><div className={`font-bold ${saleProfit.profitPerThousand >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCPM(saleProfit.profitPerThousand)}</div></div>
                            <div><span className="text-muted-foreground">Margem</span><div className={`font-bold ${saleProfit.margin >= 0 ? 'text-success' : 'text-destructive'}`}>{saleProfit.margin.toFixed(1)}%</div></div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* DATAS */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Data da Transação</Label>
                    <Input type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} required />
                </div>
                {transactionType === 'COMPRA' && (
                    <div className="space-y-2">
                        <Label>Data de Expiração</Label>
                        <Input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} />
                    </div>
                )}
            </div>

            {/* PASSAGEIRO */}
            {transactionType === 'VENDA' && (
                <div className="space-y-2 relative">
                    <Label htmlFor="searchPassageiro">Passageiro *</Label>
                    <Input
                        id="searchPassageiro"
                        value={searchPassageiro}
                        onChange={e => setSearchPassageiro(e.target.value)}
                        placeholder="Buscar Passageiro"
                        autoComplete="off"
                    />
                    {showPassageiroList && (
                        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-[200px] overflow-y-auto">
                            {(passageiros ?? [])
                                .filter(p => p.name.toLowerCase().includes(searchPassageiro.toLowerCase()))
                                .map(p => (
                                    <div
                                        key={p.id}
                                        className="px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                        onClick={() => {
                                            setClientId(p.id);
                                            setSearchPassageiro(p.name);
                                        }}
                                    >
                                        {p.name}
                                    </div>
                                ))}
                        </div>
                    )}
                    {cpfAlert && (<div className={`text-xs p-2 rounded border mt-2 flex items-center gap-2 ${cpfAlert.type === 'error' ? 'bg-destructive/10 text-destructive border-destructive/20' : cpfAlert.type === 'success' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>{cpfAlert.type === 'error' && <AlertTriangle className="h-3 w-3" />}{cpfAlert.type === 'success' && <TrendingUp className="h-3 w-3" />}{cpfAlert.msg}</div>)}
                </div>
            )}

            <Separator />

            {/* ÁREA DE PAGAMENTO - COMPRAS */}
            {transactionType === 'COMPRA' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Usou Cartão de Crédito?
                        </Label>
                        <Switch checked={useCreditCard} onCheckedChange={setUseCreditCard} />
                    </div>

                    {useCreditCard ? (
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Cartão</Label>
                                    <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                        <SelectContent>{creditCards?.map(card => (<SelectItem key={card.id} value={card.id}>{card.name} (Fecha: {card.closing_day})</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Parcelas</Label>
                                    <Select value={installmentCount} onValueChange={setInstallmentCount}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(n => (<SelectItem key={n} value={n.toString()}>{n}x de {formatCurrency(calculatedTotal / n)}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
                            <div className="space-y-2">
                                <Label className="flex items-center justify-between">
                                    Data do Pagamento (Vencimento)
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs text-primary"
                                        onClick={() => setManualDueDate(getTodayString())}
                                    >
                                        <CalendarCheck className="w-3 h-3 mr-1"/>
                                        Pagar Hoje
                                    </Button>
                                </Label>
                                <Input type="date" value={manualDueDate} onChange={e => setManualDueDate(e.target.value)} />
                            </div>
                        </div>
                    )}

                    {installmentPreview.length > 0 && (
                        <Card>
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Previsão de Pagamentos</span>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {installmentPreview.map(inst => (
                                        <div key={inst.installmentNumber} className="flex justify-between items-center text-sm p-2 rounded bg-background">
                                            <span className="text-muted-foreground">{inst.installmentNumber}ª parcela - {format(inst.dueDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
                                            <span className="font-medium">{formatCurrency(inst.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* VENDAS PARCELADAS (RECEBIMENTO) */}
            {transactionType === 'VENDA' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Recebimento Parcelado?
                        </Label>
                        <Switch checked={useInstallments} onCheckedChange={setUseInstallments} />
                    </div>
                    {useInstallments && (
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Parcelas</Label>
                                    <Select value={saleInstallments} onValueChange={setSaleInstallments}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(n => (<SelectItem key={n} value={n.toString()}>{n}x de {formatCurrency(calculatedTotal / n)}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Data do 1º Recebimento</Label>
                                    <Input type="date" value={firstReceiveDate} onChange={e => setFirstReceiveDate(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-2">
                <Label>Observações</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações (opcional)" />
            </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando…' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
