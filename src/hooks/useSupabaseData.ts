import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ======================================================
   ACCOUNTS & PROGRAMS
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
   PASSAGEIROS (Estrutura Simples - Name e CPF)
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

/* ======================================================
   DASHBOARD & SALDOS (CORREÇÃO DO ERRO DE BUILD)
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
   RECURSOS OPERACIONAIS
====================================================== */
export const useCreditCards = () =>
  useQuery({
    queryKey: ['credit_cards'],
    queryFn: async () => {
      const { data, error } = await supabase.from('credit_cards').select('*').order('name');
      return data ?? [];
    },
  });

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

/* ======================================================
   FINANCEIRO
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

/* ======================================================
   MUTATIONS (CRIAR / SALVAR)
====================================================== */
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

export const useCreatePassenger = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; cpf: string; user_id: string }) => {
      const { data, error } = await supabase
        .from('passengers')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['passengers'] }),
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
