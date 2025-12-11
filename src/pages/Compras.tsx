import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Plus, ShoppingCart } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { useTransactions } from '@/hooks/useSupabaseData';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { formatCurrency, formatNumber, formatDate } from '@/utils/financeLogic';
import { Badge } from '@/components/ui/badge';

const Compras = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: transactions, isLoading } = useTransactions();

  // Filtra apenas o que é COMPRA
  const comprasLista = transactions?.filter(t => t.type === 'COMPRA') || [];

  const columns = [
    { 
      key: 'transaction_date', 
      header: 'Data',
      render: (item: any) => formatDate(item.transaction_date)
    },
    { 
      key: 'program', 
      header: 'Programa',
      render: (item: any) => (
        <div className="flex flex-col">
          <span className="font-medium">{item.programs?.name}</span>
          <span className="text-xs text-muted-foreground">{item.accounts?.name}</span>
        </div>
      )
    },
    { 
      key: 'quantity', 
      header: 'Milhas',
      render: (item: any) => (
        <span className="font-bold text-emerald-600">
          +{formatNumber(item.quantity)}
        </span>
      )
    },
    { 
      key: 'total_cost', 
      header: 'Custo Total',
      render: (item: any) => formatCurrency(item.total_cost || 0)
    },
    { 
      key: 'cpm', 
      header: 'CPM',
      render: (item: any) => {
        // Evita divisão por zero
        const cpm = item.quantity > 0 ? (item.total_cost / item.quantity) * 1000 : 0;
        return <Badge variant="secondary">{formatCurrency(cpm)}</Badge>;
      }
    },
  ];

  return (
    <MainLayout>
      <PageHeader 
        title="Compras" 
        description="Histórico de aquisições de milhas"
        action={
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> 
            Nova Compra
          </Button>
        }
      />

      <div className="bg-background rounded-lg border shadow-sm">
        {isLoading ? (
           <div className="p-8 text-center text-muted-foreground">Carregando compras...</div>
        ) : (
           <DataTable 
             data={comprasLista} 
             columns={columns} 
             emptyMessage="Nenhuma compra registrada ainda."
           />
        )}
      </div>

      {/* O MODAL QUE O BOTÃO ABRE ESTÁ AQUI */}
      <TransactionModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </MainLayout>
  );
};

export default Compras;
