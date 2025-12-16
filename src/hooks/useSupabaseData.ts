import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// =======================
// HELPERS
// =======================
const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// =======================
// QUERIES
// =======================

// TRANSACTIONS
export const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          programs(name),
          accounts(name)
        `)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
};

// ACCOUNTS (POR USER)
export const useAccounts = () => {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const user = await getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) return [];
      return data ?? [];
    },
  });
};

// PROGRAMS (GLOBAL)
export const usePrograms = () => {
  return useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name');

      if (error) return [];
      return data ?? [];
    },
  });
};

// CLIENTS / PASSAGEIROS (POR USER)
export const usePassageiros = () => {
  return useQuery({
    queryKey: ['passageiros'],
    queryFn: async () => {
      const user = await getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) return [];
      return data ?? [];
    },
  });
};

// SUPPLIERS
export const useSuppliers = () => {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('*').order('name');
      if (error) return [];
      return data ?? [];
    },
  });
};

// CREDIT CARDS
export const useCreditCards = () => {
  return useQuery({
    queryKey: ['credit_cards'],
    queryFn: async () => {
      const { data, error } = await supabase.from('credit_cards').select('*').order('name');
      if (error) return [];
      return data ?? [];
    },
  });
};

// MILES BALANCE
export const useMilesBalance = () => {
  return useQuery({
    queryKey: ['miles_balance'],
    queryFn: async () => {
      const { data, error } = await supabase.from('miles_balance').select('*');
      if (error) return [];
      return data ?? [];
    },
  });
};

// EXPIRING MILES
export const useExpiringMiles = () => {
  return useQuery({
    queryKey: ['expiring_miles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expiring_miles').select('*');
      if (error) return [];
      return data ?? [];
    },
  });
};

// PAYABLE INSTALLMENTS
export const usePayableInstallments = () => {
  return useQuery({
    queryKey: ['payable_installments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payable_installments').select('*');
      if (error) return [];
      return data ?? [];
    },
  });
};

// RECEIVABLE INSTALLMENTS
export const useReceivableInstallments = () => {
  return useQuery({
    queryKey: ['receivable_installments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('receivable_installments').select('*');
      if (error) return [];
      return data ?? [];
    },
  });
};

// =======================
// MUTATIONS
// =======================

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

export const useCreateCreditCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('credit_cards').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credit_cards'] }),
  });
};

export const useUpdateCreditCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { data, error } = await supabase
        .from('credit_cards')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credit_cards'] }),
  });
};

export const useDeleteCreditCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('credit_cards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credit_cards'] }),
  });
};
