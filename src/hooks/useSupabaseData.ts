import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Função auxiliar para tratar números (R$)
const parseCurrency = (value: any) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Troca vírgula por ponto e converte
    return parseFloat(value.replace(',', '.'));
  }
  return 0;
};

/* ======================================================
   1. CONTAS E PROGRAMAS
====================================================== */
export const useAccounts = () =>
  useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, cpf, active, user_id')
        .order('name');
      if (error) return [];
      return data ?? [];
    },
  });

export const usePrograms = () =>
  useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, cpf_limit, active')
        .order('name');
      if (error) return [];
      return data ?? [];
    },
  });

/* ======================================================
   2. PASSAGEIROS
====================================================== */
export const usePassageiros = () => {
  return useQuery({
    queryKey: ['passengers'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('passengers')
        .select('id, name, cpf')
        .eq('user_id', user.id)
        .order('name');
      if (error) return [];
      return data ?? [];
    },
  });
};

export const useCreatePassenger = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; cpf: string; user_id: string }) => {
      const { data, error } = await supabase.from('passengers').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['passengers'] }),
  });
};

/* ======================================================
   3. DASHBOARD & VISUALIZAÇÕES
====================================================== */
export const useMilesBalance = () =>
  useQuery({
    queryKey: ['miles_balance'],
    queryFn: async () => {
      const { data, error } = await supabase.from('miles_balance').select('*');
      if (error) return [];
      return data ?? [];
    },
  });

export const useExpiringMiles = () =>
  useQuery({
    queryKey: ['expiring_miles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expiring_miles')
        .select('*')
        .order('expiration_date');
      if (error) return [];
      return data ?? [];
    },
  });

/* ======================================================
   4. CARTÕES DE CRÉDITO
====================================================== */
export const useCreditCards = () =>
  useQuery({
    queryKey: ['credit_cards'],
    queryFn: async () => {
      const { data, error } = await supabase.from('credit_cards').select('*').order('name');
      return data ?? [];
    },
  });

export const useCreateCreditCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newCard: any) => {
      const dbCard = {
        name: newCard.nome,
        closing_day: parseInt(newCard.diaFechamento),
        due_day: parseInt(newCard.diaVencimento),
        limit_amount: parseCurrency(newCard.limite),
        user_id: (await supabase.auth.getUser()).data.user?.id
      };
      const { data, error } = await supabase.from('credit_cards').insert(dbCard).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      toast.success('Cartão criado com sucesso!');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`)
  });
};

export const useUpdateCreditCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
       const dbCard = {
        name: updates.nome,
        closing_day: parseInt(updates.diaFechamento),
        due_day: parseInt(updates.diaVencimento),
        limit_amount: parseCurrency(updates.limite),
      };
      const { data, error } = await supabase.from('credit_cards').update(dbCard).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      toast.success('Cartão atualizado!');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`)
  });
};

export const useDeleteCreditCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('credit_cards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      toast.success('Cartão removido!');
    }
  });
};

/* ======================================================
   5. FORNECEDORES E TRANSAÇÕES GERAIS
====================================================== */
export const useSuppliers = () =>
  useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('*').order('name');
      return data ?? [];
    },
  });

export const useTransactions = () =>
  useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions').select('*').order('transaction_date', { ascending: false });
      return data ?? [];
    },
  });

export const useCreateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      // Garante formatação de moeda na transação manual
      const safePayload = {
          ...payload,
          total_cost: parseCurrency(payload.total_cost)
      };
      
      const { data, error } = await supabase.from('transactions').insert(safePayload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['miles_balance'] });
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Tenta limpar financeiro vinculado (pela descrição)
      const { data: receivables } = await supabase
        .from('receivables')
        .select('id')
        .ilike('description', `%${id.slice(0, 8)}%`);

      if (receivables && receivables.length > 0) {
          for (const rec of receivables) {
              await supabase.from('receivable_installments').delete().eq('receivable_id', rec.id);
              await supabase.from('receivables').delete().eq('id', rec.id);
          }
      }

      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['miles_balance'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] }); 
      queryClient.invalidateQueries({ queryKey: ['receivable_installments'] });
      queryClient.invalidateQueries({ queryKey: ['passengers_with_transactions'] });
      toast.success('Transação excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  });
};

/* ======================================================
   6. VENDAS (A CORREÇÃO PRINCIPAL)
====================================================== */
export const useSales = () => {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'VENDA') 
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useCreateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newSale: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // TRATAMENTO DE VALORES (Blinda contra vírgulas e erros)
      const valorTotalLimpo = parseCurrency(newSale.valorTotal);
      const quantidadeNegativa = -1 * Math.abs(parseInt(newSale.quantidade));

      // A. SALVAR VENDA
      const transactionData = {
        user_id: user?.id,
        program_id: newSale.programaId,
        account_id: newSale.contaId,
        type: 'VENDA',
        quantity: quantidadeNegativa,
        total_cost: valorTotalLimpo,
        transaction_date: newSale.dataVenda,
        description: `Venda Milhas - ${newSale.passageiros?.length || 0} Passageiros`, 
        notes: `${newSale.observacoes || ''}`, 
      };

      const { data: transaction, error: transError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (transError) throw transError;

      // B. SALVAR PASSAGEIROS (VINCULANDO O ID DA TRANSAÇÃO)
      if (newSale.passageiros && newSale.passageiros.length > 0) {
          const passageirosParaSalvar = newSale.passageiros.map((p: any) => ({
              user_id: user?.id,
              transaction_id: transaction.id, // <--- OBRIGATÓRIO PARA O LIMITE CPF FUNCIONAR
              name: p.nome,
              cpf: p.cpf
          }));

          const { error: passError } = await supabase
              .from('passengers')
              .insert(passageirosParaSalvar);
          
          if (passError) console.error("Erro ao salvar passageiros:", passError);
      }

      // C. FINANCEIRO (CONTAS A RECEBER)
      if (valorTotalLimpo > 0) {
        const receivableData = {
          user_id: user?.id,
          description: `Venda de Milhas - Transação #${transaction.id.slice(0, 8)}`, 
          total_amount: valorTotalLimpo,
        };

        const { data: receivable, error: recError } = await supabase
          .from('receivables')
          .insert(receivableData)
          .select()
          .single();

        if (recError) {
            toast.error("Erro ao gerar financeiro.");
        } else {
            // Gera Parcelas
            const numParcelas = newSale.parcelas || 1;
            const valorParcela = valorTotalLimpo / numParcelas;
            const installments = [];

            for (let i = 0; i < numParcelas; i++) {
                // Cria a data baseada no que veio do formulário
                const dataBase = new Date(newSale.dataRecebimento);
                // Ajusta timezone para evitar que "volte" um dia
                const dataVencimento = new Date(dataBase.valueOf() + dataBase.getTimezoneOffset() * 60000);
                
                if (i > 0) {
                    dataVencimento.setMonth(dataVencimento.getMonth() + i);
                }

                installments.push({
                    user_id: user?.id,
                    receivable_id: receivable.id,
                    installment_number: i + 1,
                    amount: valorParcela,
                    due_date: dataVencimento.toISOString().split('T')[0],
                    status: 'PENDENTE'
                });
            }

            await supabase.from('receivable_installments').insert(installments);
        }
      }

      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['miles_balance'] });
      queryClient.invalidateQueries({ queryKey: ['receivable_installments'] });
      queryClient.invalidateQueries({ queryKey: ['passengers'] });
      // Atualiza o painel de limites
      queryClient.invalidateQueries({ queryKey: ['passengers_with_transactions'] }); 
      toast.success('Venda registrada com sucesso!');
    },
    onError: (error: any) => toast.error(`Erro ao registrar venda: ${error.message}`)
  });
};

export const useDeleteSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: receivables } = await supabase
        .from('receivables')
        .select('id')
        .ilike('description', `%${id.slice(0, 8)}%`);

      if (receivables && receivables.length > 0) {
          for (const rec of receivables) {
              await supabase.from('receivable_installments').delete().eq('receivable_id', rec.id);
              await supabase.from('receivables').delete().eq('id', rec.id);
          }
      }
      
      // A transação apaga os passageiros automaticamente (Cascade no banco)
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['miles_balance'] });
      queryClient.invalidateQueries({ queryKey: ['receivable_installments'] }); 
      queryClient.invalidateQueries({ queryKey: ['passengers_with_transactions'] }); // Limpa limites
      toast.success('Venda e dados excluídos!');
    },
    onError: (error: any) => toast.error(`Erro ao excluir: ${error.message}`)
  });
};

/* ======================================================
   7. FINANCEIRO (LEITURA)
====================================================== */
export const usePayableInstallments = () =>
  useQuery({
    queryKey: ['payable_installments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payable_installments')
        .select(`
          *,
          payables (
            description, 
            installments, 
            credit_card_id,
            credit_cards ( name )
          )
        `)
        .order('due_date');
      return data ?? [];
    },
  });

export const useReceivableInstallments = () =>
  useQuery({
    queryKey: ['receivable_installments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivable_installments')
        .select('*')
        .order('due_date');
      return data ?? [];
    },
  });

export const useCreatePayable = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('payables').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payable_installments'] }),
  });
};

export const useCreatePayableInstallments = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: any[]) => {
      const { error } = await supabase.from('payable_installments').insert(items);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payable_installments'] }),
  });
};

export const useCreateReceivable = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('receivables').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receivable_installments'] }),
  });
};

export const useCreateReceivableInstallments = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: any[]) => {
      const { error } = await supabase.from('receivable_installments').insert(items);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receivable_installments'] }),
  });
};
