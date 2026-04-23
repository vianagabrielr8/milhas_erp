import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useCreditCards, useCreateCreditCard, useUpdateCreditCard, useDeleteCreditCard } from '@/hooks/useSupabaseData';

// Tipo simplificado para a tabela
type CreditCardType = {
    id: string;
    name: string;
    closing_day: number;
    due_day: number;
    active: boolean;
};

const CartoesPagamento = () => {
  const { data: creditCards, isLoading } = useCreditCards();
  const createCreditCard = useCreateCreditCard();
  const updateCreditCard = useUpdateCreditCard();
  const deleteCreditCard = useDeleteCreditCard();

  const [isOpen, setIsOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null);
  
  // Estado do Formulário (mantém como string para facilitar digitação, mas converte no envio)
  const [formData, setFormData] = useState({
    name: '',
    closing_day: '',
    due_day: '',
    active: true
  });

  const resetForm = () => {
    setFormData({
      name: '',
      closing_day: '',
      due_day: '',
      active: true
    });
    setEditingCard(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!formData.name.trim()) {
        toast.error("O nome do cartão é obrigatório.");
        return;
    }

    const closingDay = parseInt(formData.closing_day);
    const dueDay = parseInt(formData.due_day);

    if (isNaN(closingDay) || closingDay < 1 || closingDay > 31) {
        toast.error("Dia de fechamento inválido.");
        return;
    }

    if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
        toast.error("Dia de vencimento inválido.");
        return;
    }

    // Payload formatado exatamente como o banco espera
    const cardData = {
      name: formData.name,
      closing_day: closingDay,
      due_day: dueDay,
      active: formData.active
    };

    try {
      if (editingCard) {
        await updateCreditCard.mutateAsync({ id: editingCard.id, ...cardData });
        toast.success('Cartão atualizado com sucesso!');
      } else {
        await createCreditCard.mutateAsync(cardData);
        toast.success('Cartão cadastrado com sucesso!');
      }
      setIsOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(`Erro ao salvar cartão: ${error.message}`);
    }
  };

  const handleEdit = (card: CreditCardType) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      closing_day: card.closing_day.toString(),
      due_day: card.due_day.toString(),
      active: card.active !== false // garante que undefined/null seja true
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cartão?')) {
      try {
        await deleteCreditCard.mutateAsync(id);
        toast.success('Cartão excluído com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir cartão');
      }
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Nome do Cartão',
      render: (card: CreditCardType) => (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <span className="font-medium">{card.name}</span>
        </div>
      ),
    },
    {
      key: 'closing_day',
      header: 'Dia de Fechamento',
      render: (card: CreditCardType) => (
        <Badge variant="outline">Dia {card.closing_day}</Badge>
      ),
    },
    {
      key: 'due_day',
      header: 'Dia de Vencimento',
      render: (card: CreditCardType) => (
        <Badge variant="secondary">Dia {card.due_day}</Badge>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (card: CreditCardType) => (
        <Badge variant={card.active !== false ? 'success' : 'destructive'}>
          {card.active !== false ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (card: CreditCardType) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(card)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(card.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Cartões de Pagamento"
        description="Gerencie seus cartões de crédito com dias de fechamento e vencimento"
        action={
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Novo Cartão
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCard ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Cartão</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Nubank, Itaú, Inter"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dia de Fechamento</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.closing_day}
                      onChange={(e) => setFormData({ ...formData, closing_day: e.target.value })}
                      placeholder="Ex: 15"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Dia que a fatura fecha
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Dia de Vencimento</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.due_day}
                      onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                      placeholder="Ex: 22"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Dia que a fatura vence
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                    <Label htmlFor="active" className="cursor-pointer">Cartão Ativo?</Label>
                    <Switch 
                        id="active" 
                        checked={formData.active} 
                        onCheckedChange={(checked) => setFormData({...formData, active: checked})} 
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="gradient-primary">
                    {editingCard ? 'Salvar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        data={creditCards || []}
        columns={columns}
        emptyMessage="Nenhum cartão cadastrado. Clique em 'Novo Cartão' para começar."
      />
    </MainLayout>
  );
};

export default CartoesPagamento;
