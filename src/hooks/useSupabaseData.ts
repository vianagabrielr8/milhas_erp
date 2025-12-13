import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ==========================================
// 1. LEITURA DE DADOS (QUERIES) - MANTIDA IGUAL
// ==========================================

export const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`*, program:programs(name), account:accounts(name)`)
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return data.map(t => ({ ...t, program_name: t.program?.name, account_name: t.account?.name }));
    },
  });
};

export const useAccounts = () => {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('*').order('name');
      if (error) throw error; return data;
    },
  });
};

export const usePrograms = () => {
  return useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error; return data;
    },
  });
};

export const useClients = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').order('name');
      if (error) throw error; return data;
    },
  });
};

export const useSuppliers = () => {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('*').order('name');
      if (error) throw error; return data;
    },
  });
};

export const useCreditCards = () => {
  return useQuery({
    queryKey: ['credit_cards'],
    queryFn: async () => {
      const { data, error } = await supabase.from('credit_cards').select('*').order('name');
      if (error) throw error; return data;
    },
  });
};

export const useMilesBalance = () => {
  return useQuery({
    queryKey: ['miles_balance'],
    queryFn: async () => {
      const { data: balanceData, error: balanceError } = await supabase
        .from('miles_balance')
        .select(`*, program:programs(name), account:accounts(name)`);
      if (balanceError) throw balanceError;

      const { data: summaryData, error: summaryError } = await supabase
        .from('program_balance_summary')
        .select('*');
      if (summaryError) throw summaryError;

      return balanceData.map(balance => {
        const summary = summaryData.find(s => s.program_id === balance.program_id && s.account_id === balance.account_id);
        return {
          ...balance,
          program_name: balance.program?.name,
          account_name: balance.account?.name,
          avg_cpm: summary?.avg_cpm || 0,
          total_invested: summary?.total_invested || 0
        };
      });
    },
  });
};

export const useExpiringMiles = () => {
  return useQuery({
    queryKey: ['expiring_miles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expiring_miles').select('*').order('expiration_date', { ascending: true });
      if (error) throw error; return data;
    },
  });
};

// --- LEITURA DE CONTAS A PAGAR (A QUE JÁ FUNCIONA) ---
export const usePayableInstallments = () => {
  return useQuery({
    queryKey: ['payable_installments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payable_installments')
        .select(`
          *,
          payables (
            description,
            credit_card_id,
            credit_cards (
              name
            )
          )
        `)
        .order('due_date', { ascending: true });
      if (error) throw error; return data;
    },
  });
};

export const useReceivableInstallments = () => {
  return useQuery({
    queryKey: ['receivable_installments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('receivable_installments').select('*').order('due_date', { ascending: true });
      if (error) throw error; return data;
    },
  });
};

// ==========================================
// 2. GRAVAÇÃO DE DADOS (MUTATIONS)
// ==========================================

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newItem: any) => {
      const { data, error } = await supabase.from('transactions').insert(newItem).select();
      if (error) throw error; return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['miles_balance'] });
    },
  });
};

export const useCreatePayable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newItem: any) => {
      // CORREÇÃO: Removido .single() para evitar erro de RLS. Retorna array.
      const { data, error } = await supabase.from('payables').insert(newItem).select();
      if (error) throw error; return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payable_installments'] }),
  });
};

export const useCreateReceivable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newItem: any) => {
      const { data, error } = await supabase.from('receivables').insert(newItem).select();
      if (error) throw error; return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['receivable_installments'] }),
  });
};

export const useCreatePayableInstallments = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (items: any[]) => {
        const { data, error } = await supabase.from('payable_installments').insert(items).select();
        if (error) throw error; return data;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payable_installments'] }),
    });
};

export const useCreateReceivableInstallments = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (items: any[]) => {
        const { data, error } = await supabase.from('receivable_installments').insert(items).select();
        if (error) throw error; return data;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['receivable_installments'] }),
    });
};

export const useCreateCreditCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newItem: any) => {
      const { data, error } = await supabase.from('credit_cards').insert(newItem).select();
      if (error) throw error; return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credit_cards'] }),
  });
};

export const useUpdateCreditCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from('credit_cards').update(updates).eq('id', id).select();
      if (error) throw error; return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credit_cards'] }),
  });
};

export const useDeleteCreditCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('credit_cards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credit_cards'] }),
  });
};
