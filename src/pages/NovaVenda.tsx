import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  usePrograms,
  useAccounts,
  useClients,
  useMilesBalance,
  useCreateTransaction,
  useCreateReceivable,
  useCreateReceivableInstallments,
} from '@/hooks/useSupabaseData';
import { calculateReceivableInstallmentDates, calculateCPM, formatCPM } from '@/lib/installmentCalculator';
import { ArrowLeft, Calculator, TrendingUp, Wallet } from 'lucide-react';

const NovaVenda = () => {
  const navigate = useNavigate();
  const { data: programs } = usePrograms();
  const { data: accounts } = useAccounts();
  const { data: clients } = useClients();
  const { data: milesBalance } = useMilesBalance();
  
  const createTransaction = useCreateTransaction();
  const createReceivable = useCreateReceivable();
  const createReceivableInstallments = useCreateReceivableInstallments();

  const [formData, setFormData] = useState({
    program_id: '',
    account_id: '',
    client_id: '',
    quantity: '',
    sale_price: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    installments: '1',
    notes: '',
  });

  const [calculatedSPM, setCalculatedSPM] = useState<number>(0);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [avgCPM, setAvgCPM] = useState<number>(0);
  const [estimatedProfit, setEstimatedProfit] = useState<number>(0);
  const [installmentPreview, setInstallmentPreview] = useState<{ dueDate: Date; amount: number; installmentNumber: number }[]>([]);

  // Update available balance and avg CPM when program/account changes
  useEffect(() => {
    if (formData.program_id && formData.account_id && milesBalance) {
      const balance = milesBalance.find(
        b => b.program_id === formData.program_id && b.account_id === formData.account_id
      );
      setAvailableBalance(balance?.balance || 0);
      setAvgCPM(balance?.avg_cpm || 0);
    } else {
      setAvailableBalance(0);
      setAvgCPM(0);
    }
  }, [formData.program_id, formData.account_id, milesBalance]);

  // Calculate SPM (Sale Per Thousand Miles) and estimated profit
  useEffect(() => {
    const quantity = parseInt(formData.quantity) || 0;
    const salePrice = parseFloat(formData.sale_price) || 0;
    const spm = calculateCPM(salePrice, quantity);
    setCalculatedSPM(spm);
    
    // Calculate estimated profit: (SPM - CPM) * (quantity / 1000)
    if (quantity > 0 && avgCPM > 0) {
      const profit = (spm - avgCPM) * (quantity / 1000);
      setEstimatedProfit(profit);
    } else {
      setEstimatedProfit(0);
    }
  }, [formData.quantity, formData.sale_price, avgCPM]);

  // Calculate installment preview
  useEffect(() => {
    const salePrice = parseFloat(formData.sale_price) || 0;
    const installments = parseInt(formData.installments) || 1;
    
    if (salePrice > 0 && installments > 0) {
      const preview = calculateReceivableInstallmentDates(
        salePrice,
        installments,
        new Date(formData.transaction_date)
      );
      setInstallmentPreview(preview);
    } else {
      setInstallmentPreview([]);
    }
  }, [formData.sale_price, formData.installments, formData.transaction_date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const quantity = parseInt(formData.quantity);
    const salePrice = parseFloat(formData.sale_price);

    if (quantity > availableBalance) {
      toast.error('Quantidade maior que o saldo disponível!');
      return;
    }

    try {
      // Create transaction (negative quantity for sale)
      const transaction = await createTransaction.mutateAsync({
        program_id: formData.program_id,
        account_id: formData.account_id,
        client_id: formData.client_id || null,
        type: 'VENDA',
        quantity: -quantity, // Negative for sales
        sale_price: salePrice,
        sale_per_thousand: calculatedSPM,
        transaction_date: formData.transaction_date,
        notes: formData.notes || null,
      });

      // Create receivable with installments
      if (salePrice > 0) {
        const installments = parseInt(formData.installments) || 1;
        
        const receivable = await createReceivable.mutateAsync({
          transaction_id: transaction.id,
          description: `Venda ${quantity.toLocaleString('pt-BR')} milhas - ${programs?.find(p => p.id === formData.program_id)?.name}`,
          total_amount: salePrice,
          installments,
        });

        // Create installments
        await createReceivableInstallments.mutateAsync(
          installmentPreview.map(inst => ({
            receivable_id: receivable.id,
            installment_number: inst.installmentNumber,
            amount: inst.amount,
            due_date: format(inst.dueDate, 'yyyy-MM-dd'),
            status: 'pendente' as const,
          }))
        );
      }

      toast.success('Venda registrada com sucesso!');
      navigate('/vendas');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao registrar venda');
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Nova Venda"
        description="Registre uma nova venda de milhas"
        action={
          <Button variant="outline" onClick={() => navigate('/vendas')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dados da Venda</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Programa *</Label>
                  <Select
                    value={formData.program_id}
                    onValueChange={(value) => setFormData({ ...formData, program_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs?.filter(p => p.active).map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta *</Label>
                  <Select
                    value={formData.account_id}
                    onValueChange={(value) => setFormData({ ...formData, account_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.filter(a => a.active).map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.program_id && formData.account_id && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Saldo disponível:</span>
                    <span className="font-bold text-lg">
                      {availableBalance.toLocaleString('pt-BR')} milhas
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-muted-foreground">CPM médio:</span>
                    <span className="font-medium">{formatCPM(avgCPM)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.filter(c => c.active).map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade de Milhas *</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="10000"
                    max={availableBalance}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor de Venda (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                    placeholder="200.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data da Venda *</Label>
                  <Input
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Parcelas do Recebimento</Label>
                  <Select
                    value={formData.installments}
                    onValueChange={(value) => setFormData({ ...formData, installments: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}x
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações (opcional)"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/vendas')}>
                  Cancelar
                </Button>
                <Button type="submit" className="gradient-primary">
                  Registrar Venda
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Valor por Milheiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {formatCPM(calculatedSPM)}
              </div>
              <p className="text-sm text-muted-foreground">
                Preço de venda por milheiro
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Lucro Estimado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${estimatedProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estimatedProfit)}
              </div>
              <p className="text-sm text-muted-foreground">
                Baseado no CPM médio de {formatCPM(avgCPM)}
              </p>
            </CardContent>
          </Card>

          {installmentPreview.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Previsão de Recebimentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {installmentPreview.map((inst) => (
                    <div
                      key={inst.installmentNumber}
                      className="flex justify-between items-center text-sm p-2 rounded bg-muted/50"
                    >
                      <span>
                        {inst.installmentNumber}ª - {format(inst.dueDate, 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default NovaVenda;
