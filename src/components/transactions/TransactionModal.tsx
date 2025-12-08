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
  AlertTriangle 
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  usePrograms, 
  useAccounts, 
  useCreditCards, 
  useMilesBalance,
  useClients,
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
  formatDate 
} from '@/utils/financeLogic';
import { Database } from '@/integrations/supabase/types';

type TransactionType = Database['public']['Enums']['transaction_type'];

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionModal({ open, onOpenChange }: TransactionModalProps) {
  const { data: programs } = usePrograms();
  const { data: accounts } = useAccounts();
  const { data: creditCards } = useCreditCards();
  const { data: milesBalance } = useMilesBalance();
  const { data: clients } = useClients();
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
  const [totalValue, setTotalValue] = useState('');
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');
  
  // Purchase specific
  const [useCreditCard, setUseCreditCard] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [installmentCount, setInstallmentCount] = useState('1');
  const [supplierId, setSupplierId] = useState('');
  
  // Sale specific
  const [useInstallments, setUseInstallments] = useState(false);
  const [saleInstallments, setSaleInstallments] = useState('1');
  const [firstReceiveDate, setFirstReceiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [clientId, setClientId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setAccountId('');
      setProgramId('');
      setTransactionType('COMPRA');
      setQuantity('');
      setTotalValue('');
      setTransactionDate(format(new Date(), 'yyyy-MM-dd'));
      setExpirationDate('');
      setNotes('');
      setUseCreditCard(false);
      setSelectedCardId('');
      setInstallmentCount('1');
      setSupplierId('');
      setUseInstallments(false);
      setSaleInstallments('1');
      setFirstReceiveDate(format(new Date(), 'yyyy-MM-dd'));
      setClientId('');
    }
  }, [open]);

  // Get selected card details
  const selectedCard = useMemo(() => {
    return creditCards?.find(c => c.id === selectedCardId);
  }, [creditCards, selectedCardId]);

  // Calculate first payment date based on card
  const firstPaymentDate = useMemo(() => {
    if (!useCreditCard || !selectedCard) {
      return addDays(new Date(transactionDate), 30);
    }
    return calculateCardDates(
      new Date(transactionDate),
      selectedCard.closing_day,
      selectedCard.due_day
    );
  }, [useCreditCard, selectedCard, transactionDate]);

  // Generate installment preview
  const installmentPreview = useMemo(() => {
    const value = parseFloat(totalValue) || 0;
    const count = parseInt(installmentCount) || 1;
    if (value <= 0 || count <= 0) return [];
    return generateInstallments(value, count, firstPaymentDate);
  }, [totalValue, installmentCount, firstPaymentDate]);

  // Calculate average CPM for the selected program and account
  const avgCpm = useMemo(() => {
    if (!programId || !accountId) return 0;
    const balance = milesBalance?.find(
      b => b.program_id === programId && b.account_id === accountId
    );
    return balance?.avg_cpm || 0;
  }, [milesBalance, programId, accountId]);

  // Calculate profit preview for sales
  const saleProfit = useMemo(() => {
    const value = parseFloat(totalValue) || 0;
    const qty = parseInt(quantity) || 0;
    if (value <= 0 || qty <= 0) return null;
    return calculateSaleProfit(value, qty, avgCpm / 1000);
  }, [totalValue, quantity, avgCpm]);

  // Calculate CPM for purchase
  const purchaseCpm = useMemo(() => {
    const value = parseFloat(totalValue) || 0;
    const qty = parseInt(quantity) || 0;
    if (value <= 0 || qty <= 0) return 0;
    return (value / qty) * 1000;
  }, [totalValue, quantity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountId || !programId || !quantity || !totalValue) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);

    try {
      const value = parseFloat(totalValue);
      const qty = parseInt(quantity);

      // Create the transaction
      const transaction = await createTransaction.mutateAsync({
        account_id: accountId,
        program_id: programId,
        type: transactionType,
        quantity: transactionType === 'VENDA' ? -qty : qty,
        total_cost: transactionType === 'COMPRA' ? value : null,
        sale_price: transactionType === 'VENDA' ? value : null,
        transaction_date: transactionDate,
        expiration_date: expirationDate || null,
        notes: notes || null,
        supplier_id: supplierId || null,
        client_id: clientId || null,
      });

      // Handle payables for purchases with credit card
      if (transactionType === 'COMPRA' && useCreditCard && selectedCardId) {
        const program = programs?.find(p => p.id === programId);
        const account = accounts?.find(a => a.id === accountId);
        const description = `Compra Milhas - ${program?.name || 'Programa'} - ${account?.name || 'Conta'}`;
        
        const payable = await createPayable.mutateAsync({
          transaction_id: transaction.id,
          credit_card_id: selectedCardId,
          description,
          total_amount: value,
          installments: parseInt(installmentCount),
        });

        const installments = installmentPreview.map(inst => ({
          payable_id: payable.id,
          installment_number: inst.installmentNumber,
          amount: inst.amount,
          due_date: format(inst.dueDate, 'yyyy-MM-dd'),
          status: 'pendente' as const,
        }));

        await createPayableInstallments.mutateAsync(installments);
      }

      // Handle receivables for sales with installments
      if (transactionType === 'VENDA' && useInstallments) {
        const program = programs?.find(p => p.id === programId);
        const client = clients?.find(c => c.id === clientId);
        const description = `Venda Milhas - ${program?.name || 'Programa'}${client ? ` - ${client.name}` : ''}`;
        
        const receivable = await createReceivable.mutateAsync({
          transaction_id: transaction.id,
          description,
          total_amount: value,
          installments: parseInt(saleInstallments),
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
        }));

        await createReceivableInstallments.mutateAsync(receiveInstallments);
      }

      toast.success('Transação registrada com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Erro ao registrar transação');
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
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Conta (CPF) *</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} {acc.cpf && `(${acc.cpf})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Programa *</Label>
              <Select value={programId} onValueChange={setProgramId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o programa" />
                </SelectTrigger>
                <SelectContent>
                  {programs?.map(prog => (
                    <SelectItem key={prog.id} value={prog.id}>
                      {prog.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Transação *</Label>
            <Select 
              value={transactionType} 
              onValueChange={(v) => setTransactionType(v as TransactionType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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

          {/* Transaction Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantidade de Milhas *</Label>
              <Input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="Ex: 50000"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label>
                {transactionType === 'VENDA' ? 'Valor de Venda' : 'Valor Total'} *
              </Label>
              <Input
                type="number"
                step="0.01"
                value={totalValue}
                onChange={e => setTotalValue(e.target.value)}
                placeholder="Ex: 1500.00"
                min="0"
              />
            </div>
          </div>

          {/* CPM Preview for purchases */}
          {transactionType === 'COMPRA' && purchaseCpm > 0 && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">CPM desta compra:</span>
                  <Badge variant="secondary" className="text-lg">
                    {formatCPM(purchaseCpm)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profit Preview for sales */}
          {transactionType === 'VENDA' && saleProfit && (
            <Card className={saleProfit.profit >= 0 ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  {saleProfit.profit >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="font-medium">Previsão de Lucro</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Lucro Total</span>
                    <div className={`font-bold ${saleProfit.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(saleProfit.profit)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lucro/Milheiro</span>
                    <div className={`font-bold ${saleProfit.profitPerThousand >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCPM(saleProfit.profitPerThousand)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Margem</span>
                    <div className={`font-bold ${saleProfit.margin >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {saleProfit.margin.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Baseado no CPM médio atual: {formatCPM(avgCpm)}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Transação</Label>
              <Input
                type="date"
                value={transactionDate}
                onChange={e => setTransactionDate(e.target.value)}
              />
            </div>

            {transactionType === 'COMPRA' && (
              <div className="space-y-2">
                <Label>Data de Expiração</Label>
                <Input
                  type="date"
                  value={expirationDate}
                  onChange={e => setExpirationDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Supplier/Client selection */}
          {transactionType === 'COMPRA' && (
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map(sup => (
                    <SelectItem key={sup.id} value={sup.id}>
                      {sup.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {transactionType === 'VENDA' && (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map(cli => (
                    <SelectItem key={cli.id} value={cli.id}>
                      {cli.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {/* Credit Card Section for Purchases */}
          {transactionType === 'COMPRA' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Usou Cartão de Crédito?
                </Label>
                <Switch checked={useCreditCard} onCheckedChange={setUseCreditCard} />
              </div>

              {useCreditCard && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cartão</Label>
                      <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cartão" />
                        </SelectTrigger>
                        <SelectContent>
                          {creditCards?.map(card => (
                            <SelectItem key={card.id} value={card.id}>
                              {card.name} (Fecha: {card.closing_day} | Vence: {card.due_day})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Parcelas</Label>
                      <Select value={installmentCount} onValueChange={setInstallmentCount}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                            <SelectItem key={n} value={n.toString()}>
                              {n}x de {formatCurrency((parseFloat(totalValue) || 0) / n)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Installment Preview */}
                  {installmentPreview.length > 0 && selectedCardId && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Previsão de Parcelas</span>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {installmentPreview.map(inst => (
                            <div 
                              key={inst.installmentNumber}
                              className="flex justify-between items-center text-sm p-2 rounded bg-background"
                            >
                              <span className="text-muted-foreground">
                                {inst.installmentNumber}ª parcela - {format(inst.dueDate, 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                              <span className="font-medium">{formatCurrency(inst.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Installment Section for Sales */}
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
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                            <SelectItem key={n} value={n.toString()}>
                              {n}x de {formatCurrency((parseFloat(totalValue) || 0) / n)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Data do 1º Recebimento</Label>
                      <Input
                        type="date"
                        value={firstReceiveDate}
                        onChange={e => setFirstReceiveDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Observações</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observações (opcional)"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Registrar Transação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}