import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ======================================================
   ACCOUNTS
====================================================== */
export const useAccounts = () => {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      console.log('FETCH ACCOUNTS');

      const { data, error } = await supabase
        .from('accounts')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('ACCOUNTS ERROR:', error);
        return [];
      }

      console.log('ACCOUNTS DATA:', data);
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
      console.log('FETCH PROGRAMS');

      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('PROGRAMS ERROR:', error);
        return [];
      }

      console.log('PROGRAMS DATA:', data);
      return data ?? [];
    },
  });
};

/* ======================================================
   PASSAGEIROS / CLIENTS
====================================================== */
export const usePassageiros = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      console.log('FETCH CLIENTS');

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
