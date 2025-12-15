import { subYears } from 'date-fns';
import { useData } from '@/contexts/DataContext';
import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
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
  CalendarCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  useCreditCards,
  useMilesBalance,
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

type TransactionType = Database['public']['Enums']['transaction_type'];

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionModal({ open, onOpenChange }: TransactionModalProps) {
  const { vendas, programas, contas, passageiros } = useData();

  const { data: creditCards } = useCreditCards();
  const { data: milesBalance } = useMilesBalance();
  const { data: suppliers } = useSuppliers();

  const createTransaction = useCreateTransaction();
  const createPayable = useCreatePayable();
  const createPayableInstallments = useCreatePayableInstallments();
  const createReceivable = useCreateReceivable();
  const createReceivableInstallments = useCreateReceivableInstallments();

  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [programId, setProgramId] = useState<string | undefined>(undefined);
  const [transactionType, setTransactionType] = useState<TransactionType>('COMPRA');
  const [quantity, setQuantity] = useState('');
  const [pricePerThousand, setPricePerThousand] = useState('');
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');

  const [useCreditCard, setUseCreditCard] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [installmentCount, setInstallmentCount] = useState('1');
  const [supplierId, setSupplierId] = useState('');
  const [manualDueDate, setManualDueDate] = useState('');

  const [useInstallments, setUseInstallments] = useState(false);
  const [saleInstallments, setSaleInstallments] = useState('1');
  const [firstReceiveDate, setFirstReceiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [clientId, setClientId] = useState<string | undefined>(undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculatedTotal = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(pricePerThousand) || 0;
    if (qty <= 0 || price <= 0) return 0;
    return (qty / 1000) * price;
  }, [quantity, pricePerThousand]);

  useEffect(() => {
    if (open) {
      const hoje = format(new Date(), 'yyyy-MM-dd');
      setAccountId('');
      setProgramId('');
      setTransactionType('COMPRA');
      setQuantity('');
      setPricePerThousand('');
      setTransactionDate(hoje);
      setManualDueDate(hoje);
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

  const firstPaymentDate = useMemo(() => {
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
    if (manualDueDate) {
      return new Date(manualDueDate);
    }
    return new Date(transactionDate);
  }, [useCreditCard, selectedCardId, transactionDate, manualDueDate, creditCards]);

  const installmentPreview = useMemo(() => {
    const value = calculatedTotal;
    const count = parseInt(installmentCount) || 1;
    if (value <= 0 || count <= 0) return [];
    return generateInstallments(value, count, firstPaymentDate);
  }, [calculatedTotal, installmentCount, firstPaymentDate]);

  const avgCpm = useMemo(() => {
    if (!programId || !accountId) return 0;
    const balance = milesBalance?.find(
      b => b.program_id === programId && b.account_id === accountId
    );
    return balance?.avg_cpm || 0;
  }, [milesBalance, programId, accountId]);

  const saleProfit = useMemo(() => {
    const value = calculatedTotal;
    const qty = parseInt(quantity) || 0;
    if (value <= 0 || qty <= 0) return null;
    return calculateSaleProfit(value, qty, avgCpm / 1000);
  }, [calculatedTotal, quantity, avgCpm]);

  const purchaseCpm = useMemo(() => {
    return parseFloat(pricePerThousand) || 0;
  }, [pricePerThousand]);

  const cpfAlert = useMemo(() => {
    if (transactionType !== 'VENDA' || !programId || !accountId || !clientId) return null;
    const prog = programas?.find(p => p.id === programId);
    const limite = (prog as any)?.cpf_limit || 25;
    const umAnoAtras = subYears(new Date(), 1);
    const vendasRelevantes = vendas.filter(
      v =>
        v.contaId === accountId &&
        v.programaId === programId &&
        new Date(v.dataVenda) >= umAnoAtras
    );
    const clientesUsados = new Set(vendasRelevantes.map(v => v.clienteId));
    const qtdUsados = clientesUsados.size;
    const clienteJaComprou = clientesUsados.has(clientId);

    if (clienteJaComprou) {
      return {
        type: 'success',
        msg: `Passageiro já consta na lista de ${qtdUsados}/${limite}. Não consome nova cota.`,
      };
    } else {
      if (qtdUsados >= limite) {
        return {
          type: 'error',
          msg: `LIMITE ATINGIDO (${qtdUsados}/${limite})! Essa venda vai exceder a cota de CPFs.`,
        };
      } else {
        return {
          type: 'warning',
          msg: `Passageiro novo. Vai consumir uma cota (${qtdUsados + 1}/${limite}).`,
        };
      }
    }
  }, [transactionType, programId, accountId, clientId, programas, vendas]);

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

      const transaction = await createTransaction.mutateAsync({
        account_id: accountId,
        program_id: programId,
        type: transactionType,
        quantity:
          transactionType === 'VENDA' ||
          transactionType === 'USO' ||
          transactionType === 'TRANSF_SAIDA' ||
          transactionType === 'EXPIROU'
            ? -qty
            : qty,
        total_cost:
          transactionType === 'COMPRA' ||
          transactionType === 'TRANSF_ENTRADA' ||
          transactionType === 'BONUS'
            ? value
            : null,
        sale_price: transactionType === 'VENDA' ? value : null,
        transaction_date: transactionDate,
        expiration_date: expirationDate || null,
        notes: notes || null,
        supplier_id: supplierId || null,
        client_id: clientId || null,
        user_id: user.id,
      });

      if (transactionType === 'COMPRA') {
        const program = programas?.find(p => p.id === programId);
        const account = contas?.find(a => a.id === accountId);
        const description = `Compra Milhas - ${program?.name || 'Programa'} - ${account?.name || 'Conta'}`;

        const payable = await createPayable.mutateAsync({
          transaction_id: transaction.id,
          credit_card_id: useCreditCard ? selectedCardId : null,
          description,
          total_amount: value,
          installments: parseInt(installmentCount),
          user_id: user.id,
        });

        const installments = installmentPreview.map(inst => ({
          payable_id: payable.id,
          installment_number: inst.installmentNumber,
          amount: inst.amount,
          due_date: format(inst.dueDate, 'yyyy-MM-dd'),
          status: 'pendente' as const,
          user_id: user.id,
        }));

        await createPayableInstallments.mutateAsync(installments);
      }

      if (transactionType === 'VENDA' && useInstallments) {
        const program = programas?.find(p => p.id === programId);
        const passageiro = passageiros?.find(p => p.id === clientId);
        const description = `Venda Milhas - ${program?.name || 'Programa'}${passageiro ? ` - ${passageiro.name}` : ''}`;

        const receivable = await createReceivable.mutateAsync({
          transaction_id: transaction.id,
          description,
          total_amount: value,
          installments: parseInt(saleInstallments),
          user_id: user.id,
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
          user_id: user.id,
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

        <form onSubmit={handleSubmit} className="space-y-6" id="transaction-form">
          {/* ... conteúdo dos campos, igual ao seu original ... */}

          {/* CAMPO DE OBSERVAÇÕES */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observações (opcional)"
            />
          </div>
        </form>

        {/* BOTÕES DE AÇÃO */}
        <div className="flex justify-end gap-2 pt-4 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" form="transaction-form" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Registrar Transação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
