import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ==========================================
// QUERIES
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

// ACCOUNTS
export const useAccounts = () => {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('name');

      if (error) return [];
      return data;
    },
  });
};

// PROGRAMS
export const usePrograms = () => {
  return useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('name');

      if (error) return [];
      return data;
    },
  });
};

// PASSAGEIROS / CLIENTS
export const usePassageiros = () => {
  return useQuery({
    queryKey: ['passageiros'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('name');

      if (error) return [];
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
      const { data, error } = await supabase
        .from('miles_balance')
        .select(`*, program:programs(name), account:accounts(name)`);

      if (error) throw error;
      return data;
    },
  });
};

// EXPIRING MILES
export const useExpiringMiles = () => {
  return useQuery({
    queryKey: ['expiring_miles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expiring_miles')
        .select('*')
        .order('expiration_date');

      if (error) return [];
      return data;
    },
  });
};

// PAYABLE INSTALLMENTS
export const usePayableInstallments = () => {
  return useQuery({
    queryKey: ['payable_installments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payable_installments')
        .select('*')
        .order('due_date');

      if (error) throw error;
      return data;
    },
  });
};

// RECEIVABLE INSTALLMENTS
export const useReceivableInstallments = () => {
  return useQuery({
    queryKey: ['receivable_installments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivable_installments')
        .select('*')
        .order('due_date');

      if (error) throw error;
      return data;
    },
  });
};

// ==========================================
// MUTATIONS
// ==========================================

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: any) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(item)
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
    mutationFn: async (item: any) => {
      const { data, error } = await supabase
        .from('payables')
        .insert(item)
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
    mutationFn: async (item: any) => {
      const { data, error } = await supabase
        .from('receivables')
        .insert(item)
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
      const { error } = await supabase
        .from('payable_installments')
        .insert(items);

      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['payable_installments'] }),
  });
};

export const useCreateReceivableInstallments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: any[]) => {
      const { error } = await supabase
        .from('receivable_installments')
        .insert(items);

      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['receivable_installments'] }),
  });
};

// 🔥 ESTES ERAM OS QUE FALTAVAM
export const useCreateCreditCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: any) => {
      const { data, error } = await supabase
        .from('credit_cards')
        .insert(item)
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
