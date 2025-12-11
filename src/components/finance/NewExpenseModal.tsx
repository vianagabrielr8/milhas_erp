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
  const [amount, setAmount] = useState(''); // Guarda a string formatada (R$)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [useCreditCard, setUseCreditCard] = useState(false);
  const [cardId, setCardId] = useState('');
  const [installments, setInstallments] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resetar formulário ao abrir
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

  // --- FUNÇÃO DE MÁSCARA DE DINHEIRO (UX DE BANCO) ---
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // 1. Remove tudo que não é dígito
    const numericValue = value.replace(/\D/g, '');

    // 2. Se estiver vazio, reseta
    if (numericValue === '') {
      setAmount('');
      return;
    }

    // 3. Converte para centavos e formata (Ex: 4651 -> 46.51 -> R$ 46,51)
    const floatValue = parseFloat(numericValue) / 100;
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(floatValue);

    setAmount(formatted);
  };

  // Função auxiliar para converter "R$ 46,51" de volta para número 46.51
  const parseCurrency = (value: string) => {
    if (!value) return 0;
    return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.').replace('.', '')) / 100;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- VALIDAÇÕES UX (BLINDAGEM) ---
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
    // ---------------------------------

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não logado');

      const numInstallments = parseInt(installments);

      // 1. Criar a Conta a Pagar (Cabeçalho)
      const payable = await createPayable.mutateAsync({
        user_id: user.id,
        description,
        total_amount: valorNumerico,
        installments: numInstallments,
        credit_card_id: useCreditCard ? cardId : null,
      });

      // 2. Gerar Parcelas
      const installmentList = [];
      
      // Ajuste de fuso horário na data (T12:00:00)
      let baseDateString = date.includes('T') ? date : `${date}T12:00:00`;
      let firstDueDate = new Date(baseDateString);

      // Se for cartão, calcula a data da fatura
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
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar gasto. Tente novamente.');
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
          {/* Campo Descrição */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlignLeft className="h-4 w-4 text-muted-foreground" />
              Descrição
            </Label>
            <Input 
              placeholder="Ex: Clube Smiles, Assinatura Netflix..." 
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="h-11"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Campo Valor (COM MÁSCARA) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Valor Total
              </Label>
              <Input 
                type="text" 
                inputMode="numeric"
                placeholder="R$ 0,00" 
                value={amount}
                onChange={handleAmountChange}
                className="h-11 font-bold text-lg"
              />
            </div>

            {/* Campo Data */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                Data Compra/Venc
              </Label>
              <Input 
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          {/* Switch de Cartão */}
          <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/10">
            <Label className="flex items-center gap-2 cursor-pointer font-medium">
              <CreditCard className="h-4 w-4 text-primary" />
              Usou cartão de crédito?
            </Label>
            <Switch checked={useCreditCard} onCheckedChange={setUseCreditCard} />
          </div>

          {/* Área Condicional do Cartão */}
          {useCreditCard && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg border border-border/50 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                <Label>Cartão</Label>
                <Select value={cardId} onValueChange={setCardId}>
                  <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                  <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 px-6">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-11 px-6 font-semibold">
              {isSubmitting ? 'Salvando...' : 'Registrar Gasto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}