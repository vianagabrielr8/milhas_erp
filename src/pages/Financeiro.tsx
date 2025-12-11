import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Check, 
  CreditCard, 
  Calendar, 
  Plus,
  TrendingDown,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { format, isBefore, startOfDay, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { 
  usePayableInstallments, 
  useUpdatePayableInstallment,
  useReceivableInstallments,
  useUpdateReceivableInstallment,
  useCreditCards,
  useCreatePayable,
  useCreatePayableInstallments,
} from '@/hooks/useSupabaseData';
import { formatCurrency, generateInstallments, calculateCardDates } from '@/utils/financeLogic';

const Financeiro = () => {
  const { data: payableInstallments, isLoading: loadingPayables } = usePayableInstallments();
  const { data: receivableInstallments, isLoading: loadingReceivables } = useReceivableInstallments();
  const { data: creditCards } = useCreditCards();
  
  const updatePayableInstallment = useUpdatePayableInstallment();
  const updateReceivableInstallment = useUpdateReceivableInstallment();
  const createPayable = useCreatePayable();
  const createPayableInstallments = useCreatePayableInstallments();

  const [activeTab, setActiveTab] = useState('pagar');
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'yyyy-MM'));
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  
  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    totalValue: '',
    category: 'OUTROS',
    useCreditCard: false,
    creditCardId: '',
    installments: '1',
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
  });

  // Filter by month
  const filterByMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    const filterStart = startOfMonth(new Date(monthFilter + '-01'));
    const filterEnd = endOfMonth(filterStart);
    return date >= filterStart && date <= filterEnd;
  };

  // Process payable installments
  const processedPayables = payableInstallments
    ?.map(inst => {
      const isOverdue = inst.status === 'pendente' && isBefore(new Date(inst.due_date), startOfDay(new Date()));
      return {
        ...inst,
        displayStatus: isOverdue ? 'vencido' : inst.status,
      };
    })
    .filter(inst => filterByMonth(inst.due_date)) || [];

  // Process receivable installments
  const processedReceivables = receivableInstallments
    ?.map(inst => {
      const isOverdue = inst.status === 'pendente' && isBefore(new Date(inst.due_date), startOfDay(new Date()));
      return {
        ...inst,
        displayStatus: isOverdue ? 'vencido' : inst.status,
      };
    })
    .filter(inst => filterByMonth(inst.due_date)) || [];

  // Calculate summaries
  const payableSummary = {
    pending: processedPayables.filter(i => i.status === 'pendente').reduce((acc, i) => acc + Number(i.amount), 0),
    overdue: processedPayables.filter(i => i.displayStatus === 'vencido').reduce((acc, i) => acc + Number(i.amount), 0),
    paid: processedPayables.filter(i => i.status === 'pago').reduce((acc, i) => acc + Number(i.amount), 0),
  };

  const receivableSummary = {
    pending: processedReceivables.filter(i => i.status === 'pendente').reduce((acc, i) => acc + Number(i.amount), 0),
    overdue: processedReceivables.filter(i => i.displayStatus === 'vencido').reduce((acc, i) => acc + Number(i.amount), 0),
    received: processedReceivables.filter(i => i.status === 'pago').reduce((acc, i) => acc + Number(i.amount), 0),
  };

  const handlePagar = async (id: string) => {
    try {
      await updatePayableInstallment.mutateAsync({
        id,
        status: 'pago',
        paid_date: format(new Date(), 'yyyy-MM-dd'),
      });
      toast.success('Parcela marcada como paga!');
    } catch (error) {
      toast.error('Erro ao atualizar parcela');
    }
  };

  const handleReceber = async (id: string) => {
    try {
      await updateReceivableInstallment.mutateAsync({
        id,
        status: 'pago',
        received_date: format(new Date(), 'yyyy-MM-dd'),
      });
      toast.success('Parcela marcada como recebida!');
    } catch (error) {
      toast.error('Erro ao atualizar parcela');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const totalValue = parseFloat(expenseForm.totalValue);
      const installmentCount = parseInt(expenseForm.installments);
      
      let firstDueDate: Date;
      
      if (expenseForm.useCreditCard && expenseForm.creditCardId) {
        const card = creditCards?.find(c => c.id === expenseForm.creditCardId);
        firstDueDate = calculateCardDates(
          new Date(expenseForm.purchaseDate),
          card?.closing_day || null,
          card?.due_day || null
        );
      } else {
        firstDueDate = addMonths(new Date(expenseForm.purchaseDate), 1);
      }

      const payable = await createPayable.mutateAsync({
        description: expenseForm.description,
        total_amount: totalValue,
        installments: installmentCount,
        credit_card_id: expenseForm.useCreditCard ? expenseForm.creditCardId : null,
      });

      const installments = generateInstallments(totalValue, installmentCount, firstDueDate);
      
      await createPayableInstallments.mutateAsync(
        installments.map(inst => ({
          payable_id: payable.id,
          installment_number: inst.installmentNumber,
          amount: inst.amount,
          due_date: format(inst.dueDate, 'yyyy-MM-dd'),
          status: 'pendente' as const,
        }))
      );

      toast.success('Gasto registrado com sucesso!');
      setIsExpenseModalOpen(false);
      setExpenseForm({
        description: '',
        totalValue: '',
        category: 'OUTROS',
        useCreditCard: false,
        creditCardId: '',
        installments: '1',
        purchaseDate: format(new Date(), 'yyyy-MM-dd'),
      });
    } catch (error) {
      toast.error('Erro ao registrar gasto');
    }
  };

  // Extract category from description
  const getCategoryBadge = (description: string) => {
    if (description.toLowerCase().includes('compra milhas')) {
      return <Badge variant="default">Compra Milhas</Badge>;
    }
    if (description.toLowerCase().includes('clube')) {
      return <Badge variant="secondary">Clube/Assinatura</Badge>;
    }
    if (description.toLowerCase().includes('taxa')) {
      return <Badge variant="outline">Taxa</Badge>;
    }
    return <Badge variant="outline">Outros</Badge>;
  };

  const payableColumns = [
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
        <div className="space-y-1">
          <div className="font-medium">{inst.payables?.description}</div>
          <div className="flex items-center gap-2">
            {getCategoryBadge(inst.payables?.description || '')}
            {inst.payables?.credit_cards?.name && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                {inst.payables.credit_cards.name}
              </span>
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
          {inst.installment_number}/{inst.payables?.installments || 1}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      render: (inst: any) => (
        <span className="font-medium">
          {formatCurrency(inst.amount)}
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

  const receivableColumns = [
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
        <div className="font-medium">{inst.receivables?.description}</div>
      ),
    },
    {
      key: 'installment_number',
      header: 'Parcela',
      render: (inst: any) => (
        <Badge variant="outline">
          {inst.installment_number}/{inst.receivables?.installments || 1}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      render: (inst: any) => (
        <span className="font-medium text-success">
          {formatCurrency(inst.amount)}
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
              onClick={() => handleReceber(inst.id)}
              title="Marcar como recebido"
            >
              <Check className="h-4 w-4 text-success" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Generate month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = addMonths(new Date(), i - 3);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: ptBR }),
    };
  });

  if (loadingPayables || loadingReceivables) {
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
        title="Financeiro"
        description="Gerencie suas contas a pagar e receber"
      />

      {/* Month Filter */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Período:</span>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setIsExpenseModalOpen(true)} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Novo Gasto Extra
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="pagar" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            A Pagar
          </TabsTrigger>
          <TabsTrigger value="receber" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            A Receber
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pagar">
          {/* Payable Summary */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pendente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(payableSummary.pending)}
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
                  {formatCurrency(payableSummary.overdue)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-success/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-success">
                  Pagas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(payableSummary.paid)}
                </div>
              </CardContent>
            </Card>
          </div>

          <DataTable
            data={processedPayables}
            columns={payableColumns}
            emptyMessage="Nenhuma conta a pagar neste período."
          />
        </TabsContent>

        <TabsContent value="receber">
          {/* Receivable Summary */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pendente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(receivableSummary.pending)}
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
                  {formatCurrency(receivableSummary.overdue)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-success/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-success">
                  Recebidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(receivableSummary.received)}
                </div>
              </CardContent>
            </Card>
          </div>

          <DataTable
            data={processedReceivables}
            columns={receivableColumns}
            emptyMessage="Nenhuma conta a receber neste período."
          />
        </TabsContent>
      </Tabs>

      {/* Expense Modal */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Novo Gasto Extra
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={expenseForm.description}
                onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="Ex: Clube Livelo, Taxa de transferência..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Total</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={expenseForm.totalValue}
                  onChange={e => setExpenseForm({ ...expenseForm, totalValue: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={expenseForm.purchaseDate}
                  onChange={e => setExpenseForm({ ...expenseForm, purchaseDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useCreditCard"
                checked={expenseForm.useCreditCard}
                onChange={e => setExpenseForm({ ...expenseForm, useCreditCard: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="useCreditCard">Usou cartão de crédito?</Label>
            </div>

            {expenseForm.useCreditCard && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cartão</Label>
                  <Select 
                    value={expenseForm.creditCardId} 
                    onValueChange={v => setExpenseForm({ ...expenseForm, creditCardId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {creditCards?.map(card => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Parcelas</Label>
                  <Select 
                    value={expenseForm.installments} 
                    onValueChange={v => setExpenseForm({ ...expenseForm, installments: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={n.toString()}>
                          {n}x
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsExpenseModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Registrar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Financeiro;
