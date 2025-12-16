import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Busca Passageiros (Leitura)
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
      if (error) throw error;
      return data ?? [];
    },
  });
};

// Cria Passageiro (Escrita)
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

// ... Mantenha as outras funções (useAccounts, usePrograms, useTransactions) como estão, 
// apenas garanta que não chamem 'clients' ou 'telefone'.
