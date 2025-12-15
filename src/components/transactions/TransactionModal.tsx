import { subYears } from 'date-fns';
import { useData } from '@/contexts/DataContext';
import { useState, useEffect, useMemo } from 'react';
import { format, addDays } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  CalendarCheck // Novo ícone
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  usePrograms, 
  useAccounts, 
  useCreditCards, 
  useMilesBalance,
  usePassageiros,
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
  calculateSaleProfit 
} from '@/utils/financeLogic';
import { Database } from '@/integrations/supabase/types';

type TransactionType = Database['public']['Enums']['transaction_type'];

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionModal({ open, onOpenChange }: TransactionModalProps) {
  const { vendas } = useData(); 

  const { data: programs } = usePrograms();
  const { data: accounts } = useAccounts();
  const { data: creditCards } = useCreditCards();
  const { data: milesBalance } = useMilesBalance();
  const { data: passageiros } = usePassageiros(); 
  const { data: suppliers } = useSuppliers();
  
  const createTransaction = useCreateTransaction();
  const createPayable = useCreatePayable();
  const createPayableInstallments = useCreatePayableInstallments();
  const createReceivable = useCreateReceivable();
  const createReceivableInstallments = useCreateReceivableInstallments();

  // Form state
  const [accountId, setAccountId] = useState('');
  const [programId, setProgramId] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>('COMPRA');
  const [quantity, setQuantity] = useState('');
  const [pricePerThousand, setPricePerThousand] = useState(''); 
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');
  
  // Purchase specific
  const [useCreditCard, setUseCreditCard] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [installmentCount, setInstallmentCount] = useState('1');
  const [supplierId, setSupplierId] = useState('');
  // Novo: Data de Vencimento Manual (para quando não é cartão)
  const [manualDueDate, setManualDueDate] = useState('');
  
  // Sale specific
  const [useInstallments, setUseInstallments] = useState(false);
  const [saleInstallments, setSaleInstallments] = useState('1');
  const [firstReceiveDate, setFirstReceiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [clientId, setClientId] = useState(''); // Mantemos 'clientId' no estado, mas ele se refere a 'passageiroId'

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cálculo automático do Total
  const calculatedTotal = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(pricePerThousand) || 0;
    if (qty <= 0 || price <= 0) return 0;
    return (qty / 1000) * price;
  }, [quantity, pricePerThousand]);

  // Reset form
  useEffect(() => {
    if (open) {
      setAccountId('');
      setProgramId('');
      setTransactionType('COMPRA');
      setQuantity('');
      setPricePerThousand(''); 
      const hoje = format(new Date(), 'yyyy-MM-dd');
      setTransactionDate(hoje);
      setManualDueDate(hoje); // Padrão: Vence hoje (À vista)
      setExpirationDate('');
      setNotes('');
      setUseCreditCard(false);
      setSelectedCardId('');
      setInstallmentCount('1');
      setSupplierId('');
      setUseInstallments(false);
      setSaleInstallments('1');
      setFirstReceiveDate(hoje);
      setClientId('');
    }
  }, [open]);

  // Define a data do primeiro pagamento (Cartão ou Manual)
  const firstPaymentDate = useMemo(() => {
    // Se for cartão, usa a lógica automática
    if (useCreditCard && selectedCardId) {
        const card = creditCards?.find(c => c.id === selectedCardId);
        if (card) {
            return calculateCardDates(
                new Date(transactionDate),
                card.closing_day,
                card.due_day
            );
        }
    }
    
    // Se não for cartão, usa a data manual (ou a data da transação se vazia)
    if (manualDueDate) {
        return new Date(manualDueDate);
    }
    
    return new Date(transactionDate);
  }, [useCreditCard, selectedCardId, transactionDate, manualDueDate, creditCards]);

  // Installment preview
  const installmentPreview = useMemo(() => {
    const value = calculatedTotal;
    const count = parseInt(installmentCount) || 1;
    if (value <= 0 || count <= 0) return [];
    return generateInstallments(value, count, firstPaymentDate);
  }, [calculatedTotal, installmentCount, firstPaymentDate]);

  // Average CPM
  const avgCpm = useMemo(() => {
    if (!programId || !accountId) return 0;
    const balance = milesBalance?.find(
      b => b.program_id === programId && b.account_id === accountId
    );
    return balance?.avg_cpm || 0;
  }, [milesBalance, programId, accountId]);

  // Profit preview
  const saleProfit = useMemo(() => {
    const value = calculatedTotal;
    const qty = parseInt(quantity) || 0;
    if (value <= 0 || qty <= 0) return null;
    return calculateSaleProfit(value, qty, avgCpm / 1000);
  }, [calculatedTotal, quantity, avgCpm]);

  // Purchase CPM
  const purchaseCpm = useMemo(() => {
    return parseFloat(pricePerThousand) || 0;
  }, [pricePerThousand]);

  // Alerta Limite CPF
  const cpfAlert = useMemo(() => {
    if (transactionType !== 'VENDA' || !programId || !accountId || !clientId) return null;
    const prog = programs?.find(p => p.id === programId);
    const limite = (prog as any)?.cpf_limit || 25; 
    const umAnoAtras = subYears(new Date(), 1);
    const vendasRelevantes = vendas.filter(v => 
      v.contaId === accountId && 
      v.programaId === programId &&
      new Date(v.dataVenda) >= umAnoAtras
    );
    // ATENÇÃO: Esta lógica usa a tabela 'vendas' antiga. 
    // A nova lógica de CPF deve ser verificada na página /limites
    const clientesUsados = new Set(vendasRelevantes.map(v => v.clienteId)); 
    const qtdUsados = clientesUsados.size;
    const clienteJaComprou = clientesUsados.has(clientId);

    if (clienteJaComprou) {
      return { type: 'success', msg: `Passageiro já consta na lista de ${qtdUsados}/${limite}. Não consome nova cota.` };
    } else {
      if (qtdUsados >= limite) {
        return { type: 'error', msg: `LIMITE ATINGIDO (${qtdUsados}/${limite})! Essa venda vai exceder a cota de CPFs.` };
      } else {
        return { type: 'warning', msg: `Passageiro novo. Vai consumir uma cota (${qtdUsados + 1}/${limite}).` };
      }
    }
  }, [transactionType, programId, accountId, clientId, programs, vendas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !programId || !quantity || !pricePerThousand) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não logado');

      const value = calculatedTotal;
      const qty = parseInt(quantity);

      // 1. Transação
      const transaction = await createTransaction.mutateAsync({
        account_id: accountId,
        program_id: programId,
        type: transactionType,
        quantity: transactionType === 'VENDA' || transactionType === 'USO' || transactionType === 'TRANSF_SAIDA' || transactionType === 'EXPIROU' ? -qty : qty,
        total_cost: (transactionType === 'COMPRA' || transactionType === 'TRANSF_ENTRADA' || transactionType === 'BONUS') ? value : null,
        sale_price: transactionType === 'VENDA' ? value : null,
        transaction_date: transactionDate,
        expiration_date: expirationDate || null,
        notes: notes || null,
        supplier_id: supplierId || null,
        client_id: clientId || null, // Mantido, mas agora aponta para Passageiro
        user_id: user.id
      });

      // 2. Contas a Pagar (Compra)
      if (transactionType === 'COMPRA') {
        const program = programs?.find(p => p.id === programId);
        const account = accounts?.find(a => a.id === accountId);
        const description = `Compra Milhas - ${program?.name || 'Programa'} - ${account?.name || 'Conta'}`;
        
        const payable = await createPayable.mutateAsync({
          transaction_id: transaction.id,
          credit_card_id: useCreditCard ? selectedCardId : null,
          description,
          total_amount: value,
          installments: parseInt(installmentCount),
          user_id: user.id
        });

        // Usa o 'installmentPreview' que já calculou as datas corretas (seja cartão ou manual)
        const installments = installmentPreview.map(inst => ({
          payable_id: payable.id,
          installment_number: inst.installmentNumber,
          amount: inst.amount,
          due_date: format(inst.dueDate, 'yyyy-MM-dd'),
          status: 'pendente' as const,
          user_id: user.id
        }));

        await createPayableInstallments.mutateAsync(installments);
      }

      // 3. Contas a Receber (Venda)
      if (transactionType === 'VENDA' && useInstallments) {
        const program = programs?.find(p => p.id === programId);
        // CORREÇÃO AQUI: Troquei clients por passageiros
        const passageiro = passageiros?.find(p => p.id === clientId); 
        const description = `Venda Milhas - ${program?.name || 'Programa'}${passageiro ? ` - ${passageiro.name}` : ''}`;
        
        const receivable = await createReceivable.mutateAsync({
          transaction_id: transaction.id,
          description,
          total_amount: value,
          installments: parseInt(saleInstallments),
          user_id: user.id
        });

        const receiveInstallments = generateInstallments(
          value,
          parseInt(saleInstallments),
          new Date(firstReceiveDate)
        ).map(inst => ({
          receivable_id: receivable.id,
          installment_number: inst.installmentNumber,
          amount: inst.amount,
          due_date: format(inst.dueDate, 'yyyy-MM-dd'),
          status: 'pendente' as const,
          user_id: user.id
        }));

        await createReceivableInstallments.mutateAsync(receiveInstallments);
      }

      toast.success('Transação registrada com sucesso!');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erro ao registrar: ' + (error.message || 'Verifique os dados'));
    } finally {
      setIsSubmitting(false);
    }
  };

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
          {/* CAMPOS DE CONTA E PROGRAMA */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Conta (CPF) *</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>{accounts?.map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Programa *</Label>
              <Select value={programId} onValueChange={setProgramId}>
                <SelectTrigger><SelectValue placeholder="Selecione o programa" /></SelectTrigger>
                <SelectContent>{programs?.map(prog => (<SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantidade de Milhas *</Label>
              <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Ex: 50000" min="1" />
            </div>
            <div className="space-y-2">
              <Label>{transactionType === 'VENDA' ? 'Valor Venda (Milheiro) *' : 'Valor Compra (Milheiro) *'}</Label>
              <div className="space-y-1">
                <Input type="number" step="0.01" value={pricePerThousand} onChange={e => setPricePerThousand(e.target.value)} placeholder="Ex: 17.50" min="0" />
                <div className="text-right text-sm font-medium text-muted-foreground">Total: {formatCurrency(calculatedTotal)}</div>
              </div>
            </div>
          </div>

          {/* PREVIEWS DE CPM E LUCRO */}
          {transactionType === 'COMPRA' && purchaseCpm > 0 && (
            <Card className="bg-muted/30"><CardContent className="pt-4"><div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">CPM desta compra:</span><Badge variant="secondary" className="text-lg">{formatCPM(purchaseCpm)}</Badge></div></CardContent></Card>
          )}
          {transactionType === 'VENDA' && saleProfit && (
            <Card className={saleProfit.profit >= 0 ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}><CardContent className="pt-4 space-y-2"><div className="flex items-center gap-2 mb-2">{saleProfit.profit >= 0 ? (<TrendingUp className="h-4 w-4 text-success" />) : (<AlertTriangle className="h-4 w-4 text-destructive" />)}<span className="font-medium">Previsão de Lucro</span></div><div className="grid grid-cols-3 gap-4 text-sm"><div><span className="text-muted-foreground">Lucro Total</span><div className={`font-bold ${saleProfit.profit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(saleProfit.profit)}</div></div><div><span className="text-muted-foreground">Lucro/Milheiro</span><div className={`font-bold ${saleProfit.profitPerThousand >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCPM(saleProfit.profitPerThousand)}</div></div><div><span className="text-muted-foreground">Margem</span><div className={`font-bold ${saleProfit.margin >= 0 ? 'text-success' : 'text-destructive'}`}>{saleProfit.margin.toFixed(1)}%</div></div></div></CardContent></Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Transação</Label>
              <Input type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} />
            </div>
            {transactionType === 'COMPRA' && (
              <div className="space-y-2">
                <Label>Data de Expiração</Label>
                <Input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} />
              </div>
            )}
          </div>

          {/* SELETORES DE FORNECEDOR/CLIENTE (PASSAGEIRO) */}
          {transactionType === 'COMPRA' && (
            <div className="space-y-2"><Label>Fornecedor</Label><Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger><SelectContent>{suppliers?.map(sup => (<SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>))}</SelectContent></Select></div>
          )}
          {transactionType === 'VENDA' && (
                // CORREÇÃO: Usando {pass.name}
            <div className="space-y-2">
                <Label>Passageiro *</Label>
                <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione (obrigatório para CPF/Limite)" />
                    </SelectTrigger>
                    <SelectContent>
                        {passageiros?.map(pass => (
                            <SelectItem key={pass.id} value={pass.id}>
                                {pass.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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

              {/* SELEÇÃO DO CARTÃO */}
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
                // INPUT MANUAL PARA QUANDO NÃO É CARTÃO (Erro de sintaxe corrigido aqui, removendo o comentário JSX)
                <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
                   <div className="space-y-2">
                      <Label className="flex items-center justify-between">
                         Data do Pagamento (Vencimento)
                         <Button 
                           type="button" 
                           variant="ghost" 
                           size="sm" 
                           className="h-6 text-xs text-primary"
                           onClick={() => setManualDueDate(format(new Date(), 'yyyy-MM-dd'))}
                         >
                           <CalendarCheck className="w-3 h-3 mr-1"/>
                           Pagar Hoje
                         </Button>
                      </Label>
                      <Input 
                        type="date" 
                        value={manualDueDate} 
                        onChange={e => setManualDueDate(e.target.value)} 
                      />
                      <p className="text-xs text-muted-foreground">
                        Selecione quando o dinheiro sairá da conta.
                      </p>
                   </div>
                </div>
              )}

              {/* PREVIEW DAS PARCELAS */}
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
            <div className="space-y-4"><div className="flex items-center justify-between"><Label className="flex items-center gap-2"><Calendar className="h-4 w-4" />Recebimento Parcelado?</Label><Switch checked={useInstallments} onCheckedChange={setUseInstallments} /></div>{useInstallments && (<div className="space-y-4 p-4 border rounded-lg bg-muted/20"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Parcelas</Label><Select value={saleInstallments} onValueChange={setSaleInstallments}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(n => (<SelectItem key={n} value={n.toString()}>{n}x de {formatCurrency(calculatedTotal / n)}</SelectItem>))}</SelectContent></Select></div><div className="space-y-2"><Label>Data do 1º Recebimento</Label><Input type="date" value={firstReceiveDate} onChange={e => setFirstReceiveDate(e.target.value)} /></div></div></div>)}</div>
          )}

          <div className="space-y-2"><Label>Observações</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações (opcional)" /></div>

          <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Registrar Transação'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
