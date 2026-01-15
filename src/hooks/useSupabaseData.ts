import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// --- PARSER DE MOEDA (Seguro) ---
const parseCurrency = (value: any) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  if (typeof value === 'string') {
      const clean = value.replace(/\./g, '').replace(',', '.');
      return parseFloat(clean) || 0;
  }
  return 0;
};

/* --- LEITURA --- */
export const useAccounts = () => useQuery({ queryKey: ['accounts'], queryFn: async () => (await supabase.from('accounts').select('*').order('name')).data || [] });
export const usePrograms = () => useQuery({ queryKey: ['programs'], queryFn: async () => (await supabase.from('programs').select('*').order('name')).data || [] });
export const usePassageiros = () => useQuery({ queryKey: ['passengers'], queryFn: async () => (await supabase.from('passengers').select('*').order('name')).data || [] });
export const useCreditCards = () => useQuery({ queryKey: ['credit_cards'], queryFn: async () => (await supabase.from('credit_cards').select('*').order('name')).data || [] });
export const useSuppliers = () => useQuery({ queryKey: ['suppliers'], queryFn: async () => (await supabase.from('suppliers').select('*').order('name')).data || [] });
export const useTransactions = () => useQuery({ queryKey: ['transactions'], queryFn: async () => (await supabase.from('transactions').select('*').order('transaction_date', { ascending: false })).data || [] });

// Dashboard
export const useMilesBalance = () => useQuery({ 
    queryKey: ['miles_balance'], 
    queryFn: async () => {
        const { data } = await supabase.from('program_balance_summary').select('*');
        return data?.map((item: any) => ({
            ...item,
            quantity: item.balance,
            total_invested: item.total_invested
        })) || [];
    } 
});

export const useExpiringMiles = () => useQuery({ queryKey: ['expiring_miles'], queryFn: async () => (await supabase.from('expiring_miles').select('*').order('expiration_date')).data || [] });
export const useSales = () => useQuery({ queryKey: ['sales'], queryFn: async () => (await supabase.from('transactions').select('*').eq('type', 'VENDA').order('transaction_date', { ascending: false })).data || [] });
export const useReceivableInstallments = () => useQuery({ queryKey: ['receivable_installments'], queryFn: async () => (await supabase.from('receivable_installments').select(`*, receivables (description, total_amount)`).order('due_date')).data || [] });
export const usePayableInstallments = () => useQuery({ queryKey: ['payable_installments'], queryFn: async () => (await supabase.from('payable_installments').select(`*, payables (description, credit_cards (name))`).order('due_date')).data || [] });

/* --- ESCRITA --- */

// 1. CRIAR VENDA (Calculando CPM no Javascript)
export const useCreateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newSale: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const valorReceitaTotal = parseCurrency(newSale.valorTotal);
      const qtdMilhas = Math.abs(parseCurrency(newSale.quantidade)); 
      const quantidadeNegativa = -1 * qtdMilhas;

      const { data: historico } = await supabase
        .from('transactions')
        .select('quantity, total_cost')
        .eq('account_id', newSale.contaId)
        .eq('program_id', newSale.programaId);

      let saldo = 0;
      let investido = 0;

      if (historico) {
          historico.forEach(t => {
              const q = Number(t.quantity);
              const c = Number(t.total_cost);
              saldo += q;
              if (q < 0) investido -= Math.abs(c);
              else investido += Math.abs(c);
          });
      }

      let cpmAtual = 0;
      let custoDoEstoque = 0;

      if (saldo > 0 && investido > 0) {
          cpmAtual = (investido / saldo) * 1000;
          custoDoEstoque = (qtdMilhas / 1000) * cpmAtual;
      }

      const { data: transaction, error: transError } = await supabase.from('transactions')
        .insert({
            user_id: user?.id,
            program_id: newSale.programaId,
            account_id: newSale.contaId,
            type: 'VENDA',
            quantity: quantidadeNegativa,
            total_cost: custoDoEstoque,
            transaction_date: newSale.dataVenda,
            description: `Venda Milhas`,
            notes: `${newSale.observacoes || ''} | CPM Baixa: ${cpmAtual.toFixed(2)}`
        }).select().single();

      if (transError) throw transError;

      if (newSale.passageiros?.length > 0) {
          const passData = newSale.passageiros.map((p:any) => ({ user_id: user?.id, transaction_id: transaction.id, name: p.nome, cpf: p.cpf }));
          await supabase.from('passengers').insert(passData);
      }

      if (valorReceitaTotal > 0) {
        const { data: receivable, error: recError } = await supabase.from('receivables')
          .insert({
              user_id: user?.id,
              transaction_id: transaction.id,
              description: `Venda de Milhas - Transação #${transaction.id.slice(0, 8)}`,
              total_amount: valorReceitaTotal,
              installments: newSale.parcelas || 1
          }).select().single();

        if (!recError) {
            const numParcelas = newSale.parcelas || 1;
            const valorParcela = valorReceitaTotal / numParcelas;
            const installments = [];
            for (let i = 0; i < numParcelas; i++) {
                const dataBase = new Date(newSale.dataRecebimento);
                const dataVencimento = new Date(dataBase.valueOf() + dataBase.getTimezoneOffset() * 60000);
                if (i > 0) dataVencimento.setMonth(dataVencimento.getMonth() + i);
                installments.push({ user_id: user?.id, receivable_id: receivable.id, installment_number: i + 1, amount: valorParcela, due_date: dataVencimento.toISOString().split('T')[0], status: 'PENDENTE' });
            }
            await supabase.from('receivable_installments').insert(installments);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] }); queryClient.invalidateQueries({ queryKey: ['transactions'] }); queryClient.invalidateQueries({ queryKey: ['miles_balance'] }); queryClient.invalidateQueries({ queryKey: ['receivable_installments'] });
      toast.success('Venda registrada!');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`)
  });
};

// 2. TRANSFERÊNCIA (Versão Final: Calculadora JS Limpa)
export const useCreateTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transferData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { contaOrigemId, programaOrigemId, contaDestinoId, programaDestinoId, quantidadeOrigem, quantidadeDestino, dataTransferencia, custoTransferencia = 0, observacao } = transferData;

      const qtdSai = Math.abs(parseCurrency(quantidadeOrigem));
      const qtdEntra = Math.abs(parseCurrency(quantidadeDestino));
      const taxa = parseCurrency(custoTransferencia);

      // --- 1. LER HISTÓRICO ---
      const { data: historico, error: erroHist } = await supabase
        .from('transactions')
        .select('quantity, total_cost')
        .eq('account_id', contaOrigemId)
        .eq('program_id', programaOrigemId);
      
      if (erroHist) throw erroHist;

      // --- 2. CALCULAR CPM ---
      let saldo = 0;
      let investido = 0;

      if (historico) {
          historico.forEach(t => {
              const q = Number(t.quantity);
              const c = Number(t.total_cost);
              saldo += q;
              if (q < 0) investido -= Math.abs(c);
              else investido += Math.abs(c);
          });
      }

      let cpmOrigem = 0;
      let custoTotalSaindo = 0;

      if (saldo > 0 && investido > 0) {
          cpmOrigem = (investido / saldo) * 1000;
          custoTotalSaindo = (qtdSai / 1000) * cpmOrigem;
      }

      // --- 3. GRAVAR SAÍDA ---
      const { error: errorOrigem } = await supabase.from('transactions').insert({
        user_id: user?.id, 
        account_id: contaOrigemId, 
        program_id: programaOrigemId, 
        type: 'TRANSF_SAIDA',
        quantity: -qtdSai, 
        total_cost: custoTotalSaindo, 
        transaction_date: dataTransferencia,
        description: `Transf. para ${programaDestinoId} (Saída)`,
        notes: `CPM Origem: ${cpmOrigem.toFixed(2)} | Migrou: R$ ${custoTotalSaindo.toFixed(2)}`
      });
      if (errorOrigem) throw errorOrigem;

      // --- 4. GRAVAR ENTRADA ---
      const custoFinalEntrada = custoTotalSaindo + taxa;
      
      const { error: errorDestino } = await supabase.from('transactions').insert({
        user_id: user?.id, 
        account_id: contaDestinoId, 
        program_id: programaDestinoId, 
        type: 'TRANSF_ENTRADA',
        quantity: qtdEntra,
        total_cost: custoFinalEntrada, 
        transaction_date: dataTransferencia,
        description: `Transf. de ${programaOrigemId} (Entrada)`,
        notes: `${observacao || ''} | Custo Herdado: R$ ${custoTotalSaindo.toFixed(2)} + Taxas: R$ ${taxa.toFixed(2)}`
      });
      if (errorDestino) throw errorDestino;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] }); 
      queryClient.invalidateQueries({ queryKey: ['miles_balance'] });
      toast.success('Transferência realizada!');
    },
    onError: (error: any) => { toast.error(`${error.message}`); }
  });
};

// OUTRAS FUNÇÕES
export const useDeleteSale = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (id: string) => { const { data: recs } = await supabase.from('receivables').select('id').eq('transaction_id', id); if(recs) for(const r of recs) { await supabase.from('receivable_installments').delete().eq('receivable_id', r.id); await supabase.from('receivables').delete().eq('id', r.id); } await supabase.from('transactions').delete().eq('id', id); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales'] }); qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['miles_balance'] }); toast.success('Excluído!'); } }) };
export const useCreatePassenger = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (p: any) => { await supabase.from('passengers').insert(p); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['passengers'] }) })};
export const useCreateTransaction = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (p: any) => { const safeP = { ...p, total_cost: parseCurrency(p.total_cost) }; await supabase.from('transactions').insert(safeP); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['miles_balance'] }); } })};
export const useDeleteTransaction = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (id: string) => { await supabase.from('transactions').delete().eq('id', id); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['miles_balance'] }); } })};
export const useUpdateTransaction = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async ({ id, ...updates }: any) => { const safeUpdates = { ...updates }; if (safeUpdates.total_cost) safeUpdates.total_cost = parseCurrency(safeUpdates.total_cost); const { error } = await supabase.from('transactions').update(safeUpdates).eq('id', id); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['miles_balance'] }); qc.invalidateQueries({ queryKey: ['sales'] }); toast.success('Atualizado!'); } }) };
export const useCreatePayable = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (p: any) => { await supabase.from('payables').insert(p); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['payable_installments'] }) })};
export const useCreatePayableInstallments = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (items: any[]) => { await supabase.from('payable_installments').insert(items); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['payable_installments'] }) })};
export const useCreateReceivable = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (p: any) => { await supabase.from('receivables').insert(p); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['receivable_installments'] }) })};
export const useCreateReceivableInstallments = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (items: any[]) => { await supabase.from('receivable_installments').insert(items); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['receivable_installments'] }) })};
export const useCreateCreditCard = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (c: any) => { await supabase.from('credit_cards').insert({...c, limit_amount: parseCurrency(c.limite)}); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['credit_cards'] }) })};
export const useUpdateCreditCard = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async ({id, ...c}: any) => { await supabase.from('credit_cards').update({...c, limit_amount: parseCurrency(c.limite)}).eq('id', id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['credit_cards'] }) })};
export const useDeleteCreditCard = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (id: string) => { await supabase.from('credit_cards').delete().eq('id', id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['credit_cards'] }) })};
