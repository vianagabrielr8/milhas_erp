import { subYears, format } from 'date-fns';
import { useState, useEffect, useMemo } from 'react';
import { ptBR } from 'date-fns/locale';

import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

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

import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react';

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
  calculateSaleProfit,
} from '@/utils/financeLogic';

type TransactionType = Database['public']['Enums']['transaction_type'];

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionModal({ open, onOpenChange }: TransactionModalProps) {
  const { vendas, programas, contas, passageiros } = useData();

  const { data: creditCards = [] } = useCreditCards();
  const { data: milesBalance = [] } = useMilesBalance();
  const { data: suppliers = [] } = useSuppliers();

  const createTransaction = useCreateTransaction();
  const createPayable = useCreatePayable();
  const createPayableInstallments = useCreatePayableInstallments();
  const createReceivable = useCreateReceivable();
  const createReceivableInstallments = useCreateReceivableInstallments();

  // 🔹 STATES (TODOS COMPATÍVEIS COM RADIX)
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [programId, setProgramId] = useState<string | undefined>(undefined);
  const [clientId, setClientId] = useState<string | undefined>(undefined);

  const [transactionType, setTransactionType] = useState<TransactionType>('COMPRA');
  const [quantity, setQuantity] = useState('');
  const [pricePerThousand, setPricePerThousand] = useState('');
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');

  const [useCreditCard, setUseCreditCard] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>(undefined);
  const [installmentCount, setInstallmentCount] = useState('1');
  const [supplierId, setSupplierId] = useState<string | undefined>(undefined);

  const [useInstallments, setUseInstallments] = useState(false);
  const [saleInstallments, setSaleInstallments] = useState('1');
  const [firstReceiveDate, setFirstReceiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔹 RESET CORRETO DO MODAL
  useEffect(() => {
    if (!open) return;

    const hoje = format(new Date(), 'yyyy-MM-dd');

    setAccountId(undefined);
    setProgramId(undefined);
    setClientId(undefined);

    setTransactionType('COMPRA');
    setQuantity('');
    setPricePerThousand('');
    setTransactionDate(hoje);
    setExpirationDate('');
    setNotes('');

    setUseCreditCard(false);
    setSelectedCardId(undefined);
    setInstallmentCount('1');
    setSupplierId(undefined);

    setUseInstallments(false);
    setSaleInstallments('1');
    setFirstReceiveDate(hoje);
  }, [open]);

  // 🔹 CÁLCULOS
  const calculatedTotal = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(pricePerThousand) || 0;
    return qty > 0 && price > 0 ? (qty / 1000) * price : 0;
  }, [quantity, pricePerThousand]);

  const avgCpm = useMemo(() => {
    if (!programId || !accountId) return 0;
    const balance = milesBalance.find(
      b => b.program_id === programId && b.account_id === accountId
    );
    return balance?.avg_cpm || 0;
  }, [milesBalance, programId, accountId]);

  const saleProfit = useMemo(() => {
    if (!calculatedTotal || !quantity) return null;
    return calculateSaleProfit(calculatedTotal, parseInt(quantity), avgCpm / 1000);
  }, [calculatedTotal, quantity, avgCpm]);

  // 🔹 SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountId || !programId || !quantity || !pricePerThousand) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const qty = parseInt(quantity);
      const value = calculatedTotal;

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
        sale_price: transactionType === 'VENDA' ? value : null,
        transaction_date: transactionDate,
        expiration_date: expirationDate || null,
        notes: notes || null,
        supplier_id: supplierId || null,
        client_id: clientId || null,
        user_id: user.id,
      });

      toast.success('Transação registrada com sucesso');
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao registrar');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔹 UI
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {transactionType === 'COMPRA' && <TrendingDown />}
            {transactionType === 'VENDA' && <TrendingUp />}
            {transactionType === 'BONUS' && <Wallet />}
            Nova Transação
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* PROGRAMA */}
          <div>
            <Label>Programa</Label>
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o programa" />
              </SelectTrigger>
              <SelectContent>
                {programas.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CONTA */}
          <div>
            <Label>Conta</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {contas.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CLIENTE */}
          <div>
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o passageiro" />
              </SelectTrigger>
              <SelectContent>
                {passageiros.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Registrar Transação'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
