import React, { createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { addMonths, format } from 'date-fns';

import { 
  useAccounts, 
  usePrograms, 
  useTransactions, 
  usePayableInstallments, 
  useReceivableInstallments, 
  useCreditCards,
  usePassageiros,
  useSuppliers 
} from '@/hooks/useSupabaseData';

// --- TIPOS DE DADOS SIMPLIFICADOS (ADAPTADOS) ---
interface PassageiroType {
  id: string;
  name: string;
  cpf: string;
  email: string | null;
  telefone: string | null;
  active: boolean;
}

interface VendaPayload {
  programa_id: string;
  conta_id: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  data_venda: string;
  status: 'pendente' | 'recebido';
  observacoes?: string;
}

interface VendaPassageiroPayload {
  venda_id: string;
  name: string;
  cpf: string;
}

interface Venda {
  id: string;
  passageiros: { name: string; cpf: string }[];
  // outros campos se precisar
}

interface VendaFormData extends VendaPayload {
  passageiros: { name: string; cpf: string }[];
}

// -----------------------------------------------------------


// Tipagem do Contexto (adaptada)
interface DataContextType {
  passageiros: PassageiroType[];
  vendas: Venda[];
  programas: any[];
  contas: any[];
  cartoes: any[];

  addCliente: (data: any) => void;
  updateCliente: (id: string, data: any) => void;
  deleteCliente: (id: string) => void;

  addVenda: (venda: VendaFormData, parcelas: number) => void;
  updateVenda: (id: string, venda: VendaFormData) => void;
  deleteVenda: (id: string) => void;
  
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// --- FUNÇÕES DE MUTATION ---
const useDataMutations = () => {
  const queryClient = useQueryClient();

  const addPassageiro = async (data: any) => {
    const payload = {
      name: data.nome || data.name,
      cpf: data.cpf,
      email: data.email,
      telefone: data.telefone,
      active: data.ativo || data.active,
    };

    const { error } = await supabase.from('clients').insert(payload);
    if (error) throw error;
    toast.success('Passageiro cadastrado com sucesso!');
    queryClient.invalidateQueries({ queryKey: ['passageiros'] });
  };

  const updatePassageiro = async (id: string, data: any) => {
    const payload = {
      name: data.nome || data.name,
      cpf: data.cpf,
      active: data.ativo || data.active,
    };
    const { error } = await supabase.from('clients').update(payload).eq('id', id);
    if (error) throw error;
    toast.success('Passageiro atualizado com sucesso!');
    queryClient.invalidateQueries({ queryKey: ['passageiros'] });
  };

  const deletePassageiro = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
    toast.success('Passageiro excluído com sucesso!');
    queryClient.invalidateQueries({ queryKey: ['passageiros'] });
  };
  
  const addVendaMutate = async (venda: VendaFormData, parcelas: number) => {
    const { passageiros, ...vendaPayload } = venda;

    const { data: vendaData, error: vendaError } = await supabase
      .from('sales')
      .insert({
        ...vendaPayload,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      })
      .select();

    if (vendaError) throw vendaError;

    const vendaId = vendaData?.[0]?.id;
    if (!vendaId) throw new Error('ID da venda não foi gerado.');

    const passengersPayload: VendaPassageiroPayload[] = passageiros.map((p) => ({
      venda_id: vendaId,
      name: p.name,
      cpf: p.cpf,
    }));
    
    const { error: passengersError } = await supabase
      .from('sale_passengers')
      .insert(passengersPayload);
      
    if (passengersError) throw passengersError;

    // Lógica de contas a receber/pagar continua aqui s
