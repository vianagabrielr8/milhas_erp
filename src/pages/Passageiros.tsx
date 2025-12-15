import { useState } from 'react';
// IMPORTANTE: Assumimos que a variável 'clientes' no useData
// agora está sendo populada pelo novo hook 'usePassageiros'
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
// Importamos o tipo Cliente, mas ele agora representa um Passageiro
import { Cliente as PassageiroType } from '@/types'; 
import { toast } from 'sonner';
import { MascaraCPF } from '@/components/ui/mascara-cpf'; // Componente de máscara (Assumindo que você tem ou criará um)

// MUDANÇA: Nome da função para Passageiros
const Passageiros = () => {
  // MUDANÇA: Troquei clientes por passageiros (variável de dados do useData)
  const { clientes: passageiros, addCliente, updateCliente, deleteCliente } = useData();

  const [isOpen, setIsOpen] = useState(false);
  // MUDANÇA: Variável para o passageiro que está sendo editado
  const [editingPassageiro, setEditingPassageiro] = useState<PassageiroType | null>(null);
  
  // MUDANÇA: Apenas Nome e CPF nos dados do formulário
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

  // Funções de manipulação do CPF (opcional, para formatar)
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Remover tudo que não for dígito e aplicar máscara (se houver)
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

    // O objeto de dados para o useData precisa ter os campos que o Supabase espera.
    // Vamos manter a chamada usando addCliente/updateCliente, pois o hook usa a tabela 'clients' (agora 'passageiros')
    const dataToSave = {
        ...formData,
        // Mantemos os campos antigos com null/padrão para não quebrar o Supabase, caso a tabela espere
        email: null, 
        telefone: null,
        observacoes: null,
        ativo: true,
    }

    if (editingPassageiro) {
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
      cpf: passageiro.cpf || '', // Assumindo que o CPF é salvo como string no banco
    });
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este passageiro?')) {
      deleteCliente(id); // Usa a função de delete existente
      toast.success('Passageiro excluído com sucesso!');
    }
  };

  const columns = [
    { key: 'nome', header: 'Nome' },
    { key: 'cpf', header: 'CPF' },
    // REMOÇÃO: Campos de email/telefone/status removidos da coluna
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
        // MUDANÇA: Título da página
        title="Passageiros"
        description="Gerencie os CPFs para emissão de passagens"
        action={
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                {/* MUDANÇA: Texto do botão */}
                Novo Passageiro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                {/* MUDANÇA: Título do Modal */}
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
                    type="text" // Mantemos como text para a máscara
                    value={formData.cpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    required
                    maxLength={14} // Limita o tamanho do input
                  />
                </div>
                
                {/* REMOVIDOS: Blocos de E-mail, Telefone e Observações */}

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="gradient-primary">
                    {/* MUDANÇA: Texto do botão */}
                    {editingPassageiro ? 'Salvar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        // MUDANÇA: Variável de dados
        data={passageiros}
        columns={columns}
        // MUDANÇA: Mensagem vazia
        emptyMessage="Nenhum passageiro cadastrado. Clique em 'Novo Passageiro' para começar."
      />
    </MainLayout>
  );
};

// MUDANÇA: Exporta o nome correto
export default Passageiros;
