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
import { Venda } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Vendas = () => {
  const {
    vendas,
    programas,
    contas,
    clientes,
    addVenda,
    updateVenda,
    deleteVenda,
  } = useData();

  const [isOpen, setIsOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null);
  
  // NOVO: Estado para parcelas
  const [parcelas, setParcelas] = useState(1);

  const [formData, setFormData] = useState({
    programaId: '',
    contaId: '',
    clienteId: '',
    quantidade: '',
    valorUnitario: '',
    dataVenda: format(new Date(), 'yyyy-MM-dd'),
    status: 'pendente' as 'pendente' | 'recebido',
    observacoes: '',
  });

  const resetForm = () => {
    setFormData({
      programaId: '',
      contaId: '',
      clienteId: '',
      quantidade: '',
      valorUnitario: '',
      dataVenda: format(new Date(), 'yyyy-MM-dd'),
      status: 'pendente',
      observacoes: '',
    });
    setEditingVenda(null);
    setParcelas(1); // Reseta parcelas
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantidade = parseInt(formData.quantidade);
    const valorUnitario = parseFloat(formData.valorUnitario);
    const valorTotal = quantidade * valorUnitario;

    const vendaData = {
      programaId: formData.programaId,
      contaId: formData.contaId,
      clienteId: formData.clienteId,
      quantidade,
      valorUnitario,
      valorTotal,
      dataVenda: new Date(formData.dataVenda),
      status: formData.status,
      observacoes: formData.observacoes,
    };

    if (editingVenda) {
      updateVenda(editingVenda.id, vendaData);
      toast.success('Venda atualizada com sucesso!');
    } else {
      // ATUALIZADO: Passando o número de parcelas para o contexto
      addVenda(vendaData, parcelas);
      toast.success('Venda registrada com sucesso!');
    }

    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (venda: Venda) => {
    setEditingVenda(venda);
    setFormData({
      programaId: venda.programaId,
      contaId: venda.contaId,
      clienteId: venda.clienteId,
      quantidade: venda.quantidade.toString(),
      valorUnitario: venda.valorUnitario.toString(),
      dataVenda: format(new Date(venda.dataVenda), 'yyyy-MM-dd'),
      status: venda.status,
      observacoes: venda.observacoes || '',
    });
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta venda?')) {
      deleteVenda(id);
      toast.success('Venda excluída com sucesso!');
    }
  };

  const columns = [
    {
      key: 'dataVenda',
      header: 'Data',
      render: (venda: Venda) => format(new Date(venda.dataVenda), 'dd/MM/yyyy'),
    },
    {
      key: 'programaId',
      header: 'Programa',
      render: (venda: Venda) => programas.find(p => p.id === venda.programaId)?.nome || '-',
    },
    {
      key: 'contaId',
      header: 'Conta',
      render: (venda: Venda) => contas.find(c => c.id === venda.contaId)?.nome || '-',
    },
    {
      key: 'clienteId',
      header: 'Cliente',
      render: (venda: Venda) => clientes.find(c => c.id === venda.clienteId)?.nome || '-',
    },
    {
      key: 'quantidade',
      header: 'Qtd. Milhas',
      render: (venda: Venda) => venda.quantidade.toLocaleString('pt-BR'),
    },
    {
      key: 'valorTotal',
      header: 'Valor Total',
      render: (venda: Venda) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.valorTotal),
    },
    {
      key: 'status',
      header: 'Status',
      render: (venda: Venda) => <StatusBadge status={venda.status} />,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (venda: Venda) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(venda)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(venda.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <PageHeader
        title="Vendas"
        description="Gerencie suas vendas de milhas"
        action={
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Nova Venda
