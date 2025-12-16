import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ==========================================
// 1. LEITURA DE DADOS (QUERIES)
// ==========================================

// TRANSACTIONS
export const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          program:programs ( name ),
          account:accounts ( name )
        `)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      return data.map(t => ({
        ...t,
        program_name: t.program?.name,
        account_name: t.account?.name,
      }));
    },
  });
};

// ACCOUNTS (RLS OK)
export const useAccounts = () => {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      console.log('FETCH ACCOUNTS');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('ACCOUNTS ERROR:', error);
        return [];
      }

      return data;
    },
  });
};

// PROGRAMS (RLS OK — ESTE ERA O PROBLEMA)
export const usePrograms = () => {
  return useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      console.log('FETCH PROGRAMS');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('user_id', user.id)   // 🔥 OBRIGATÓRIO
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('PROGRAMS ERROR:', error);
        return [];
      }

      return data;
    },
  });
};

// PASSAGEIROS / CLIENTS (RLS OK)
export const usePassageiros = () => {
  return useQuery({
    queryKey: ['passageiros'],
    queryFn: async () => {
      console.log('FETCH PASSAGEIROS');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('PASSAGEIROS ERROR:', error);
        return [];
      }

      return data;
    },
  });
};

// SUPPLIERS
export const useSuppliers = () => {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
  });
};

// CREDIT CARDS
export const useCreditCards = () => {
  return useQuery({
    queryKey: ['credit_cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
  });
};

// MILES BALANCE
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
        const summary = summaryData.find(
          s =>
            s.program_id === balance.program_id &&
            s.account_id === balance.account_id
        );

        return {
          ...balance,
          program_name: balance.program?.name,
          account_name: balance.account?.name,
          avg_cpm: summary?.avg_cpm || 0,
          total_invested: summary?.total_invested || 0,
        };
      });
    },
  });
};

// ==========================================
// 2. MUTATIONS
// ==========================================

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newItem: any) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(newItem)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('payables')
        .insert(newItem)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['payable_installments'] }),
  });
};

export const useCreateReceivable = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newItem: any) => {
      const { data, error } = await supabase
        .from('receivables')
        .insert(newItem)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['receivable_installments'] }),
  });
};

export const useCreatePayableInstallments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: any[]) => {
      const { data, error } = await supabase
        .from('payable_installments')
        .insert(items)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['payable_installments'] }),
  });
};

export const useCreateReceivableInstallments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: any[]) => {
      const { data, error } = await supabase
        .from('receivable_installments')
        .insert(items)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['receivable_installments'] }),
  });
};

export const useCreateCreditCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newItem: any) => {
      const { data, error } = await supabase
        .from('credit_cards')
        .insert(newItem)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] }),
  });
};

export const useUpdateCreditCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('credit_cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] }),
  });
};

export const useDeleteCreditCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] }),
  });
};
