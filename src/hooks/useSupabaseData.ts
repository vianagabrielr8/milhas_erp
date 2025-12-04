import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

// Programs
export const usePrograms = () => {
  return useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
};

// Accounts
export const useAccounts = () => {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
};

// Suppliers
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

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (supplier: TablesInsert<'suppliers'>) => {
      const { data, error } = await supabase.from('suppliers').insert(supplier).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...supplier }: { id: string } & Partial<TablesInsert<'suppliers'>>) => {
      const { data, error } = await supabase.from('suppliers').update(supplier).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
};

// Clients
export const useClients = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (client: TablesInsert<'clients'>) => {
      const { data, error } = await supabase.from('clients').insert(client).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...client }: { id: string } & Partial<TablesInsert<'clients'>>) => {
      const { data, error } = await supabase.from('clients').update(client).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });
};

// Credit Cards
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

export const useCreateCreditCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (card: TablesInsert<'credit_cards'>) => {
      const { data, error } = await supabase.from('credit_cards').insert(card).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credit_cards'] }),
  });
};

export const useUpdateCreditCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...card }: { id: string } & Partial<TablesInsert<'credit_cards'>>) => {
      const { data, error } = await supabase.from('credit_cards').update(card).eq('id', id).select().single();
      if (error) throw error;
      return data;
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

// Transactions
export const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          programs(name),
          accounts(name),
          suppliers(name),
          clients(name)
        `)
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transaction: TablesInsert<'transactions'>) => {
      const { data, error } = await supabase.from('transactions').insert(transaction).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['miles_balance'] });
      queryClient.invalidateQueries({ queryKey: ['expiring_miles'] });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...transaction }: { id: string } & Partial<TablesInsert<'transactions'>>) => {
      const { data, error } = await supabase.from('transactions').update(transaction).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['miles_balance'] });
      queryClient.invalidateQueries({ queryKey: ['expiring_miles'] });
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['miles_balance'] });
      queryClient.invalidateQueries({ queryKey: ['expiring_miles'] });
    },
  });
};

// Miles Balance View
export const useMilesBalance = () => {
  return useQuery({
    queryKey: ['miles_balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('miles_balance')
        .select('*');
      if (error) throw error;
      return data;
    },
  });
};

// Expiring Miles View
export const useExpiringMiles = () => {
  return useQuery({
    queryKey: ['expiring_miles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expiring_miles')
        .select('*')
        .order('days_until_expiration');
      if (error) throw error;
      return data;
    },
  });
};

// Payables
export const usePayables = () => {
  return useQuery({
    queryKey: ['payables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payables')
        .select(`
          *,
          credit_cards(name, closing_day, due_day),
          payable_installments(*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useCreatePayable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payable: TablesInsert<'payables'>) => {
      const { data, error } = await supabase.from('payables').insert(payable).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payables'] }),
  });
};

export const useDeletePayable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payables').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payables'] }),
  });
};

// Payable Installments
export const usePayableInstallments = () => {
  return useQuery({
    queryKey: ['payable_installments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payable_installments')
        .select(`
          *,
          payables(description, credit_cards(name))
        `)
        .order('due_date');
      if (error) throw error;
      return data;
    },
  });
};

export const useCreatePayableInstallments = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (installments: TablesInsert<'payable_installments'>[]) => {
      const { data, error } = await supabase.from('payable_installments').insert(installments).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payable_installments', 'payables'] }),
  });
};

export const useUpdatePayableInstallment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...installment }: { id: string } & Partial<TablesInsert<'payable_installments'>>) => {
      const { data, error } = await supabase.from('payable_installments').update(installment).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payable_installments', 'payables'] }),
  });
};

// Receivables
export const useReceivables = () => {
  return useQuery({
    queryKey: ['receivables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivables')
        .select(`
          *,
          receivable_installments(*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateReceivable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (receivable: TablesInsert<'receivables'>) => {
      const { data, error } = await supabase.from('receivables').insert(receivable).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['receivables'] }),
  });
};

export const useDeleteReceivable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('receivables').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['receivables'] }),
  });
};

// Receivable Installments
export const useReceivableInstallments = () => {
  return useQuery({
    queryKey: ['receivable_installments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivable_installments')
        .select(`
          *,
          receivables(description)
        `)
        .order('due_date');
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateReceivableInstallments = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (installments: TablesInsert<'receivable_installments'>[]) => {
      const { data, error } = await supabase.from('receivable_installments').insert(installments).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['receivable_installments', 'receivables'] }),
  });
};

export const useUpdateReceivableInstallment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...installment }: { id: string } & Partial<TablesInsert<'receivable_installments'>>) => {
      const { data, error } = await supabase.from('receivable_installments').update(installment).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['receivable_installments', 'receivables'] }),
  });
};
