import { useState } from 'react';
import { useData } from '@/contexts/DataContext'; 
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Passageiros = () => {
  const { passageiros, addCliente, updateCliente, deleteCliente } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [editingPassageiro, setEditingPassageiro] = useState<any>(null);
  const [formData, setFormData] = useState({ nome: '', cpf: '' });

  const resetForm = () => {
    setFormData({ nome: '', cpf: '' });
    setEditingPassageiro(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawCpf = formData.cpf.replace(/\D/g, '');

    if (!formData.nome.trim() || rawCpf.length !== 11) {
      toast.error('Nome e CPF (11 dígitos) são obrigatórios.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não logado");

      const payload = {
        name: formData.nome,
        cpf: rawCpf,
        user_id: user.id
      };

      if (editingPassageiro) {
        await updateCliente({ id: editingPassageiro.id, ...payload });
        toast.success('Passageiro atualizado!');
      } else {
        await addCliente(payload);
        toast.success('Passageiro cadastrado!');
      }
      setIsOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar passageiro.');
    }
  };

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'cpf', header: 'CPF' },
    {
      key: 'actions',
      header: 'Ações',
      render: (p: any) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => { setEditingPassageiro(p); setFormData({ nome: p.name, cpf: p.cpf }); setIsOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => confirm('Excluir?') && deleteCliente(p.id)}>
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
        action={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2" />Novo Passageiro</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingPassageiro ? 'Editar' : 'Novo'} Passageiro</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Label>Nome</Label>
                <Input value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                <Label>CPF</Label>
                <Input value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} maxLength={14} required />
                <Button type="submit" className="w-full">Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <DataTable data={passageiros} columns={columns} />
    </MainLayout>
  );
};

export default Passageiros;
