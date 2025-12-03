import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Conta } from '@/types';
import { toast } from 'sonner';

const Contas = () => {
  const { contas, addConta, updateConta, deleteConta } = useData();

  const [isOpen, setIsOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<Conta | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    ativo: true,
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      cpf: '',
      ativo: true,
    });
    setEditingConta(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingConta) {
      updateConta(editingConta.id, formData);
      toast.success('Conta atualizada com sucesso!');
    } else {
      addConta(formData);
      toast.success('Conta cadastrada com sucesso!');
    }

    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (conta: Conta) => {
    setEditingConta(conta);
    setFormData({
      nome: conta.nome,
      cpf: conta.cpf,
      ativo: conta.ativo,
    });
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conta?')) {
      deleteConta(id);
      toast.success('Conta excluída com sucesso!');
    }
  };

  const columns = [
    { key: 'nome', header: 'Nome' },
    { key: 'cpf', header: 'CPF' },
    {
      key: 'ativo',
      header: 'Status',
      render: (conta: Conta) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            conta.ativo
              ? 'bg-success/10 text-success border border-success/30'
              : 'bg-muted text-muted-foreground border border-border'
          }`}
        >
          {conta.ativo ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (conta: Conta) => (
        <div className="flex gap-2">
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
        title="Contas (CPFs)"
        description="Gerencie as contas/CPFs para aquisição de milhas"
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
                <DialogTitle>{editingConta ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome do titular"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="gradient-primary">
                    {editingConta ? 'Salvar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        data={contas}
        columns={columns}
        emptyMessage="Nenhuma conta cadastrada. Clique em 'Nova Conta' para começar."
      />
    </MainLayout>
  );
};

export default Contas;
