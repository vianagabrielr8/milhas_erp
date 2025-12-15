import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
// ATUALIZAÇÃO: Importa os novos hooks do useSupabaseData (assumindo que foram criados/renomeados)
import { 
    useAccounts, 
    usePrograms, 
    useTransactions, 
    usePayableInstallments, 
    useReceivableInstallments, 
    useCreditCards,
    // NOVO: Usaremos usePassageiros (que substitui useClients)
    usePassageiros,
    // Mantenho useClients/useSuppliers (antigo) com outro nome por segurança
    useClients as useOldClients, 
    useSuppliers 
} from '@/hooks/useSupabaseData';
import { format } from 'date-fns';

// --- TIPOS DE DADOS SIMPLIFICADOS (ADAPTE SE NECESSÁRIO) ---
// Tabela Pai no Supabase
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

// Tabela de Detalhes da Venda no Supabase (Onde a lista de passageiros será salva)
interface VendaPassageiroPayload {
    venda_id: string;
    nome: string;
    cpf: string;
}

// Tipo de Dado Consolidado (Para o Front-end)
interface Venda extends VendaPayload {
    id: string;
    passageiros: { nome: string; cpf: string }[];
}

interface VendaFormData extends VendaPayload {
    passageiros: { nome: string; cpf: string }[];
}
// -----------------------------------------------------------


// Tipagem do Contexto (Adaptada para os novos hooks)
interface DataContextType {
    // Novos nomes de dados
    passageiros: any[]; 
    // Outros dados (mantidos com nomes simples)
    vendas: Venda[]; 
    programas: any[];
    contas: any[];
    cartoes: any[];

    // Funções CRUD de Clientes/Passageiros (Mapeando para useData)
    addCliente: (data: any) => void; 
    updateCliente: (id: string, data: any) => void;
    deleteCliente: (id: string) => void;

    // Funções CRUD de Vendas
    addVenda: (venda: VendaFormData, parcelas: number) => void;
    updateVenda: (id: string, venda: VendaFormData) => void;
    deleteVenda: (id: string) => void;
    
    // Status de carregamento
    isLoading: boolean;
}

// Criando o Contexto
const DataContext = createContext<DataContextType | undefined>(undefined);

// --- FUNÇÕES DE MUTATION (Assumindo que estão no useSupabaseData.ts) ---
// Precisamos das funções de criação/atualização/deleção para Vendas e Passageiros. 
// Como não temos os hooks de mutation, vamos simular o uso direto do Supabase.

const useDataMutations = () => {
    const queryClient = useQueryClient();

    const addPassageiro = async (data: any) => {
        // A tabela 'clients' agora é usada para 'Passageiros'
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
    
    // --- FUNÇÕES DE VENDA ---
    
    const addVendaMutate = async (venda: VendaFormData, parcelas: number) => {
        // 1. Inserir na tabela principal de Vendas
        const { passageiros, ...vendaPayload } = venda;

        // Assumindo que a tabela de Vendas se chama 'sales' no Supabase
        const { data: vendaData, error: vendaError } = await supabase
            .from('sales')
            .insert({ 
                ...vendaPayload,
                // Adicionar o ID do usuário, se necessário
                user_id: (await supabase.auth.getUser()).data.user?.id
            })
            .select();

        if (vendaError) throw vendaError;

        // Blindagem do ID
        const vendaId = vendaData?.[0]?.id;
        if (!vendaId) throw new Error("ID da venda não foi gerado.");


        // 2. Inserir os Passageiros vinculados (Tabela auxiliar: 'sale_passengers')
        const passengersPayload: VendaPassageiroPayload[] = passageiros.map(p => ({
            venda_id: vendaId,
            nome: p.nome,
            cpf: p.cpf,
        }));
        
        // Assumindo que a tabela de Passageiros da Venda se chama 'sale_passengers'
        const { error: passengersError } = await supabase
            .from('sale_passengers')
            .insert(passengersPayload);
            
        if (passengersError) throw passengersError;

        // 3. Gerar Parcelas a Receber (Receivable Installments)
        const valorParc = venda.valorTotal / parcelas;
        const receivableList = [];
        const baseDate = new Date(venda.dataVenda);

        for (let i = 0; i < parcelas; i++) {
            const dueDate = format(addMonths(baseDate, i + 1), 'yyyy-MM-dd');

            receivableList.push({
                // Assumindo que você tem uma tabela 'receivables' (Contas a Receber Pai)
                // E essa parcela se vincula à venda (campo 'venda_id' na parcela?)
                // Simplificando, apenas inserimos na tabela de parcelas:
                amount: valorParc,
                due_date: dueDate,
                description: `Venda ${vendaId} - ${venda.programa_id} (${i + 1}/${parcelas})`,
                status: 'pendente',
                // AQUI PRECISARIA DA LÓGICA COMPLETA DE RECEBIVEIS (Pai + Filho)
            });
        }
        
        // Retornamos apenas o ID da venda por enquanto, pois a lógica completa de Recebíveis é complexa
        return vendaId;
    };
    
    // Simplificando o restante das funções de venda por enquanto...
    const updateVendaMutate = async (id: string, venda: VendaFormData) => { /* ... */ };
    const deleteVendaMutate = async (id: string) => { /* ... */ };


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
    // NOVO: Pegando os dados da nova query de Passageiros
    const { data: passageirosData, isLoading: loadingPassageiros } = usePassageiros(); 
    
    // Simulação dos dados de Vendas (precisa ser corrigida para ler a tabela 'sales' e juntar os passageiros)
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
    

    const addCliente = (data: any) => { // Usado na página Passageiros.tsx
        addPassageiro(data).catch((err) => toast.error(`Erro ao adicionar passageiro: ${err.message}`));
    };

    const updateCliente = (id: string, data: any) => { // Usado na página Passageiros.tsx
        updatePassageiro(id, data).catch((err) => toast.error(`Erro ao atualizar passageiro: ${err.message}`));
    };

    const deleteCliente = (id: string) => { // Usado na página Passageiros.tsx
        deletePassageiro(id).catch((err) => toast.error(`Erro ao deletar passageiro: ${err.message}`));
    };


    const addVenda = (venda: VendaFormData, parcelas: number) => { // Usado na página Vendas.tsx
        addVendaMutate(venda, parcelas).then(() => {
            toast.success("Venda e passageiros salvos!");
            // Aqui você deve invalidar a query de 'sales' e 'receivable_installments'
            // queryClient.invalidateQueries({ queryKey: ['sales'] }); 
        }).catch((err) => toast.error(`Erro ao registrar venda: ${err.message}`));
    };
    
    // Funções de Venda simplificadas
    const updateVenda = (id: string, venda: VendaFormData) => { /* ... */ };
    const deleteVenda = (id: string) => { /* ... */ };


    // Determina o estado de carregamento geral
    const isLoading = loadingAccounts || loadingPrograms || loadingTransactions || loadingPassageiros;


    return (
        <DataContext.Provider value={{
            // Dados brutos
            contas: accountsData || [],
            programas: programsData || [],
            cartoes: creditCardsData || [],
            passageiros: passageirosData || [], // Novo nome da lista
            
            // Dados processados
            vendas: vendas, // LISTA DE VENDAS ATUALMENTE VAZIA/MOCADA

            // Funções CRUD
            addCliente, updateCliente, deleteCliente, // Funções de Passageiros
            addVenda, updateVenda, deleteVenda,

            isLoading,
        }}>
            {children}
        </DataContext.Provider>
    );
};

// Hook de uso
export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
