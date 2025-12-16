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

  // IDs reais
  const [accountId, setAccountId] = useState('');
  const [programId, setProgramId] = useState('');
  const [clientId, setClientId] = useState('');

  // campos de busca
  const [searchConta, setSearchConta] = useState('');
  const [searchPrograma, setSearchPrograma] = useState('');
  const [searchPassageiro, setSearchPassageiro] = useState('');

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

  const [isSubmitting, setIsSubmitting] = useState(false);

  // RESET
  useEffect(() => {
    if (open) {
      const hoje = format(new Date(), 'yyyy-MM-dd');
      setAccountId('');
      setProgramId('');
      setClientId('');
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
      setUseCreditCard(false);
      setSelectedCardId('');
      setInstallmentCount('1');
      setUseInstallments(false);
      setSaleInstallments('1');
      setFirstReceiveDate(hoje);
    }
  }, [open]);

  const calculatedTotal = useMemo(() => {
    const q = Number(quantity);
    const p = Number(pricePerThousand);
    if (q <= 0 || p <= 0) return 0;
    return (q / 1000) * p;
  }, [quantity, pricePerThousand]);

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
      return { type: 'success', msg: 'Passageiro já utilizado.' };
    }
    if (clientes.size >= limite) {
      return { type: 'error', msg: 'Limite de CPFs atingido.' };
    }
    return {
      type: 'warning',
      msg: `Consumirá nova cota (${clientes.size + 1}/${limite})`,
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
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não logado');

      const qty = Math.abs(Number(quantity));

      await createTransaction.mutateAsync({
        account_id: accountId,
        program_id: programId,
        type: transactionType,
        quantity:
          transactionType === 'VENDA' ? -qty : qty,
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

          {/* CONTA */}
          <div>
            <Label>Conta *</Label>
            <Input
              value={searchConta}
              onChange={e => setSearchConta(e.target.value)}
              placeholder="Buscar conta"
            />
            {searchConta && (
              <div className="border rounded max-h-40 overflow-y-auto">
                {(contas ?? [])
                  .filter(c =>
                    c.name.toLowerCase().includes(searchConta.toLowerCase())
                  )
                  .map(c => (
                    <div
                      key={c.id}
                      className="p-2 cursor-pointer hover:bg-muted"
                      onClick={() => {
                        setAccountId(c.id);
                        setSearchConta(c.name);
                      }}
                    >
                      {c.name}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* PROGRAMA */}
          <div>
            <Label>Programa *</Label>
            <Input
              value={searchPrograma}
              onChange={e => setSearchPrograma(e.target.value)}
              placeholder="Buscar programa"
            />
            {searchPrograma && (
              <div className="border rounded max-h-40 overflow-y-auto">
                {(programas ?? [])
                  .filter(p =>
                    p.name.toLowerCase().includes(searchPrograma.toLowerCase())
                  )
                  .map(p => (
                    <div
                      key={p.id}
                      className="p-2 cursor-pointer hover:bg-muted"
                      onClick={() => {
                        setProgramId(p.id);
                        setSearchPrograma(p.name);
                      }}
                    >
                      {p.name}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* PASSAGEIRO */}
          {transactionType === 'VENDA' && (
            <div>
              <Label>Passageiro *</Label>
              <Input
                value={searchPassageiro}
                onChange={e => setSearchPassageiro(e.target.value)}
                placeholder="Buscar passageiro"
              />
              {searchPassageiro && (
                <div className="border rounded max-h-40 overflow-y-auto">
                  {(passageiros ?? [])
                    .filter(p =>
                      p.name.toLowerCase().includes(searchPassageiro.toLowerCase())
                    )
                    .map(p => (
                      <div
                        key={p.id}
                        className="p-2 cursor-pointer hover:bg-muted"
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
              {cpfAlert && (
                <div className="text-xs mt-2">{cpfAlert.msg}</div>
              )}
            </div>
          )}

          <Separator />

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
