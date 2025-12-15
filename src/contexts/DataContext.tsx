import React, { createContext, useContext, useEffect, useState } from 'react';
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
// Adicionando tipos padronizados para garantir consistência no Select/Datalist
interface StandardItem {
    id: string;
    name: string;
}

interface PassageiroType extends StandardItem {
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
    // Adicione outros campos necessários aqui
}

interface VendaFormData extends VendaPayload {
    passageiros: { name: string; cpf: string }[];
}
// -----------------------------------------------------------


// Tipagem do Contexto (Adaptada para os novos hooks)
interface DataContextType {
    passageiros: PassageiroType[];
    vendas: Venda[]; 
    programas: StandardItem[]; // Usando StandardItem
    contas: StandardItem[];    // Usando StandardItem
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

// --- FUNÇÕES DE MUTATION (MANTIDAS) ---
const useDataMutations = () => {
    const queryClient = useQueryClient();

    const addPassageiro = async (data: any) => {
        const payload = {
            name: data.nome || data.name,
            cpf: data.cpf,
            email: data.email,
            telefone: data.telefone,
            active: data.ativo || data.active
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
            active: data.ativo || data.active
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
                user_id: (await supabase.auth.getUser()).data.user?.id
            })
            .select();

        if (vendaError) throw vendaError;

        const vendaId = vendaData?.[0]?.id;
        if (!vendaId) throw new Error("ID da venda não foi gerado.");

        const passengersPayload: VendaPassageiroPayload[] = passageiros.map(p => ({
            venda_id: vendaId,
            name: p.name,
            cpf: p.cpf,
        }));
        
        const { error: passengersError } = await supabase
            .from('sale_passengers')
            .insert(passengersPayload);
            
        if (passengersError) throw passengersError;

        // Lógica de Receivable/Payable omitida por brevidade, mas deve ser mantida

        return vendaId;
    };
    
    const updateVendaMutate = async (id: string, venda: VendaFormData) => { /* Implementação */ };
    const deleteVendaMutate = async (id: string) => { /* Implementação */ };

    return {
        addPassageiro, 
        updatePassageiro, 
        deletePassageiro,
        addVendaMutate, 
        updateVendaMutate, 
        deleteVendaMutate
    };
};
// -----------------------------------------------------------


export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // --- LEITURA DE DADOS (USANDO HOOKS DO useSupabaseData) ---
    const { data: accountsData, isLoading: loadingAccounts } = useAccounts();
    const { data: programsData, isLoading: loadingPrograms } = usePrograms();
    const { data: transactionsData, isLoading: loadingTransactions } = useTransactions();
    const { data: payableData, isLoading: loadingPayables } = usePayableInstallments();
    const { data: receivableData, isLoading: loadingReceivables } = useReceivableInstallments();
    const { data: creditCardsData, isLoading: loadingCards } = useCreditCards();
    const { data: passageirosData, isLoading: loadingPassageiros } = usePassageiros(); 
    
    const vendas: Venda[] = []; 

    // *** INÍCIO DA CORREÇÃO E NORMALIZAÇÃO ***
    const contasNormalizadas: StandardItem[] = useMemo(() => {
        return (accountsData || []).map((c: any) => ({
            id: String(c.id), // Garante que o ID é string
            name: c.name ?? c.nome ?? c.descricao ?? String(c.id), // Prioriza 'name', depois tenta fallbacks
        }));
    }, [accountsData]);

    const programasNormalizados: StandardItem[] = useMemo(() => {
        return (programsData || []).map((p: any) => ({
            id: String(p.id), // Garante que o ID é string
            name: p.name ?? p.nome ?? p.program_name ?? String(p.id), // Prioriza 'name', depois tenta fallbacks
        }));
    }, [programsData]);
    // *** FIM DA CORREÇÃO E NORMALIZAÇÃO ***

    // --- FUNÇÕES CRUD (Mapeando para Mutators) ---
    const { 
        addPassageiro, 
        updatePassageiro, 
        deletePassageiro, 
        addVendaMutate, 
        updateVendaMutate, 
        deleteVendaMutate 
    } = useDataMutations();
    

    const addCliente = (data: any) => {
        addPassageiro(data).catch((err) => toast.error(`Erro ao adicionar passageiro: ${err.message}`));
    };

    const updateCliente = (id: string, data: any) => {
        updatePassageiro(id, data).catch((err) => toast.error(`Erro ao atualizar passageiro: ${err.message}`));
    };

    const deleteCliente = (id: string) => {
        deletePassageiro(id).catch((err) => toast.error(`Erro ao deletar passageiro: ${err.message}`));
    };


    const addVenda = (venda: VendaFormData, parcelas: number) => {
        addVendaMutate(venda, parcelas).then(() => {
            toast.success("Venda e passageiros salvos!");
        }).catch((err) => toast.error(`Erro ao registrar venda: ${err.message}`));
    };
    
    const updateVenda = (id: string, venda: VendaFormData) => { /* Lógica */ };
    const deleteVenda = (id: string) => { /* Lógica */ };


    // Determina o estado de carregamento geral
    const isLoading = loadingAccounts || loadingPrograms || loadingTransactions || loadingPassageiros;


    return (
        <DataContext.Provider value={{
            contas: contasNormalizadas, // Usando dados normalizados
            programas: programasNormalizados, // Usando dados normalizados
            cartoes: creditCardsData || [],
            passageiros: passageirosData || [],
            vendas: vendas, 

            addCliente, updateCliente, deleteCliente,
            addVenda, updateVenda, deleteVenda,

            isLoading,
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
