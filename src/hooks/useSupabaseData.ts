import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const parseCurrency = (value: any) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value.replace(',', '.'));
  return 0;
};

/* --- LEITURA --- */
export const useAccounts = () => useQuery({ queryKey: ['accounts'], queryFn: async () => (await supabase.from('accounts').select('*').order('name')).data || [] });
export const usePrograms = () => useQuery({ queryKey: ['programs'], queryFn: async () => (await supabase.from('programs').select('*').order('name')).data || [] });
export const usePassageiros = () => useQuery({ queryKey: ['passengers'], queryFn: async () => (await supabase.from('passengers').select('*').order('name')).data || [] });
export const useCreditCards = () => useQuery({ queryKey: ['credit_cards'], queryFn: async () => (await supabase.from('credit_cards').select('*').order('name')).data || [] });
export const useSuppliers = () => useQuery({ queryKey: ['suppliers'], queryFn: async () => (await supabase.from('suppliers').select('*').order('name')).data || [] });
export const useTransactions = () => useQuery({ queryKey: ['transactions'], queryFn: async () => (await supabase.from('transactions').select('*').order('transaction_date', { ascending: false })).data || [] });
export const useMilesBalance = () => useQuery({ queryKey: ['miles_balance'], queryFn: async () => (await supabase.from('miles_balance').select('*')).data || [] });
export const useExpiringMiles = () => useQuery({ queryKey: ['expiring_miles'], queryFn: async () => (await supabase.from('expiring_miles').select('*').order('expiration_date')).data || [] });

// VENDAS
export const useSales = () => useQuery({ 
    queryKey: ['sales'], 
    queryFn: async () => (await supabase.from('transactions').select('*').eq('type', 'VENDA').order('transaction_date', { ascending: false })).data || [] 
});

// FINANCEIRO (RECEBER) - CORRIGIDO JOIN
export const useReceivableInstallments = () => useQuery({
    queryKey: ['receivable_installments'],
    queryFn: async () => {
      const { data } = await supabase.from('receivable_installments').select(`*, receivables (description, total_amount)`).order('due_date');
      return data || [];
    },
});

// FINANCEIRO (PAGAR)
export const usePayableInstallments = () => useQuery({
    queryKey: ['payable_installments'],
    queryFn: async () => {
      const { data } = await supabase.from('payable_installments').select(`*, payables (description, credit_cards (name))`).order('due_date');
      return data || [];
    },
});

/* --- ESCRITA --- */

// 1. CRIAR VENDA (Status 'PENDENTE' agora funciona pois mudamos o banco para TEXTO)
export const useCreateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newSale: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const valorTotalLimpo = parseCurrency(newSale.valorTotal);
      const quantidadeNegativa = -1 * Math.abs(parseInt(newSale.quantidade));

      const { data: transaction, error: transError } = await supabase.from('transactions')
        .insert({
            user_id: user?.id,
            program_id: newSale.programaId,
            account_id: newSale.contaId,
            type: 'VENDA',
            quantity: quantidadeNegativa,
            total_cost: valorTotalLimpo,
            transaction_date: newSale.dataVenda,
            description: `Venda Milhas`,
            notes: newSale.observacoes || ''
        }).select().single();

      if (transError) throw transError;

      if (newSale.passageiros?.length > 0) {
          const passData = newSale.passageiros.map((p:any) => ({
              user_id: user?.id,
              transaction_id: transaction.id,
              name: p.nome,
              cpf: p.cpf
          }));
          await supabase.from('passengers').insert(passData);
      }

      if (valorTotalLimpo > 0) {
        const { data: receivable, error: recError } = await supabase.from('receivables')
          .insert({
              user_id: user?.id,
              transaction_id: transaction.id,
              description: `Venda de Milhas - Transação #${transaction.id.slice(0, 8)}`, 
              total_amount: valorTotalLimpo,
              installments: newSale.parcelas || 1
          }).select().single();

        if (!recError) {
            const numParcelas = newSale.parcelas || 1;
            const valorParcela = valorTotalLimpo / numParcelas;
            const installments = [];

            for (let i = 0; i < numParcelas; i++) {
                const dataBase = new Date(newSale.dataRecebimento);
                const dataVencimento = new Date(dataBase.valueOf() + dataBase.getTimezoneOffset() * 60000);
                if (i > 0) dataVencimento.setMonth(dataVencimento.getMonth() + i);

                installments.push({
                    user_id: user?.id,
                    receivable_id: receivable.id,
                    installment_number: i + 1,
                    amount: valorParcela,
                    due_date: dataVencimento.toISOString().split('T')[0],
                    status: 'PENDENTE' // Banco agora aceita texto livre!
                });
            }
            await supabase.from('receivable_installments').insert(installments);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['miles_balance'] });
      queryClient.invalidateQueries({ queryKey: ['receivable_installments'] });
      queryClient.invalidateQueries({ queryKey: ['passengers_with_transactions'] });
      toast.success('Venda registrada!');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`)
  });
};

// 2. EXCLUIR VENDA
export const useDeleteSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: recs } = await supabase.from('receivables').select('id').eq('transaction_id', id);
      if (recs) {
          for (const r of recs) {
              await supabase.from('receivable_installments').delete().eq('receivable_id', r.id);
              await supabase.from('receivables').delete().eq('id', r.id);
          }
      }
      // Fallback
      const { data: recsDesc } = await supabase.from('receivables').select('id').ilike('description', `%${id.slice(0, 8)}%`);
      if (recsDesc) {
          for (const r of recsDesc) {
              await supabase.from('receivable_installments').delete().eq('receivable_id', r.id);
              await supabase.from('receivables').delete().eq('id', r.id);
          }
      }
      await supabase.from('transactions').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['receivable_installments'] });
      queryClient.invalidateQueries({ queryKey: ['passengers_with_transactions'] });
      toast.success('Venda excluída!');
    },
  });
};

// 3. OUTRAS FUNÇÕES (PARA CORRIGIR ERRO DO VERCEL)
export const useCreatePassenger = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (p: any) => { await supabase.from('passengers').insert(p); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['passengers'] }) })};
export const useCreateTransaction = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (p: any) => { const safeP = { ...p, total_cost: parseCurrency(p.total_cost) }; await supabase.from('transactions').insert(safeP); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['miles_balance'] }); } })};
export const useDeleteTransaction = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (id: string) => { await supabase.from('transactions').delete().eq('id', id); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['miles_balance'] }); } })};

// AS FUNÇÕES QUE FALTAVAM
export const useCreatePayable = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (p: any) => { await supabase.from('payables').insert(p); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['payable_installments'] }) })};
export const useCreatePayableInstallments = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (items: any[]) => { await supabase.from('payable_installments').insert(items); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['payable_installments'] }) })};
export const useCreateReceivable = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (p: any) => { await supabase.from('receivables').insert(p); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['receivable_installments'] }) })};
export const useCreateReceivableInstallments = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (items: any[]) => { await supabase.from('receivable_installments').insert(items); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['receivable_installments'] }) })};

// Cartões
export const useCreateCreditCard = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (c: any) => { await supabase.from('credit_cards').insert({...c, limit_amount: parseCurrency(c.limite)}); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['credit_cards'] }) })};
export const useUpdateCreditCard = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async ({id, ...c}: any) => { await supabase.from('credit_cards').update({...c, limit_amount: parseCurrency(c.limite)}).eq('id', id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['credit_cards'] }) })};
export const useDeleteCreditCard = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (id: string) => { await supabase.from('credit_cards').delete().eq('id', id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['credit_cards'] }) })};
