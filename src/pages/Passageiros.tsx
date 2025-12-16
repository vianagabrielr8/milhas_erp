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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client'; // Importado para buscar o user_id

// Tipo de Passageiro (Alinhado com a nova tabela sem 'phone')
interface PassageiroType {
    id: string;
    name: string;
    cpf: string;
}

// Função de Máscara de CPF para exibição e input
const formatCPF = (value: string) => {
    if (!value) return "";
    value = value.replace(/\D/g, ''); // Remove tudo que não é dígito
    if (value.length > 11) value = value.substring(0, 11); // Limita a 11 dígitos
    
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return value;
};


const Passageiros = () => {
  // Puxa o array 'passageiros' e as funções 'add/update/deleteCliente' (mutações) do contexto.
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
      setFormData({ ...formData, cpf: formatCPF(rawCpf) });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // VALIDAÇÃO: Nome e CPF
    if (!formData.nome.trim()) {
        toast.error('O nome é obrigatório.');
        return;
    }
    const rawCpf = formData.cpf.replace(/\D/g, '');
    if (!rawCpf || rawCpf.length !== 11) {
        toast.error('O CPF completo é obrigatório (11 dígitos).');
        return;
    }

    // 1. BUSCA O USER_ID (CRÍTICO PARA RLS)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        toast.error('Usuário não autenticado. Faça login novamente.');
        return;
    }

    // 2. MONTA O PAYLOAD (Apenas name e cpf limpo)
    const dataToSave = {
        name: formData.nome, 
        cpf: rawCpf, // Envia o CPF limpo (apenas dígitos)
        user_id: user.id, // CRÍTICO: Adiciona o ID do usuário logado
        active: true, 
    }

    try {
        if (editingPassageiro) {
            // ATUALIZAÇÃO
            // Presume-se que 'updateCliente' chama useUpdatePassenger
            await updateCliente({ id: editingPassageiro.id, ...dataToSave }); 
            toast.success('Passageiro atualizado com sucesso!');

        } else {
            // CRIAÇÃO
            // Presume-se que 'addCliente' chama useCreatePassenger
            await addCliente(dataToSave);
            toast.success('Passageiro cadastrado com sucesso!');
        }
        
        setIsOpen(false);
        resetForm();

    } catch (error) {
        console.error("Erro ao salvar passageiro:", error);
        toast.error("Erro ao salvar passageiro. Detalhes no console.");
    }
  };

  const handleEdit = (passageiro: PassageiroType) => {
    setEditingPassageiro(passageiro);
    setFormData({
      nome: passageiro.name || '', 
      cpf: formatCPF(passageiro.cpf || ''), // Aplica a máscara ao editar
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este passageiro?')) {
        try {
            await deleteCliente(id); 
            toast.success('Passageiro excluído com sucesso!');
        } catch (error) {
            toast.error('Erro ao excluir. Tente novamente.');
        }
    }
  };

  const columns = [
    { key: 'name', header: 'Nome' }, 
    { 
        key: 'cpf', 
        header: 'CPF',
        // Aplica a máscara na exibição da tabela
        render: (passageiro: PassageiroType) => formatCPF(passageiro.cpf) 
    },
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

export default Passageiros;
