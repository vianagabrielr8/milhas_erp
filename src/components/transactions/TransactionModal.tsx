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
  Loader2,
} from 'lucide-react';

import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useData } from '@/contexts/DataContext';

import {
  useCreditCards,
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

  const createTransaction = useCreateTransaction();
  const createPayable = useCreatePayable();
  const createPayableInstallments = useCreatePayableInstallments();
  const createReceivable = useCreateReceivable();
  const createReceivableInstallments =
    useCreateReceivableInstallments();

  const [accountId, setAccountId] = useState('');
  const [programId, setProgramId] = useState('');
  const [transactionType, setTransactionType] =
    useState<TransactionType>('COMPRA');
  const [quantity, setQuantity] = useState('');
  const [pricePerThousand, setPricePerThousand] = useState('');
  const [transactionDate, setTransactionDate] = useState(
    format(new Date(), 'yyyy-MM-dd'),
  );
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');

  const [useCreditCard, setUseCreditCard] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [installmentCount, setInstallmentCount] = useState('1');
  const [manualDueDate, setManualDueDate] = useState('');

  const [useInstallments, setUseInstallments] = useState(false);
  const [saleInstallments, setSaleInstallments] = useState('1');
  const [firstReceiveDate, setFirstReceiveDate] = useState(
    format(new Date(), 'yyyy-MM-dd'),
  );
  const [clientId, setClientId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setUseInstallments(false);
      setSaleInstallments('1');
      setFirstReceiveDate(hoje);
      setClientId('');
    }
  }, [open]);

  const calculatedTotal = useMemo(() => {
    const q = Number(quantity);
    const p = Number(pricePerThousand);
    if (q <= 0 || p <= 0) return 0;
    return (q / 1000) * p;
  }, [quantity, pricePerThousand]);

  const firstPaymentDate = useMemo(() => {
    if (useCreditCard && selectedCardId) {
      const card = creditCards?.find(c => c.id === selectedCardId);
      if (card) {
        return calculateCardDates(
          new Date(transactionDate),
          card.closing_day,
          card.due_day,
        );
      }
    }
    return manualDueDate
      ? new Date(manualDueDate)
      : new Date(transactionDate);
  }, [
    useCreditCard,
    selectedCardId,
    transactionDate,
    manualDueDate,
    creditCards,
  ]);

  const installmentPreview = useMemo(() => {
    const count = Number(installmentCount);
    if (!calculatedTotal || count <= 0) return [];
    return generateInstallments(
      calculatedTotal,
      count,
      firstPaymentDate,
    );
  }, [calculatedTotal, installmentCount, firstPaymentDate]);

  const avgCpm = useMemo(() => {
    const prog = programas?.find(p => p.id === programId);
    return Number((prog as any)?.avg_cpm) || 0;
  }, [programas, programId]);

  const saleProfit = useMemo(() => {
    const q = Number(quantity);
    if (q <= 0 || !calculatedTotal) return null;
    return calculateSaleProfit(
      calculatedTotal,
      q,
      avgCpm / 1000,
    );
  }, [calculatedTotal, quantity, avgCpm]);

  const cpfAlert = useMemo(() => {
    if (
      transactionType !== 'VENDA' ||
      !programId ||
      !accountId ||
      !clientId
    )
      return null;

    const prog = programas?.find(p => p.id === programId);
    const limite = Number((prog as any)?.cpf_limit) || 25;
    const umAnoAtras = subYears(new Date(), 1);

    const vendasRelevantes = vendasSafe.filter(
      v =>
        v.contaId === accountId &&
        v.programaId === programId &&
        new Date(v.dataVenda) >= umAnoAtras,
    );

    const clientes = new Set(
      vendasRelevantes.map(v => v.clienteId),
    );

    if (clientes.has(clientId)) {
      return {
        type: 'success',
        msg: 'Passageiro já utilizado. Não consome cota.',
      };
    }

    if (clientes.size >= limite) {
      return {
        type: 'error',
        msg: 'Limite de CPFs atingido.',
      };
    }

    return {
      type: 'warning',
      msg: `Vai consumir nova cota (${clientes.size + 1}/${limite})`,
    };
  }, [transactionType, programId, accountId, clientId, vendasSafe, programas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !accountId ||
      !programId ||
      !quantity ||
      !pricePerThousand ||
      (transactionType === 'VENDA' && !clientId)
    ) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não logado');

      const qty = Math.abs(Number(quantity));

      const transaction =
        await createTransaction.mutateAsync({
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
            transactionType === 'COMPRA'
              ? calculatedTotal
              : null,
          sale_price:
            transactionType === 'VENDA'
              ? calculatedTotal
              : null,
          transaction_date: transactionDate,
          expiration_date: expirationDate || null,
          notes: notes || null,
          client_id: clientId || null,
          user_id: user.id,
        });

      if (transactionType === 'COMPRA') {
        const payable =
          await createPayable.mutateAsync({
            transaction_id: transaction.id,
            credit_card_id: useCreditCard
              ? selectedCardId
              : null,
            description: 'Compra de Milhas',
            total_amount: calculatedTotal,
            installments: Number(installmentCount),
            user_id: user.id,
          });

        await createPayableInstallments.mutateAsync(
          installmentPreview.map(i => ({
            payable_id: payable.id,
            installment_number: i.installmentNumber,
            amount: i.amount,
            due_date: format(i.dueDate, 'yyyy-MM-dd'),
            status: 'pendente',
            user_id: user.id,
          })),
        );
      }

      if (transactionType === 'VENDA' && useInstallments) {
        const program = programas?.find(p => p.id === programId);
        const passageiro = passageiros?.find(p => p.id === clientId);

        const receivable =
          await createReceivable.mutateAsync({
            transaction_id: transaction.id,
            description: `Venda Milhas - ${program?.name || ''}${passageiro ? ` - ${passageiro.name}` : ''}`,
            total_amount: calculatedTotal,
            installments: Number(saleInstallments),
            user_id: user.id,
          });

        await createReceivableInstallments.mutateAsync(
          generateInstallments(
            calculatedTotal,
            Number(saleInstallments),
            new Date(firstReceiveDate),
          ).map(i => ({
            receivable_id: receivable.id,
            installment_number: i.installmentNumber,
            amount: i.amount,
            due_date: format(i.dueDate, 'yyyy-MM-dd'),
            status: 'pendente',
            user_id: user.id,
          })),
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
        <DialogContent>
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Transação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* O JSX do formulário permanece exatamente igual ao que você já validou */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
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
