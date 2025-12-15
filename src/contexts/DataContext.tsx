import React, { createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import {
  useAccounts,
  usePrograms,
  useTransactions,
  usePayableInstallments,
  useReceivableInstallments,
  useCreditCards,
  usePassageiros,
} from '@/hooks/useSupabaseData';

/* ================== TIPOS ================== */

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
}

interface VendaFormData extends VendaPayload {
  passageiros: { name: string; cpf: string }[];
}

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

/* ================== CONTEXT ================== */

const DataContext = createContext<DataContextType | undefined>(undefined);

/* ================== MUTATIONS ================== */

const useDataMutations = () => {
  const queryClient = useQueryClient();

  const addPassageiro = async (data: any) => {
    const payload = {
      name: data.nome || data.name,
      cpf: data.cpf,
      email: data.email,
      telefone: data.telefone,
      active: data.ativo ?? data.active,
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
      active: data.ativo ?? data.active,
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

    const { data, error } = await supabase
      .from('sales')
      .insert({
        ...vendaPayload,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      })
      .select();

    if (error) throw error;

    const vendaId = data?.[0]?.id;
    if (!vendaId) throw new Error('Venda sem ID');

    const passageirosPayload: VendaPassageiroPayload[] = passageiros.map(p => ({
      venda_id: vendaId,
      name: p.name,
      cpf: p.cpf,
    }));

    const { error: pError } = await supabase
      .from('sale_passengers')
      .insert(passageirosPayload);

    if (pError) throw pError;

    return vendaId;
  };

  return {
    addPassageiro,
    updatePassageiro,
    deletePassageiro,
    addVendaMutate,
  };
};

/* ================== PROVIDER ================== */

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: accountsData, isLoading: loadingAccounts } = useAccounts();
  const { data: programsData, isLoading: loadingPrograms } = usePrograms();
  const { isLoading: loadingTransactions } = useTransactions();
  const { isLoading: loadingPassageiros } = usePassageiros();
  const { data: creditCardsData } = useCreditCards();
  const { data: passageirosData } = usePassageiros();

  const { addPassageiro, updatePassageiro, deletePassageiro, addVendaMutate } =
    useDataMutations();

  const contas = (accountsData || []).map((c: any) => ({
    ...c,
    id: String(c.id),
    name: c.name ?? c.nome ?? c.descricao ?? String(c.id),
  }));

  const programas = (programsData || []).map((p: any) => ({
    ...p,
    id: String(p.id),
    name: p.name ?? p.nome ?? p.program_name ?? String(p.id),
  }));

  const vendas: Venda[] = [];

  const addCliente = (data: any) =>
    addPassageiro(data).catch(e => toast.error(e.message));

  const updateCliente = (id: string, data: any) =>
    updatePassageiro(id, data).catch(e => toast.error(e.message));

  const deleteCliente = (id: string) =>
    deletePassageiro(id).catch(e => toast.error(e.message));

  const addVenda = (venda: VendaFormData, parcelas: number) =>
    addVendaMutate(venda, parcelas).catch(e => toast.error(e.message));

  const isLoading =
    loadingAccounts || loadingPrograms || loadingTransactions || loadingPassageiros;

  return (
    <DataContext.Provider
      value={{
        contas,
        programas,
        cartoes: creditCardsData || [],
        passageiros: (passageirosData || []) as PassageiroType[],
        vendas,
        addCliente,
        updateCliente,
        deleteCliente,
        addVenda,
        updateVenda: () => {},
        deleteVenda: () => {},
        isLoading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

/* ================== HOOK ================== */

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};
