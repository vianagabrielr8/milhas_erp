import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Programa, Conta, Cliente, Fornecedor, Compra, Venda, 
  ContaPagar, ContaReceber, DashboardStats 
} from '@/types';

interface DataContextType {
  loading: boolean;
  programas: Programa[];
  contas: Conta[];
  clientes: Cliente[];
  fornecedores: Fornecedor[];
  compras: Compra[];
  vendas: Venda[];
  contasPagar: ContaPagar[];
  contasReceber: ContaReceber[];
  
  addPrograma: (programa: Omit<Programa, 'id' | 'createdAt'>) => Promise<void>;
  updatePrograma: (id: string, programa: Partial<Programa>) => Promise<void>;
  deletePrograma: (id: string) => Promise<void>;
  
  addConta: (conta: Omit<Conta, 'id' | 'createdAt'>) => Promise<void>;
  updateConta: (id: string, conta: Partial<Conta>) => Promise<void>;
  deleteConta: (id: string) => Promise<void>;
  
  addCliente: (cliente: Omit<Cliente, 'id' | 'createdAt'>) => Promise<void>;
  updateCliente: (id: string, cliente: Partial<Cliente>) => Promise<void>;
  deleteCliente: (id: string) => Promise<void>;
  
  addFornecedor: (fornecedor: Omit<Fornecedor, 'id' | 'createdAt'>) => Promise<void>;
  updateFornecedor: (id: string, fornecedor: Partial<Fornecedor>) => Promise<void>;
  deleteFornecedor: (id: string) => Promise<void>;
  
  addCompra: (compra: Omit<Compra, 'id' | 'createdAt'>) => Promise<void>;
  updateCompra: (id: string, compra: Partial<Compra>) => Promise<void>;
  deleteCompra: (id: string) => Promise<void>;
  
  // Atualizado para aceitar parcelas
  addVenda: (venda: Omit<Venda, 'id' | 'createdAt'>, parcelas?: number) => Promise<void>;
  updateVenda: (id: string, venda: Partial<Venda>) => Promise<void>;
  deleteVenda: (id: string) => Promise<void>;
  
  addContaPagar: (conta: Omit<ContaPagar, 'id' | 'createdAt'>) => Promise<void>;
  updateContaPagar: (id: string, conta: Partial<ContaPagar>) => Promise<void>;
  deleteContaPagar: (id: string) => Promise<void>;
  
  addContaReceber: (conta: Omit<ContaReceber, 'id' | 'createdAt'>) => Promise<void>;
  updateContaReceber: (id: string, conta: Partial<ContaReceber>) => Promise<void>;
  deleteContaReceber: (id: string) => Promise<void>;
  
  getDashboardStats: () => DashboardStats;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estados locais para UI
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]); 
  const [vendas, setVendas] = useState<Venda[]>([]);   
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);

  // 1. Inicialização e Autenticação
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchAllData();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchAllData();
      else {
        setClientes([]); setContas([]); setFornecedores([]); setCompras([]); setVendas([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Carregar TODOS os dados
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Programas (Mapeamento Name -> Nome)
      const { data: progData } = await supabase.from('programs').select('*').order('name');
      if (progData) {
        const programasFormatados = progData.map((p: any) => ({
          id: p.id,
          nome: p.name,
          descricao: p.slug,
          ativo: p.active,
          createdAt: new Date(p.created_at)
        }));
        setProgramas(programasFormatados);
      }

      // Accounts (Contas CPF)
      const { data: accData } = await supabase.from('accounts').select('*');
      if (accData) {
        // Mapear do banco (name/document) para o front (nome/cpf)
        const contasFormatadas = accData.map((c: any) => ({
            id: c.id,
            nome: c.name, // Banco usa 'name'
            cpf: c.document || c.cpf, // Banco pode usar 'document' ou 'cpf'
            ativo: c.active !== undefined ? c.active : true,
            createdAt: new Date(c.created_at)
        }));
        setContas(contasFormatadas);
      }

      const { data: cliData } = await supabase.from('clients').select('*');
      if (cliData) setClientes(cliData);

      const { data: supData } = await supabase.from('suppliers').select('*');
      if (supData) setFornecedores(supData);

      const { data: transData } = await supabase.from('transactions').select('*');
      if (transData) {
         setCompras(transData.filter((t: any) => t.type === 'buy' || t.tipo === 'compra') as any);
         setVendas(transData.filter((t: any) => t.type === 'sell' || t.tipo === 'venda') as any);
      }

      const { data: payData } = await supabase.from('payables').select('*');
      if (payData) setContasPagar(payData);

      const { data: recData } = await supabase.from('receivables').select('*');
      if (recData) setContasReceber(recData);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro de conexão com o banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  const checkUser = () => {
    if (!session?.user) {
      toast.error('Você precisa estar logado.');
      throw new Error('No user');
    }
    return session.user.id;
  };

  // --- PROGRAMAS ---
  const addPrograma = async (item: any) => {
    // Assumindo criação global ou vinculada ao user se o RLS exigir
    const payload = { name: item.nome, slug: item.descricao, active: item.ativo };
    const { data, error } = await supabase.from('programs').insert(payload).select().single();
    if (error) { toast.error('Erro ao criar programa'); return; }
    
    const novoPrograma = {
        id: data.id,
        nome: data.name,
        descricao: data.slug,
        ativo: data.active,
        createdAt: new Date(data.created_at)
    };
    setProgramas(prev => [...prev, novoPrograma]);
  };
  const updatePrograma = async (id: string, item: any) => { /* Implementar */ };
  const deletePrograma = async (id: string) => { 
      const { error } = await supabase.from('programs').delete().eq('id', id);
      if(!error) setProgramas(prev => prev.filter(p => p.id !== id));
  };

  // --- CONTAS (CORREÇÃO DO ERRO AO SALVAR) ---
  const addConta = async (item: any) => {
    try {
      const userId = checkUser();
      // O banco espera 'name' e 'document/cpf', mas o front manda 'nome' e 'cpf'
      const payload = {
          name: item.nome,
          cpf: item.cpf, // Se no banco for 'document', mude para: document: item.cpf
          active: true,
          user_id: userId
      };

      const { data, error } = await supabase.from('accounts').insert(payload).select().single();
      if (error) throw error;
      
      const novaConta = {
          id: data.id,
          nome: data.name,
          cpf: data.cpf || data.document,
          ativo: data.active,
          createdAt: new Date(data.created_at)
      };

      setContas(prev => [...prev, novaConta]);
      toast.success('Conta criada!');
    } catch (e: any) { 
        console.error(e);
        toast.error('Erro ao salvar conta: ' + e.message); 
    }
  };
  
  const updateConta = async (id: string, item: any) => { /* Implementar */ };
  const deleteConta = async (id: string) => {
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
      setContas(prev => prev.filter(i => i.id !== id));
      toast.success('Conta removida!');
    } catch (e) { toast.error('Erro ao remover.'); }
  };

  // --- CLIENTES ---
  const addCliente = async (cliente: any) => {
    try {
      const userId = checkUser();
      const { data, error } = await supabase.from('clients').insert({ ...cliente, user_id: userId }).select().single();
      if (error) throw error;
      setClientes(prev => [...prev, data]);
      toast.success('Cliente cadastrado!');
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    }
  };
  const updateCliente = async (id: string, cliente: Partial<Cliente>) => { /* ... */ };
  const deleteCliente = async (id: string) => { /* ... */ };

  // --- FORNECEDORES ---
  const addFornecedor = async (item: any) => {
    try {
      const userId = checkUser();
      const { data, error } = await supabase.from('suppliers').insert({ ...item, user_id: userId }).select().single();
      if (error) throw error;
      setFornecedores(prev => [...prev, data]);
      toast.success('Fornecedor salvo!');
    } catch (e) { toast.error('Erro ao salvar fornecedor.'); }
  };
  const updateFornecedor = async (id: string, item: any) => { /* ... */ };
  const deleteFornecedor = async (id: string) => { /* ... */ };

// --- COMPRAS (Transactions type='buy') ---
  const addCompra = async (item: any) => {
    try {
      const userId = checkUser();
      
      // 1. TRADUÇÃO DOS CAMPOS (Front -> Banco)
      // O banco usa snake_case (program_id), o site usa camelCase (programaId)
      const payload = {
        user_id: userId,
        type: 'buy', // Define que é uma entrada/compra
        program_id: item.programaId,  // <--- TRADUÇÃO NECESSÁRIA
        account_id: item.contaId,     // <--- TRADUÇÃO NECESSÁRIA
        // client_id: item.clienteId || null, // Descomente se sua tabela transactions tiver esse campo
        quantity: parseInt(item.quantidade),
        amount: parseFloat(item.valorTotal), // O banco guarda o valor total
        date: item.dataCompra || new Date(),
        status: item.status || 'concluido',
        description: item.observacoes
      };

      const { data, error } = await supabase.from('transactions').insert(payload).select().single();
      
      if (error) {
        console.error('Erro detalhado Supabase:', error); 
        throw error;
      }
      
      setCompras(prev => [...prev, data]);
      toast.success('Transação registrada com sucesso!');

      // Lógica de Contas a Pagar (se pendente)
      if (item.status === 'pendente') {
         const contaPagar = {
            user_id: userId,
            description: `Compra de ${item.quantidade} milhas`,
            amount: parseFloat(item.valorTotal),
            due_date: item.dataCompra,
            status: 'pendente',
            // transaction_id: data.id // Descomente se tiver essa coluna em payables
         };
         await supabase.from('payables').insert(contaPagar);
         
         // Atualiza visualmente a lista de contas a pagar
         const { data: payData } = await supabase.from('payables').select('*').order('created_at', {ascending: false}).limit(1);
         if(payData) setContasPagar(prev => [...prev, payData[0]]);
      }

    } catch (e: any) { 
        console.error(e);
        toast.error('Erro ao registrar transação: ' + (e.message || 'Verifique os campos')); 
    }
  };
  const updateCompra = async (id: string, item: any) => { /* ... */ };
  const deleteCompra = async (id: string) => { /* ... */ };

  // --- VENDAS (COM LÓGICA DE PARCELAMENTO) ---
  const addVenda = async (item: any, parcelas: number = 1) => {
    try {
      const userId = checkUser();
      // 1. Criar a transação de venda
      const payload = { ...item, user_id: userId, type: 'sell' };
      const { data, error } = await supabase.from('transactions').insert(payload).select().single();
      if (error) throw error;

      setVendas(prev => [...prev, data]);
      toast.success('Venda registrada!');

      // 2. Se for pendente, gerar Contas a Receber (Parcelas)
      if (item.status === 'pendente') {
         const valorParcela = item.valorTotal / parcelas;
         const dataBase = new Date(item.dataVenda);

         for (let i = 1; i <= parcelas; i++) {
            // Calcular data de vencimento (meses subsequentes)
            const dataVencimento = new Date(dataBase);
            dataVencimento.setMonth(dataBase.getMonth() + i);

            const contaReceber = {
                vendaId: data.id,
                descricao: `Venda Milhas - Parc ${i}/${parcelas}`,
                valor: valorParcela,
                dataVencimento: dataVencimento.toISOString(),
                status: 'pendente',
                user_id: userId
            };
            
            await supabase.from('receivables').insert(contaReceber);
         }
         
         // Atualiza a lista de contas a receber localmente
         const { data: recData } = await supabase.from('receivables').select('*');
         if(recData) setContasReceber(recData);
      }
    } catch (e: any) { 
        toast.error('Erro ao registrar venda: ' + e.message); 
    }
  };
  
  const updateVenda = async (id: string, item: any) => { /* ... */ };
  const deleteVenda = async (id: string) => { /* ... */ };
  const addContaPagar = async (item: any) => { /* ... */ };
  const updateContaPagar = async (id: string, item: any) => { /* ... */ };
  const deleteContaPagar = async (id: string) => { /* ... */ };
  const addContaReceber = async (item: any) => { /* ... */ };
  const updateContaReceber = async (id: string, item: any) => { /* ... */ };
  const deleteContaReceber = async (id: string) => { /* ... */ };

  const getDashboardStats = (): DashboardStats => {
    return {
      totalMilhasEstoque: 0,
      totalCompras: 0,
      totalVendas: 0,
      lucroTotal: 0,
      contasPagarPendentes: 0,
      contasReceberPendentes: 0,
      milhasPorPrograma: [],
      milhasPorConta: [],
    };
  };

  return (
    <DataContext.Provider value={{
      loading,
      programas, contas, clientes, fornecedores, compras, vendas, contasPagar, contasReceber,
      addPrograma, updatePrograma, deletePrograma,
      addConta, updateConta, deleteConta,
      addCliente, updateCliente, deleteCliente,
      addFornecedor, updateFornecedor, deleteFornecedor,
      addCompra, updateCompra, deleteCompra,
      addVenda, updateVenda, deleteVenda,
      addContaPagar, updateContaPagar, deleteContaPagar,
      addContaReceber, updateContaReceber, deleteContaReceber,
      getDashboardStats,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
};
