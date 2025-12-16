import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ======================================================
   ACCOUNTS
====================================================== */
export const useAccounts = () => {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('ACCOUNTS ERROR:', error);
        return [];
      }

      return data ?? [];
    },
  });
};

/* ======================================================
   PROGRAMS
====================================================== */
export const usePrograms = () => {
  return useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('PROGRAMS ERROR:', error);
        return [];
      }

      return data ?? [];
    },
  });
};

/* ======================================================
   CLIENTS / PASSAGEIROS
====================================================== */
export const usePassageiros = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('CLIENTS ERROR:', error);
        return [];
      }

      return data ?? [];
    },
  });
};

/* ======================================================
   TRANSACTIONS
====================================================== */
export const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('TRANSACTIONS ERROR:', error);
        return [];
      }

      return data ?? [];
    },
  });
};

/* ======================================================
   MILES BALANCE
====================================================== */
export const useMilesBalance = () => {
  return useQuery({
    queryKey: ['miles_balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('miles_balance')
        .select('*');

      if (error) {
        console.error('MILES BALANCE ERROR:', error);
        return [];
      }

      return data ?? [];
    },
  });
};

/* ======================================================
   EXPIRING MILES
====================================================== */
export const useExpiringMiles = () => {
  return useQuery({
    queryKey: ['expiring_miles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expiring_miles')
        .select('*')
        .order('expiration_date');

      if (error) {
        console.error('EXPIRING MILES ERROR:', error);
        return [];
      }

      return data ?? [];
    },
  });
};

/* ======================================================
   PAYABLE INSTALLMENTS
====================================================== */
export const usePayableInstallments = () => {
  return useQuery({
    queryKey: ['payable_installments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payable_installments')
        .select('*')
        .order('due_date');

      if (error) {
        console.error('PAYABLE INSTALLMENTS ERROR:', error);
        return [];
      }

      return data ?? [];
    },
  });
};

/* ======================================================
   RECEIVABLE INSTALLMENTS
====================================================== */
export const useReceivableInstallments = () => {
  return useQuery({
    queryKey: ['receivable_installments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivable_installments')
        .select('*')
        .order('due_date');

      if (error) {
        console.error('RECEIVABLE INSTALLMENTS ERROR:', error);
        return [];
      }

      return data ?? [];
    },
  });
};

/* ======================================================
   CREATE TRANSACTION
====================================================== */
export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['miles_balance'] });
    },
  });
};

/* ======================================================
   CREATE PAYABLE
====================================================== */
export const useCreatePayable = () => {
  const queryClient = useQueryClient();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payable_installments'] });
    },
  });
};

/* ======================================================
   CREATE PAYABLE INSTALLMENTS
====================================================== */
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payable_installments'] });
    },
  });
};

/* ======================================================
