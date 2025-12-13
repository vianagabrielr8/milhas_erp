import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreditCards, useCreatePayable, useCreatePayableInstallments } from '@/hooks/useSupabaseData';
import { calculateCardDates } from '@/utils/financeLogic';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, DollarSign, CalendarIcon, AlignLeft } from 'lucide-react';
import { addMonths, format } from 'date-fns';

interface NewExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewExpenseModal({ open, onOpenChange }: NewExpenseModalProps) {
  const { data: creditCards } = useCreditCards();
  const createPayable = useCreatePayable();
  const createInstallments = useCreatePayableInstallments();

  // Estados
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(''); 
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [useCreditCard, setUseCreditCard] = useState(false);
  const [cardId, setCardId] = useState('');
  const [installments, setInstallments] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDescription('');
      setAmount('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setUseCreditCard(false);
      setCardId('');
      setInstallments('1');
    }
  }, [open]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numericValue = value.replace(/\D/g, '');
    if (numericValue === '') { setAmount(''); return; }
    const floatValue = parseFloat(numericValue) / 100;
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(floatValue);
    setAmount(formatted);
  };

  const parseCurrency = (value: string) => {
    if (!value) return 0;
    return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.').replace('.', '')) / 100;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description || description.trim().length < 3) {
      toast.error('A descrição precisa ser mais detalhada.');
      return;
    }

    const valorNumerico = parseCurrency(amount);
    if (valorNumerico <= 0) {
      toast.error('O valor precisa ser maior que zero.');
      return;
    }

    if (useCreditCard && !cardId) {
      toast.error('Selecione qual cartão foi utilizado.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não logado');

      const numInstallments = parseInt(installments);

      // 1. CRIA O PAI (PAYABLES)
      // Tentei usar 'total_amount' que é o padrão, mas se der erro, o catch pega.
      const payablePayload = {
        user_id: user.id,
        description,
        total_amount: valorNumerico, // Mudei para total_amount (padrão do banco)
        credit_card_id: useCreditCard ? cardId : null,
      };

      console.log("Enviando pai:", payablePayload);
      const payable = await createPayable.mutateAsync(payablePayload);
      console.log("Pai criado:", payable);

      if (!payable || !payable.id) {
        throw new Error("Erro: ID da conta não foi gerado. Verifique o console.");
      }

      // 2. CRIA OS FILHOS (PARCELAS) COM O VÍNCULO CORRETO
      const installmentList = [];
      let baseDateString = date.includes('T') ? date : `${date}T12:00:00`;
      let firstDueDate = new Date(baseDateString);

      if (useCreditCard && cardId) {
        const card = creditCards?.find(c => c.id === cardId);
        if (card) {
          firstDueDate = calculateCardDates(firstDueDate, card.closing_day, card.due_day);
        }
      }

      const installmentValue = valorNumerico / numInstallments;

      for (let i = 0; i < numInstallments; i++) {
        const dueDate = addMonths(firstDueDate, i);
        installmentList.push({
          payable_id: payable.id, // AQUI ESTAVA O ERRO (agora payable.id existe)
          installment_number: i + 1,
          amount: installmentValue,
          due_date: format(dueDate, 'yyyy-MM-dd'),
          status: 'pendente' as const,
          user_id: user.id
        });
      }

      await createInstallments.mutateAsync(installmentList);

      toast.success('Gasto registrado com sucesso!');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      // Se o erro for de coluna inexistente, avisa
      if (error.message?.includes('column "total_amount"')) {
         toast.error("Erro interno: Coluna 'total_amount' não existe. Me avise para eu trocar para 'amount'.");
      } else {
         toast.error(`Erro ao salvar: ${error.message || 'Tente novamente.'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            Novo Gasto Extra
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><AlignLeft className="h-4 w-4" /> Descrição</Label>
            <Input placeholder="Ex: Clube Smiles..." value={description} onChange={e => setDescription(e.target.value)} className="h-11" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Valor Total</Label>
              <Input inputMode="numeric" placeholder="R$ 0,00" value={amount} onChange={handleAmountChange} className="h-11 font-bold text-lg" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Data Compra/Venc</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11" />
            </div>
          </div>

          <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/10">
            <Label className="flex items-center gap-2 cursor-pointer font-medium"><CreditCard className="h-4 w-4 text-primary" /> Usou cartão de crédito?</Label>
            <Switch checked={useCreditCard} onCheckedChange={setUseCreditCard} />
          </div>

          {useCreditCard && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg border border-border/50 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                <Label>Cartão</Label>
                <Select value={cardId} onValueChange={setCardId}>
                  <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {creditCards?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Select value={installments} onValueChange={setInstallments}>
                  <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1x (À vista)</SelectItem>
                    {[2,3,4,5,6,9,10,12].map(n => <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 px-6">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="h-11 px-6 font-semibold">{isSubmitting ? 'Salvando...' : 'Registrar Gasto'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
