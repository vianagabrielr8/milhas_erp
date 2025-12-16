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
// Importação de tipo de Passageiro (ajustado para o novo modelo simplificado)
interface PassageiroType {
    id: string;
    name: string;
    cpf: string;
    // Removidas referências a telefone/email/observacoes
}
import { toast } from 'sonner';

// Para mascaramento de CPF simples (se você não tiver uma biblioteca de máscara)
const formatCPF = (value: string) => {
    if (!value) return "";
    value = value.replace(/\D/g, ''); // Remove tudo que não é dígito
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return value;
};


const Passageiros = () => {
  // NOTA: Presumo que addCliente/updateCliente/deleteCliente utilizam as mutações useCreate/Update/DeletePassenger
  // injetadas via DataContext.
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
      // Limita a 11 dígitos para evitar problemas de formato na máscara
      const limitedCpf = rawCpf.substring(0, 11);
      setFormData({ ...formData, cpf: formatCPF(limitedCpf) });
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // VALIDAÇÃO
    if (!formData.nome.trim()) {
        toast.error('O nome é obrigatório.');
        return;
    }
    const rawCpf = formData.cpf.replace(/\D/g, '');
    if (!rawCpf || rawCpf.length !== 11) {
        toast.error('O CPF completo é obrigatório (11 dígitos).');
        return;
    }

    // DADOS A SEREM SALVOS - APENAS NAME E CPF (LIMPO)
    const dataToSave = {
        name: formData.nome, 
        cpf: rawCpf, // Envia o CPF limpo
        // active é definido no componente, se a coluna existir no banco
        active: true, 
    }

    try {
        if (editingPassageiro) {
            // ATUALIZAÇÃO - AQUI você deve usar a mutação de UPDATE
            // Presume-se que o addCliente/updateCliente do DataContext chama os hooks useCreate/UpdatePassenger
            await updateCliente({ id: editingPassageiro.id, ...dataToSave }); 
            toast.success('Passageiro atualizado com sucesso!');

        } else {
            // CRIAÇÃO
            await addCliente(dataToSave);
            toast.success('Passageiro cadastrado com sucesso!');
        }
        
        setIsOpen(false);
        resetForm();

    } catch (error) {
        console.error("Erro ao salvar passageiro:", error);
        toast.error("Erro ao salvar passageiro. Verifique o console.");
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
            await deleteCliente(id); // Chama a mutação de DELETE
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
        render: (passageiro: PassageiroType) => formatCPF(passageiro.cpf) // Aplica a máscara na exibição
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
