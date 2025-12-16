import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import {
  useAccounts,
  usePrograms,
  usePassageiros,
  useCreateTransaction,
} from '@/hooks/useSupabaseData';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionModal({ open, onOpenChange }: Props) {
  const { data: accounts = [] } = useAccounts();
  const { data: programs = [] } = usePrograms();
  const { data: passageiros = [] } = usePassageiros();

  const createTransaction = useCreateTransaction();

  const [accountId, setAccountId] = useState<string>();
  const [programId, setProgramId] = useState<string>();
  const [clientId, setClientId] = useState<string>();

  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  const total = useMemo(() => {
    const q = Number(quantity);
    const p = Number(price);
    if (!q || !p) return 0;
    return (q / 1000) * p;
  }, [quantity, price]);

  useEffect(() => {
    if (open) {
      setAccountId(undefined);
      setProgramId(undefined);
      setClientId(undefined);
      setQuantity('');
      setPrice('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!accountId || !programId || !quantity || !price) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Usuário não autenticado');

      await createTransaction.mutateAsync({
        account_id: accountId,
        program_id: programId,
        client_id: clientId ?? null,
        quantity: Number(quantity),
        total_cost: total,
        transaction_date: date,
        user_id: user.id,
        type: 'COMPRA',
      });

      toast.success('Transação criada com sucesso');
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar transação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Transação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* CONTA */}
          <div>
            <Label>Conta</Label>
            <Select
              value={accountId}
              onValueChange={setAccountId}
              modal={false}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>

              <SelectContent>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={String(acc.id)}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PROGRAMA */}
          <div>
            <Label>Programa</Label>
            <Select
              value={programId}
              onValueChange={setProgramId}
              modal={false}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o programa" />
              </SelectTrigger>

              <SelectContent>
                {programs.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PASSAGEIRO */}
          <div>
            <Label>Passageiro (opcional)</Label>
            <Select
              value={clientId}
              onValueChange={setClientId}
              modal={false}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o passageiro" />
              </SelectTrigger>

              <SelectContent>
                {passageiros.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* QUANTIDADE */}
          <div>
            <Label>Quantidade de milhas</Label>
            <Input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
          </div>

          {/* PREÇO */}
          <div>
            <Label>Preço por milheiro</Label>
            <Input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
            />
          </div>

          {/* DATA */}
          <div>
            <Label>Data</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
