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
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingVenda ? 'Editar Venda' : 'Nova Venda'}</DialogTitle>
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
                  <Label>Cliente</Label>
                  <Select
                    value={formData.clienteId}
                    onValueChange={(value) => setFormData({ ...formData, clienteId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.filter(c => c.ativo).map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome}
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
                      placeholder="20.00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data da Venda</Label>
                    <Input
                      type="date"
                      value={formData.dataVenda}
                      onChange={(e) => setFormData({ ...formData, dataVenda: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: 'pendente' | 'recebido') => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="recebido">Recebido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* --- BLOCO NOVO: PARCELAMENTO (SÓ APARECE SE PENDENTE) --- */}
                {formData.status === 'pendente' && !editingVenda && (
                  <div className="space-y-2 border-t pt-4 bg-muted/20 p-3 rounded-lg">
                    <Label className="text-primary font-medium">Parcelamento</Label>
                    <div className="flex gap-4 items-start">
                      <div className="w-1/3 space-y-2">
                        <Label className="text-xs text-muted-foreground">Qtd Parcelas</Label>
                        <Input
                          type="number"
                          min="1"
                          max="24"
                          value={parcelas}
                          onChange={(e) => setParcelas(Number(e.target.value))}
                        />
                      </div>
                      <div className="flex-1 text-sm text-muted-foreground bg-muted/50 p-3 rounded border">
                        <p className="font-medium mb-2 text-xs uppercase tracking-wide">Previsão de Recebimento</p>
                        <div className="max-h-32 overflow-y-auto text-xs space-y-2 pr-1 custom-scrollbar">
                          {Array.from({ length: Math.max(1, parcelas) }).map((_, i) => {
                            // Calcula a data baseada na data da venda + meses
                            const dataBase = formData.dataVenda ? new Date(formData.dataVenda) : new Date();
                            const dataPrevista = new Date(dataBase);
                            // Ajusta o mês (mês da venda + 1, + 2, etc)
                            dataPrevista.setMonth(dataBase.getMonth() + (i + 1));
                            
                            // Calcula valor aproximado
                            const qtd = parseInt(formData.quantidade) || 0;
                            const valUnit = parseFloat(formData.valorUnitario) || 0;
                            const total = qtd * valUnit;
                            const valorParc = total / (parcelas || 1);
                            
                            return (
                              <div key={i} className="flex justify-between items-center border-b border-border/50 pb-1 last:border-0 last:pb-0">
                                <span className="font-medium">{i + 1}ª Parc: {dataPrevista.toLocaleDateString('pt-BR')}</span>
                                <span className="text-primary">{valorParc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* -------------------------------------------------------- */}

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
                    {editingVenda ? 'Salvar' : 'Registrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        data={vendas}
        columns={columns}
        emptyMessage="Nenhuma venda registrada. Clique em 'Nova Venda' para começar."
      />
    </MainLayout>
  );
};

export default Vendas;
