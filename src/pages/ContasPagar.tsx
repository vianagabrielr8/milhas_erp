import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, CreditCard, Calendar } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { usePayableInstallments, useUpdatePayableInstallment } from '@/hooks/useSupabaseData';

const ContasPagar = () => {
  const { data: installments, isLoading } = usePayableInstallments();
  const updateInstallment = useUpdatePayableInstallment();

  const handlePagar = async (id: string) => {
    try {
      await updateInstallment.mutateAsync({
        id,
        status: 'pago',
        paid_date: format(new Date(), 'yyyy-MM-dd'),
      });
      toast.success('Parcela marcada como paga!');
    } catch (error) {
      toast.error('Erro ao atualizar parcela');
    }
  };

  // Calculate summary
  const pendingTotal = installments
    ?.filter(i => i.status === 'pendente')
    .reduce((acc, i) => acc + Number(i.amount), 0) || 0;
  
  const overdueTotal = installments
    ?.filter(i => i.status === 'pendente' && isBefore(new Date(i.due_date), startOfDay(new Date())))
    .reduce((acc, i) => acc + Number(i.amount), 0) || 0;

  const paidTotal = installments
    ?.filter(i => i.status === 'pago')
    .reduce((acc, i) => acc + Number(i.amount), 0) || 0;

  // Check for overdue installments
  const processedInstallments = installments?.map(inst => {
    const isOverdue = inst.status === 'pendente' && isBefore(new Date(inst.due_date), startOfDay(new Date()));
    return {
      ...inst,
      displayStatus: isOverdue ? 'vencido' : inst.status,
    };
  });

  const columns = [
    {
      key: 'due_date',
      header: 'Vencimento',
      render: (inst: any) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {format(new Date(inst.due_date), 'dd/MM/yyyy', { locale: ptBR })}
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Descrição',
      render: (inst: any) => (
        <div>
          <div className="font-medium">{inst.payables?.description}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {inst.payables?.credit_cards?.name && (
              <>
                <CreditCard className="h-3 w-3" />
                {inst.payables.credit_cards.name}
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'installment_number',
      header: 'Parcela',
      render: (inst: any) => (
        <Badge variant="outline">
          {inst.installment_number}x
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      render: (inst: any) => (
        <span className="font-medium">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (inst: any) => <StatusBadge status={inst.displayStatus} />,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (inst: any) => (
        <div className="flex gap-2">
          {inst.status !== 'pago' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handlePagar(inst.id)}
              title="Marcar como pago"
            >
              <Check className="h-4 w-4 text-success" />
            </Button>
          )}
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
        title="Contas a Pagar"
        description="Gerencie suas parcelas e pagamentos"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              A Vencer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingTotal)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">
              Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overdueTotal)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-success">
              Pagas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paidTotal)}
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={processedInstallments || []}
        columns={columns}
        emptyMessage="Nenhuma conta a pagar registrada. Registre uma compra com cartão de crédito."
      />
    </MainLayout>
  );
};

export default ContasPagar;
