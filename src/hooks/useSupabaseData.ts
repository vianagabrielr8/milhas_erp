import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ======================================================
   ACCOUNTS
====================================================== */
export const useAccounts = () =>
  useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name')
        .order('name');

      if (error) return [];
      return data ?? [];
    },
  });

/* ======================================================
   PROGRAMS
====================================================== */
export const usePrograms = () =>
  useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');

      if (error) return [];
      return data ?? [];
    },
  });

/* ======================================================
   CLIENTS / PASSAGEIROS
====================================================== */
export const usePassageiros = () =>
  useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (error) return [];
      return data ?? [];
    },
  });

/* ======================================================
   CREDIT CARDS  🔥 (ERA O QUE FALTAVA)
====================================================== */
export const useCreditCards = () =>
  useQuery({
    queryKey: ['credit_cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('name');

      if (error) return [];
      return data ?? [];
    },
  });

/* ======================================================
   TRANSACTIONS
====================================================== */
export const useTransactions = () =>
  useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) return [];
      return data ?? [];
    },
  });

/* ======================================================
   MILES BALANCE
====================================================== */
export const useMilesBalance = () =>
  useQuery({
    queryKey: ['miles_balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('miles_balance')
        .select('*');

      if (error) return [];
      return data ?? [];
    },
  });

/* ======================================================
   EXPIRING MILES
====================================================== */
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
   PAYABLE INSTALLMENTS
====================================================== */
export const usePayableInstallments = () =>
  useQuery({
    queryKey: ['payable_installments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payable_installments')
        .select('*')
        .order('due_date');

      if (error) return [];
      return data ?? [];
    },
  });

/* ======================================================
   RECEIVABLE INSTALLMENTS
====================================================== */
export const useReceivableInstallments = () =>
  useQuery({
    queryKey: ['receivable_installments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivable_installments')
        .select('*')
        .order('due_date');

      if (error) return [];
      return data ?? [];
    },
  });

/* ======================================================
   MUTATIONS
====================================================== */
export const useCreateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(payload)
        .select()
        .single();

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
      const { data, error } = await supabase
        .from('payables')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['payable_installments'] }),
  });
};

export const useCreatePayableInstallments = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: any[]) => {
      const { error } = await supabase
        .from('payable_installments')
        .insert(items);

      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['payable_installments'] }),
  });
};

export const useCreateReceivable = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from('receivables')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['receivable_installments'] }),
  });
};

export const useCreateReceivableInstallments = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: any[]) => {
      const { error } = await supabase
        .from('receivable_installments')
        .insert(items);

      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['receivable_installments'] }),
  });
};
/* ======================================================
   CREDIT CARDS - MUTATIONS (OBRIGATÓRIO)
====================================================== */

export const useCreateCreditCard = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from('credit_cards')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit_cards'] });
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit_cards'] });
    },
  });
};

export const useDeleteCreditCard = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit_cards'] });
    },
  });
};
