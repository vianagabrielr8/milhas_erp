import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ======================================================
   1. CONTAS E PROGRAMAS (CADASTROS BÁSICOS)
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
   2. PASSAGEIROS (LEITURA E CADASTRO AVULSO)
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
   4. CARTÕES DE CRÉDITO (CRUD COMPLETO)
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
        limit_amount: parseFloat(newCard.limite),
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
        limit_amount: parseFloat(updates.limite),
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
      const { data, error } = await supabase.from('transactions').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['miles_balance'] });
    },
  });
};

/* ======================================================
   6. VENDAS (ESTOQUE + FINANCEIRO + PASSAGEIROS)
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
      
      // 1. GARANTIR QUE A QUANTIDADE SEJA NEGATIVA (SAÍDA DE ESTOQUE)
      const quantidadeNegativa = -1 * Math.abs(parseInt(newSale.quantidade));

      // A. Prepara e Salva a Transação (Estoque)
      const transactionData = {
        user_id: user?.id,
        program_id: newSale.programaId,
        account_id: newSale.contaId,
        type: 'VENDA',
        quantity: quantidadeNegativa,
        total_cost: parseFloat(newSale.valorTotal),
        transaction_date: newSale.dataVenda,
        description: `Venda Milhas - ${newSale.passageiros?.length || 0} Passageiros`, 
        notes: `${newSale.observacoes || ''}`, // Nota limpa agora que temos tabela de passageiros
      };

      const { data: transaction, error: transError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (transError) throw transError;

      // 2. SALVAR OS PASSAGEIROS NA TABELA 'PASSENGERS'
      if (newSale.passageiros && newSale.passageiros.length > 0) {
          const passageirosParaSalvar = newSale.passageiros.map((p: any) => ({
              user_id: user?.id,
              transaction_id: transaction.id, // Liga o passageiro a esta venda!
              name: p.nome,
              cpf: p.cpf
          }));

          const { error: passError } = await supabase
              .from('passengers')
              .insert(passageirosParaSalvar);
          
          if (passError) console.error("Erro ao salvar passageiros:", passError);
      }

      // 3. INTEGRAÇÃO FINANCEIRA (SÓ SE VALOR > 0)
      if (parseFloat(newSale.valorTotal) > 0) {
        
        // B. Criar a "Cabeça" do Contas a Receber
        const receivableData = {
          user_id: user?.id,
          description: `Venda de Milhas - Transação #${transaction.id.slice(0, 8)}`, 
          total_amount: parseFloat(newSale.valorTotal),
        };

        const { data: receivable, error: recError } = await supabase
          .from('receivables')
          .insert(receivableData)
          .select()
          .single();

        if (recError) {
            console.error("Erro ao criar financeiro:", recError);
            toast.error("Venda salva, mas erro ao gerar financeiro.");
        } else {
            // C. Criar as Parcelas (Loop)
            const numParcelas = newSale.parcelas || 1;
            const valorParcela = parseFloat(newSale.valorTotal) / numParcelas;
            const installments = [];

            for (let i = 0; i < numParcelas; i++) {
                const dataVencimento = new Date(newSale.dataVenda);
                dataVencimento.setMonth(dataVencimento.getMonth() + (i + 1)); 

                installments.push({
                    user_id: user?.id,
                    receivable_id: receivable.id,
                    installment_number: i + 1,
                    amount: valorParcela,
                    due_date: dataVencimento.toISOString().split('T')[0],
                    status: 'PENDENTE'
                });
            }

            const { error: instError } = await supabase
                .from('receivable_installments')
                .insert(installments);
            
            if (instError) console.error("Erro ao criar parcelas:", instError);
        }
      }

      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['miles_balance'] });
      queryClient.invalidateQueries({ queryKey: ['receivable_installments'] });
      queryClient.invalidateQueries({ queryKey: ['passengers'] }); // Atualiza lista de passageiros
      toast.success('Venda e Financeiro registrados com sucesso!');
    },
    onError: (error: any) => toast.error(`Erro ao registrar venda: ${error.message}`)
  });
};

export const useDeleteSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['miles_balance'] });
      toast.success('Venda excluída!');
    }
  });
};

/* ======================================================
   7. FINANCEIRO (CONTAS A PAGAR E RECEBER)
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
