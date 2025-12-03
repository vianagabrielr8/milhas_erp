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
import { ContaPagar } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ContasPagar = () => {
  const { contasPagar, addContaPagar, updateContaPagar, deleteContaPagar } = useData();

  const [isOpen, setIsOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaPagar | null>(null);
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    dataVencimento: format(new Date(), 'yyyy-MM-dd'),
    status: 'pendente' as 'pendente' | 'pago' | 'vencido',
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
      updateContaPagar(editingConta.id, contaData);
      toast.success('Conta atualizada com sucesso!');
    } else {
      addContaPagar(contaData);
      toast.success('Conta registrada com sucesso!');
    }

    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (conta: ContaPagar) => {
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

  const handlePagar = (conta: ContaPagar) => {
    updateContaPagar(conta.id, { status: 'pago', dataPagamento: new Date() });
    toast.success('Conta marcada como paga!');
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conta?')) {
      deleteContaPagar(id);
      toast.success('Conta excluída com sucesso!');
    }
  };

  const columns = [
    {
      key: 'dataVencimento',
      header: 'Vencimento',
      render: (conta: ContaPagar) => format(new Date(conta.dataVencimento), 'dd/MM/yyyy'),
    },
    {
      key: 'descricao',
      header: 'Descrição',
    },
    {
      key: 'valor',
      header: 'Valor',
      render: (conta: ContaPagar) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.valor),
    },
    {
      key: 'status',
      header: 'Status',
      render: (conta: ContaPagar) => <StatusBadge status={conta.status} />,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (conta: ContaPagar) => (
        <div className="flex gap-2">
          {conta.status !== 'pago' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handlePagar(conta)}
              title="Marcar como pago"
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
        title="Contas a Pagar"
        description="Gerencie suas contas a pagar"
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
                <DialogTitle>{editingConta ? 'Editar Conta' : 'Nova Conta a Pagar'}</DialogTitle>
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
                    onValueChange={(value: 'pendente' | 'pago' | 'vencido') =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
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
        data={contasPagar}
        columns={columns}
        emptyMessage="Nenhuma conta a pagar registrada."
      />
    </MainLayout>
  );
};

export default ContasPagar;
