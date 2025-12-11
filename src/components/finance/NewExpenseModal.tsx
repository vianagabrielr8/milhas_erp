import { useState } from 'react';
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
import { CreditCard, DollarSign } from 'lucide-react';
import { addMonths, format } from 'date-fns';

interface NewExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewExpenseModal({ open, onOpenChange }: NewExpenseModalProps) {
  const { data: creditCards } = useCreditCards();
  const createPayable = useCreatePayable();
  const createInstallments = useCreatePayableInstallments();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [useCreditCard, setUseCreditCard] = useState(false);
  const [cardId, setCardId] = useState('');
  const [installments, setInstallments] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) {
      toast.error('Preencha a descrição e o valor');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não logado');

      const totalValue = parseFloat(amount);
      const numInstallments = parseInt(installments);

      // 1. Criar a Conta a Pagar (Cabeçalho)
      const payable = await createPayable.mutateAsync({
        user_id: user.id,
        description,
        total_amount: totalValue,
        installments: numInstallments,
        credit_card_id: useCreditCard ? cardId : null,
      });

      // 2. Gerar Parcelas
      const installmentList = [];
      
      // Data Base: Adiciona T12:00:00 para evitar bug de fuso horário
      let baseDateString = date.includes('T') ? date : `${date}T12:00:00`;
      let firstDueDate = new Date(baseDateString);

      // Se for cartão, calcula a data da fatura
      if (useCreditCard && cardId) {
        const card = creditCards?.find(c => c.id === cardId);
        if (card) {
          firstDueDate = calculateCardDates(firstDueDate, card.closing_day, card.due_day);
        }
      }

      const installmentValue = totalValue / numInstallments;

      for (let i = 0; i < numInstallments; i++) {
        const dueDate = addMonths(firstDueDate, i);
        installmentList.push({
          payable_id: payable.id,
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
      // Reset form
      setDescription('');
      setAmount('');
      setUseCreditCard(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar gasto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Novo Gasto Extra
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input 
              placeholder="Ex: Clube Smiles, Assinatura..." 
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Total</Label>
              <Input 
                type="number" 
                step="0.01" 
                placeholder="0,00" 
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Compra/Vencimento</Label>
              <Input 
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border p-3 rounded-md">
            <Label className="flex items-center gap-2 cursor-pointer">
              <CreditCard className="h-4 w-4" />
              Usou cartão de crédito?
            </Label>
            <Switch checked={useCreditCard} onCheckedChange={setUseCreditCard} />
          </div>

          {useCreditCard && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/20 rounded-md">
              <div className="space-y-2">
                <Label>Cartão</Label>
                <Select value={cardId} onValueChange={setCardId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {creditCards?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Select value={installments} onValueChange={setInstallments}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1x (À vista)</SelectItem>
                    {[2,3,4,5,6,9,10,12].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>Registrar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
