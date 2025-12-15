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
import { Cliente as PassageiroType } from '@/types'; 
import { toast } from 'sonner';
import { MascaraCPF } from '@/components/ui/mascara-cpf'; // Componente de máscara

// MUDANÇA: Nome da função para Passageiros
const Passageiros = () => {
  // CORREÇÃO AQUI: Puxa o array 'passageiros' e as funções 'add/update/deleteCliente' do contexto.
  const { passageiros, addCliente, updateCliente, deleteCliente } = useData();

  const [isOpen, setIsOpen] = useState(false);
  const [editingPassageiro, setEditingPassageiro] = useState<PassageiroType | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      cpf: '',
    });
    setEditingPassageiro(null);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawCpf = e.target.value.replace(/\D/g, ''); 
      setFormData({ ...formData, cpf: rawCpf });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // VALIDAÇÃO: Nome e CPF obrigatórios
    if (!formData.nome.trim()) {
        toast.error('O nome é obrigatório.');
        return;
    }
    if (!formData.cpf.trim() || formData.cpf.replace(/\D/g, '').length < 11) {
        toast.error('O CPF completo é obrigatório.');
        return;
    }

    const dataToSave = {
        ...formData,
        // Mantemos os campos que a tabela 'clients' (passageiros) espera:
        email: null, 
        telefone: null,
        observacoes: null,
        ativo: true,
    }

    if (editingPassageiro) {
      // Funções de CRUD do useData ainda usam o nome 'Cliente', por isso não as renomeamos aqui.
      updateCliente(editingPassageiro.id, dataToSave); 
      toast.success('Passageiro atualizado com sucesso!');
    } else {
      addCliente(dataToSave);
      toast.success('Passageiro cadastrado com sucesso!');
    }

    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (passageiro: PassageiroType) => {
    setEditingPassageiro(passageiro);
    setFormData({
      nome: passageiro.nome,
      cpf: passageiro.cpf || '', 
    });
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este passageiro?')) {
      deleteCliente(id); 
      toast.success('Passageiro excluído com sucesso!');
    }
  };

  const columns = [
    { key: 'nome', header: 'Nome' },
    { key: 'cpf', header: 'CPF' },
    {
      key: 'actions',
      header: 'Ações',
      render: (passageiro: PassageiroType) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(passageiro)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(passageiro.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <PageHeader
        title="Passageiros"
        description="Gerencie os CPFs para emissão de passagens"
        action={
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Novo Passageiro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingPassageiro ? 'Editar Passageiro' : 'Novo Passageiro'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome do passageiro"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input
                    type="text" 
                    value={formData.cpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    required
                    maxLength={14} 
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="gradient-primary">
                    {editingPassageiro ? 'Salvar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        data={passageiros}
        columns={columns}
        emptyMessage="Nenhum passageiro cadastrado. Clique em 'Novo Passageiro' para começar."
      />
    </MainLayout>
  );
};

// MUDANÇA: Exporta o nome correto
export default Passageiros;
