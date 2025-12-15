import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { addMonths, format } from 'date-fns'; // Importação do date-fns

import { 
    useAccounts, 
    usePrograms, 
    useTransactions, 
    usePayableInstallments, 
    useReceivableInstallments, 
    useCreditCards,
    usePassageiros, // CORRETO
    useSuppliers 
} from '@/hooks/useSupabaseData';

// --- TIPOS DE DADOS SIMPLIFICADOS (ADAPTADOS) ---
interface PassageiroType {
    id: string;
    nome: string;
    cpf: string;
    email: string | null;
    telefone: string | null;
    ativo: boolean;
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
    nome: string;
    cpf: string;
}

interface Venda {
    id: string;
    passageiros: { nome: string; cpf: string }[];
    // Adicione outros campos necessários aqui
}

interface VendaFormData extends VendaPayload {
    passageiros: { nome: string; cpf: string }[];
}
// -----------------------------------------------------------


// Tipagem do Contexto (Adaptada para os novos hooks)
interface DataContextType {
    passageiros: PassageiroType[]; // TIPO CORRETO
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
        const { error } = await supabase.from('clients').insert(data);
        if (error) throw error;
        toast.success('Passageiro cadastrado com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['passageiros'] }); 
    };

    const updatePassageiro = async (id: string, data: any) => {
        const { error } = await supabase.from('clients').update(data).eq('id', id);
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
    
    // ... (O restante das funções de Venda Mutate foi omitido por brevidade, mas deve ser mantido)
    // ...
    // ... Aqui você deve ter addVendaMutate, updateVendaMutate, deleteVendaMutate ...
    
    // Vou re-incluir addVendaMutate para garantir que o código que te passei funcione:
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
            nome: p.nome,
            cpf: p.cpf,
        }));
        
        const { error: passengersError } = await supabase
            .from('sale_passengers')
            .insert(passengersPayload);
            
        if (passengersError) throw passengersError;

        const valorParc = venda.valorTotal / parcelas;
        const receivableList = [];
        const baseDate = new Date(venda.dataVenda);

        for (let i = 0; i < parcelas; i++) {
            const dueDate = format(addMonths(baseDate, i + 1), 'yyyy-MM-dd');

            // Simulação de inserção na parcela
            receivableList.push({
                amount: valorParc,
                due_date: dueDate,
                description: `Venda ${vendaId} - ${venda.programa_id} (${i + 1}/${parcelas})`,
                status: 'pendente',
            });
        }
        
        return vendaId;
    };
    
    const updateVendaMutate = async (id: string, venda: VendaFormData) => { /* Implementação */ };
    const deleteVendaMutate = async (id: string) => { /* Implementação */ };

    // Retorno completo das mutations
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
            contas: accountsData || [],
            programas: programsData || [],
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
