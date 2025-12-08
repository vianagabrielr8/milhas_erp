import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useTransactions, useDeleteTransaction } from '@/hooks/useSupabaseData';
import { formatCPM } from '@/utils/financeLogic';

const Compras = () => {
  const navigate = useNavigate();
  const { data: transactions, isLoading } = useTransactions();
  const deleteTransaction = useDeleteTransaction();

  // Filter only purchases
  const compras = transactions?.filter(t => t.type === 'COMPRA') || [];

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta compra?')) {
      try {
        await deleteTransaction.mutateAsync(id);
        toast.success('Compra excluída com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir compra');
      }
    }
  };

  const columns = [
    {
      key: 'transaction_date',
      header: 'Data',
      render: (t: any) => format(new Date(t.transaction_date), 'dd/MM/yyyy', { locale: ptBR }),
    },
    {
      key: 'program',
      header: 'Programa',
      render: (t: any) => (
        <Badge variant="secondary">{t.programs?.name}</Badge>
      ),
    },
    {
      key: 'account',
      header: 'Conta',
      render: (t: any) => t.accounts?.name || '-',
    },
    {
      key: 'supplier',
      header: 'Fornecedor',
      render: (t: any) => t.suppliers?.name || '-',
    },
    {
      key: 'quantity',
      header: 'Qtd. Milhas',
      render: (t: any) => t.quantity.toLocaleString('pt-BR'),
    },
    {
      key: 'total_cost',
      header: 'Valor Total',
      render: (t: any) => (
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.total_cost || 0)
      ),
    },
    {
      key: 'cpm',
      header: 'CPM',
      render: (t: any) => (
        <span className="font-medium text-primary">
          {formatCPM(t.cost_per_thousand)}
        </span>
      ),
    },
    {
      key: 'expiration',
      header: 'Expira em',
      render: (t: any) => t.expiration_date 
        ? format(new Date(t.expiration_date), 'dd/MM/yyyy', { locale: ptBR })
        : '-',
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (t: any) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Compras"
        description="Gerencie suas compras de milhas"
        action={
          <Button className="gradient-primary" onClick={() => navigate('/compras/nova')}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Compra
          </Button>
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
