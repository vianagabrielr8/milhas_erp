import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Check } from 'lucide-react';
import { ContaReceber } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ContasReceber = () => {
  const { contasReceber, addContaReceber, updateContaReceber, deleteContaReceber } = useData();

  const [isOpen, setIsOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaReceber | null>(null);
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    dataVencimento: format(new Date(), 'yyyy-MM-dd'),
    status: 'pendente' as 'pendente' | 'recebido' | 'vencido',
    observacoes: '',
  });

  const resetForm = () => {
    setFormData({
      descricao: '',
      valor: '',
      dataVencimento: format(new Date(), 'yyyy-MM-dd'),
      status: 'pendente',
      observacoes: '',
    });
    setEditingConta(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const contaData = {
      descricao: formData.descricao,
      valor: parseFloat(formData.valor),
      dataVencimento: new Date(formData.dataVencimento),
      status: formData.status,
      observacoes: formData.observacoes,
    };

    if (editingConta) {
      updateContaReceber(editingConta.id, contaData);
      toast.success('Conta atualizada com sucesso!');
    } else {
      addContaReceber(contaData);
      toast.success('Conta registrada com sucesso!');
    }

    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (conta: ContaReceber) => {
    setEditingConta(conta);
    setFormData({
      descricao: conta.descricao,
      valor: conta.valor.toString(),
      dataVencimento: format(new Date(conta.dataVencimento), 'yyyy-MM-dd'),
      status: conta.status,
      observacoes: conta.observacoes || '',
    });
    setIsOpen(true);
  };

  const handleReceber = (conta: ContaReceber) => {
    updateContaReceber(conta.id, { status: 'recebido', dataRecebimento: new Date() });
    toast.success('Conta marcada como recebida!');
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conta?')) {
      deleteContaReceber(id);
      toast.success('Conta excluída com sucesso!');
    }
  };

  const columns = [
    {
      key: 'dataVencimento',
      header: 'Vencimento',
      render: (conta: ContaReceber) => format(new Date(conta.dataVencimento), 'dd/MM/yyyy'),
    },
    {
      key: 'descricao',
      header: 'Descrição',
    },
    {
      key: 'valor',
      header: 'Valor',
      render: (conta: ContaReceber) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.valor),
    },
    {
      key: 'status',
      header: 'Status',
      render: (conta: ContaReceber) => <StatusBadge status={conta.status} />,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (conta: ContaReceber) => (
        <div className="flex gap-2">
          {conta.status !== 'recebido' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleReceber(conta)}
              title="Marcar como recebido"
            >
              <Check className="h-4 w-4 text-success" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => handleEdit(conta)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(conta.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <PageHeader
        title="Contas a Receber"
        description="Gerencie suas contas a receber"
        action={
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingConta ? 'Editar Conta' : 'Nova Conta a Receber'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição da conta"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento</Label>
                    <Input
                      type="date"
                      value={formData.dataVencimento}
                      onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'pendente' | 'recebido' | 'vencido') =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="recebido">Recebido</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Observações (opcional)"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="gradient-primary">
                    {editingConta ? 'Salvar' : 'Registrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        data={contasReceber}
        columns={columns}
        emptyMessage="Nenhuma conta a receber registrada."
      />
    </MainLayout>
  );
};

export default ContasReceber;
