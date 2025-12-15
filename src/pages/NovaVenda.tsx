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
import {
  usePrograms,
  useAccounts,
  useClients,
  useMilesBalance,
  useCreateTransaction,
  useCreateReceivable,
  useCreateReceivableInstallments,
} from '@/hooks/useSupabaseData';
import {
  calculateReceivableInstallmentDates,
  calculateCPM,
  formatCPM,
} from '@/utils/financeLogic';
import { ArrowLeft } from 'lucide-react';

const NovaVenda = () => {
  const navigate = useNavigate();

  const { data: programs = [] } = usePrograms();
  const { data: accounts = [] } = useAccounts();
  const { data: clients = [] } = useClients();
  const { data: milesBalance = [] } = useMilesBalance();

  const createTransaction = useCreateTransaction();
  const createReceivable = useCreateReceivable();
  const createReceivableInstallments = useCreateReceivableInstallments();

  const [formData, setFormData] = useState({
    program_id: undefined as string | undefined,
    account_id: undefined as string | undefined,
    client_id: undefined as string | undefined,
    quantity: '',
    sale_price: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    installments: '1',
    notes: '',
  });

  const [availableBalance, setAvailableBalance] = useState(0);
  const [avgCPM, setAvgCPM] = useState(0);
  const [calculatedSPM, setCalculatedSPM] = useState(0);
  const [installmentPreview, setInstallmentPreview] = useState<any[]>([]);

  // 🔹 Atualiza saldo e CPM
  useEffect(() => {
    if (formData.program_id && formData.account_id) {
      const balance = milesBalance.find(
        b =>
          b.program_id === formData.program_id &&
          b.account_id === formData.account_id
      );
      setAvailableBalance(balance?.balance || 0);
      setAvgCPM(balance?.avg_cpm || 0);
    } else {
      setAvailableBalance(0);
      setAvgCPM(0);
    }
  }, [formData.program_id, formData.account_id, milesBalance]);

  // 🔹 Calcula SPM
  useEffect(() => {
    const qty = parseInt(formData.quantity) || 0;
    const price = parseFloat(formData.sale_price) || 0;
    setCalculatedSPM(calculateCPM(price, qty));
  }, [formData.quantity, formData.sale_price]);

  // 🔹 Preview parcelas
  useEffect(() => {
    const value = parseFloat(formData.sale_price) || 0;
    const installments = parseInt(formData.installments) || 1;

    if (value > 0) {
      setInstallmentPreview(
        calculateReceivableInstallmentDates(
          value,
          installments,
          new Date(formData.transaction_date)
        )
      );
    } else {
      setInstallmentPreview([]);
    }
  }, [formData.sale_price, formData.installments, formData.transaction_date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.program_id || !formData.account_id) {
      toast.error('Selecione Programa e Conta');
      return;
    }

    const quantity = parseInt(formData.quantity);
    const salePrice = parseFloat(formData.sale_price);

    if (quantity > availableBalance) {
      toast.error('Quantidade maior que o saldo disponível');
      return;
    }

    try {
      const transaction = await createTransaction.mutateAsync({
        program_id: formData.program_id,
        account_id: formData.account_id,
        client_id: formData.client_id || null,
        type: 'VENDA',
        quantity: -quantity,
        sale_price: salePrice,
        sale_per_thousand: calculatedSPM,
        transaction_date: formData.transaction_date,
        notes: formData.notes || null,
      });

      if (salePrice > 0) {
        const receivable = await createReceivable.mutateAsync({
          transaction_id: transaction.id,
          description: 'Venda de Milhas',
          total_amount: salePrice,
          installments: parseInt(formData.installments),
        });

        await createReceivableInstallments.mutateAsync(
          installmentPreview.map((inst: any) => ({
            receivable_id: receivable.id,
            installment_number: inst.installmentNumber,
            amount: inst.amount,
            due_date: format(inst.dueDate, 'yyyy-MM-dd'),
            status: 'pendente',
          }))
        );
      }

      toast.success('Venda registrada!');
      navigate('/vendas');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar venda');
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Nova Venda"
        action={
          <Button variant="outline" onClick={() => navigate('/vendas')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Dados da Venda</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* PROGRAMA */}
            <div>
              <Label>Programa</Label>
              <Select
                value={formData.program_id}
                onValueChange={v =>
                  setFormData(p => ({ ...p, program_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {programs.filter(p => p.active).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CONTA */}
            <div>
              <Label>Conta</Label>
              <Select
                value={formData.account_id}
                onValueChange={v =>
                  setFormData(p => ({ ...p, account_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.active).map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CLIENTE */}
            <div>
              <Label>Cliente</Label>
              <Select
                value={formData.client_id}
                onValueChange={v =>
                  setFormData(p => ({ ...p, client_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.active).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit">Registrar Venda</Button>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default NovaVenda;
