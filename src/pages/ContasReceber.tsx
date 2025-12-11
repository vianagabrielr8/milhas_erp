import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReceivableInstallments } from '@/hooks/useSupabaseData';
import { formatCurrency, formatDate } from '@/utils/financeLogic';
import { format, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Filter, Calendar, Pencil, Trash2, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const ContasReceber = () => {
  const queryClient = useQueryClient();
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));
  
  // Estado Edição
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ description: '', amount: '', due_date: '' });

  const { data: contasReceber } = useReceivableInstallments();

  const { inicioMes, finalMes } = useMemo(() => {
    const [ano, mes] = mesSelecionado.split('-');
    const dataBase = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    dataBase.setHours(12, 0, 0, 0);
    return { inicioMes: startOfMonth(dataBase), finalMes: endOfMonth(dataBase) };
  }, [mesSelecionado]);

  const aReceberFiltrado = useMemo(() => {
    return contasReceber?.filter(c => {
        const data = new Date(c.due_date.includes('T') ? c.due_date : `${c.due_date}T12:00:00`);
        return isWithinInterval(data, { start: inicioMes, end: finalMes });
    }) || [];
  }, [contasReceber, inicioMes, finalMes]);

  const totalReceber = aReceberFiltrado.reduce((acc, c) => acc + Number(c.amount), 0);

  // --- AÇÕES ---
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    try {
      const { error } = await supabase.from('receivable_installments').delete().eq('id', id);
      if (error) throw error;
      toast.success('Excluído!');
      queryClient.invalidateQueries({ queryKey: ['receivable_installments'] });
    } catch (err) {
      toast.error('Erro ao excluir.');
    }
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setEditForm({
      description: item.receivables?.description || '',
      amount: item.amount,
      due_date: item.due_date
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      await supabase.from('receivable_installments')
        .update({ amount: parseFloat(editForm.amount), due_date: editForm.due_date })
        .eq('id', editingItem.id);

      if (editForm.description !== editingItem.receivables?.description) {
        await supabase.from('receivables')
          .update({ description: editForm.description })
          .eq('id', editingItem.receivable_id);
      }
      toast.success('Atualizado!');
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['receivable_installments'] });
    } catch (err) {
      toast.error('Erro ao atualizar.');
    }
  };

  return (
    <MainLayout>
      <PageHeader title="Contas a Receber" description="Previsão de entradas" />

      <div className="flex items-center gap-4 mb-6 bg-muted/20 p-4 rounded-lg border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Filter className="h-4 w-4" /> Período:</div>
        <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
          <SelectTrigger className="w-[200px] bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: 13 }, (_, i) => {
              const d = addMonths(subMonths(new Date(), 2), i);
              const valor = format(d, 'yyyy-MM');
              const label = format(d, 'MMMM yyyy', { locale: ptBR });
              return <SelectItem key={valor} value={valor}>{label.charAt(0).toUpperCase() + label.slice(1)}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      <Card className="mb-8 border-l-4 border-l-success">
        <CardHeader className="pb-2"><CardTitle className="text-success text-sm">Total a Receber</CardTitle></CardHeader>
        <CardContent><div className="text-3xl font-bold">{formatCurrency(totalReceber)}</div></CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {aReceberFiltrado.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum recebimento para este mês.</div>
          ) : (
            <div className="space-y-0">
              <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground px-4 pb-3 border-b uppercase">
                <div className="col-span-2">Data</div>
                <div className="col-span-4">Descrição</div>
                <div className="col-span-2 text-center">Parcela</div>
                <div className="col-span-2 text-right">Valor</div>
                <div className="col-span-2 text-center">Ações</div>
              </div>
              {aReceberFiltrado.map(conta => (
                <div key={conta.id} className="grid grid-cols-12 items-center p-3 border-b hover:bg-muted/30">
                  <div className="col-span-2 text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" /> {formatDate(conta.due_date)}
                  </div>
                  <div className="col-span-4">
                    <div className="text-sm font-medium">{conta.receivables?.description}</div>
                  </div>
                  <div className="col-span-2 text-center"><Badge variant="secondary">{conta.installment_number}/{conta.receivables?.installments}</Badge></div>
                  <div className="col-span-2 text-right font-bold text-success">{formatCurrency(conta.amount)}</div>
                  <div className="col-span-2 flex justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => openEditModal(conta)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(conta.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Editar Recebimento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Descrição</Label><Input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} /></div>
              <div className="space-y-2"><Label>Vencimento</Label><Input type="date" value={editForm.due_date} onChange={e => setEditForm({...editForm, due_date: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button><Button onClick={handleSaveEdit}><Save className="h-4 w-4 mr-2" /> Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default ContasReceber;
