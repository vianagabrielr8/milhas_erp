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
import { Programa } from '@/types';
import { toast } from 'sonner';

const Programas = () => {
  const { programas, addPrograma, updatePrograma, deletePrograma } = useData();

  const [isOpen, setIsOpen] = useState(false);
  const [editingPrograma, setEditingPrograma] = useState<Programa | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ativo: true,
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      ativo: true,
    });
    setEditingPrograma(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPrograma) {
      updatePrograma(editingPrograma.id, formData);
      toast.success('Programa atualizado com sucesso!');
    } else {
      addPrograma(formData);
      toast.success('Programa cadastrado com sucesso!');
    }

    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (programa: Programa) => {
    setEditingPrograma(programa);
    setFormData({
      nome: programa.nome,
      descricao: programa.descricao || '',
      ativo: programa.ativo,
    });
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este programa?')) {
      deletePrograma(id);
      toast.success('Programa excluído com sucesso!');
    }
  };

  const columns = [
    { key: 'nome', header: 'Nome' },
    // A coluna Descrição foi removida daqui conforme solicitado
    {
      key: 'ativo',
      header: 'Status',
      render: (programa: Programa) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            programa.ativo
              ? 'bg-success/10 text-success border border-success/30'
              : 'bg-muted text-muted-foreground border border-border'
          }`}
        >
          {programa.ativo ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (programa: Programa) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(programa)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(programa.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <PageHeader
        title="Programas de Milhas"
        description="Gerencie os programas de fidelidade"
        action={
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Novo Programa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingPrograma ? 'Editar Programa' : 'Novo Programa'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Smiles, LATAM Pass"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição (opcional)"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="gradient-primary">
                    {editingPrograma ? 'Salvar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        data={programas}
        columns={columns}
        emptyMessage="Nenhum programa cadastrado. Clique em 'Novo Programa' para começar."
      />
    </MainLayout>
  );
};

export default Programas;
