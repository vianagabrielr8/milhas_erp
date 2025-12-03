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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Compra } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Compras = () => {
  const {
    compras,
    programas,
    contas,
    fornecedores,
    addCompra,
    updateCompra,
    deleteCompra,
  } = useData();

  const [isOpen, setIsOpen] = useState(false);
  const [editingCompra, setEditingCompra] = useState<Compra | null>(null);
  const [formData, setFormData] = useState({
    programaId: '',
    contaId: '',
    fornecedorId: '',
    quantidade: '',
    valorUnitario: '',
    dataCompra: format(new Date(), 'yyyy-MM-dd'),
    status: 'pendente' as 'pendente' | 'pago',
    observacoes: '',
  });

  const resetForm = () => {
    setFormData({
      programaId: '',
      contaId: '',
      fornecedorId: '',
      quantidade: '',
      valorUnitario: '',
      dataCompra: format(new Date(), 'yyyy-MM-dd'),
      status: 'pendente',
      observacoes: '',
    });
    setEditingCompra(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantidade = parseInt(formData.quantidade);
    const valorUnitario = parseFloat(formData.valorUnitario);
    const valorTotal = quantidade * valorUnitario;

    const compraData = {
      programaId: formData.programaId,
      contaId: formData.contaId,
      fornecedorId: formData.fornecedorId,
      quantidade,
      valorUnitario,
      valorTotal,
      dataCompra: new Date(formData.dataCompra),
      status: formData.status,
      observacoes: formData.observacoes,
    };

    if (editingCompra) {
      updateCompra(editingCompra.id, compraData);
      toast.success('Compra atualizada com sucesso!');
    } else {
      addCompra(compraData);
      toast.success('Compra registrada com sucesso!');
    }

    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (compra: Compra) => {
    setEditingCompra(compra);
    setFormData({
      programaId: compra.programaId,
      contaId: compra.contaId,
      fornecedorId: compra.fornecedorId,
      quantidade: compra.quantidade.toString(),
      valorUnitario: compra.valorUnitario.toString(),
      dataCompra: format(new Date(compra.dataCompra), 'yyyy-MM-dd'),
      status: compra.status,
      observacoes: compra.observacoes || '',
    });
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta compra?')) {
      deleteCompra(id);
      toast.success('Compra excluída com sucesso!');
    }
  };

  const columns = [
    {
      key: 'dataCompra',
      header: 'Data',
      render: (compra: Compra) => format(new Date(compra.dataCompra), 'dd/MM/yyyy'),
    },
    {
      key: 'programaId',
      header: 'Programa',
      render: (compra: Compra) => programas.find(p => p.id === compra.programaId)?.nome || '-',
    },
    {
      key: 'contaId',
      header: 'Conta',
      render: (compra: Compra) => contas.find(c => c.id === compra.contaId)?.nome || '-',
    },
    {
      key: 'fornecedorId',
      header: 'Fornecedor',
      render: (compra: Compra) => fornecedores.find(f => f.id === compra.fornecedorId)?.nome || '-',
    },
    {
      key: 'quantidade',
      header: 'Qtd. Milhas',
      render: (compra: Compra) => compra.quantidade.toLocaleString('pt-BR'),
    },
    {
      key: 'valorTotal',
      header: 'Valor Total',
      render: (compra: Compra) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(compra.valorTotal),
    },
    {
      key: 'status',
      header: 'Status',
      render: (compra: Compra) => <StatusBadge status={compra.status} />,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (compra: Compra) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(compra)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(compra.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <PageHeader
        title="Compras"
        description="Gerencie suas compras de milhas"
        action={
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Nova Compra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCompra ? 'Editar Compra' : 'Nova Compra'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Programa</Label>
                    <Select
                      value={formData.programaId}
                      onValueChange={(value) => setFormData({ ...formData, programaId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {programas.filter(p => p.ativo).map((programa) => (
                          <SelectItem key={programa.id} value={programa.id}>
                            {programa.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Conta</Label>
                    <Select
                      value={formData.contaId}
                      onValueChange={(value) => setFormData({ ...formData, contaId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {contas.filter(c => c.ativo).map((conta) => (
                          <SelectItem key={conta.id} value={conta.id}>
                            {conta.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Select
                    value={formData.fornecedorId}
                    onValueChange={(value) => setFormData({ ...formData, fornecedorId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {fornecedores.filter(f => f.ativo).map((fornecedor) => (
                        <SelectItem key={fornecedor.id} value={fornecedor.id}>
                          {fornecedor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade de Milhas</Label>
                    <Input
                      type="number"
                      value={formData.quantidade}
                      onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                      placeholder="10000"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Unitário (R$/1000)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valorUnitario}
                      onChange={(e) => setFormData({ ...formData, valorUnitario: e.target.value })}
                      placeholder="15.00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data da Compra</Label>
                    <Input
                      type="date"
                      value={formData.dataCompra}
                      onChange={(e) => setFormData({ ...formData, dataCompra: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: 'pendente' | 'pago') => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                    {editingCompra ? 'Salvar' : 'Registrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        data={compras}
        columns={columns}
        emptyMessage="Nenhuma compra registrada. Clique em 'Nova Compra' para começar."
      />
    </MainLayout>
  );
};

export default Compras;
