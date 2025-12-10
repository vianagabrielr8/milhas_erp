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
  
  addVenda: (venda: Omit<Venda, 'id' | 'createdAt'>) => Promise<void>;
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
        // Limpar dados ao sair
        setClientes([]); setContas([]); setFornecedores([]); setCompras([]); setVendas([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Carregar TODOS os dados do Supabase
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // --- CORREÇÃO AQUI: Mapeando Programas (Inglês do Banco -> Português do Site) ---
      const { data: progData } = await supabase.from('programs').select('*').order('name');
      if (progData) {
        const programasFormatados = progData.map((p: any) => ({
          id: p.id,
          nome: p.name,             // Banco: name -> Site: nome
          descricao: p.slug,        // Banco: slug -> Site: descricao (usando slug como desc)
          ativo: p.active,          // Banco: active -> Site: ativo
          createdAt: new Date(p.created_at)
        }));
        setProgramas(programasFormatados);
      }

      // Dados específicos do usuário (Accounts)
      const { data: accData } = await supabase.from('accounts').select('*');
      if (accData) setContas(accData);

      // Clients
      const { data: cliData } = await supabase.from('clients').select('*');
      if (cliData) setClientes(cliData);

      // Suppliers
      const { data: supData } = await supabase.from('suppliers').select('*');
      if (supData) setFornecedores(supData);

      // Transactions (Separando Compras e Vendas pelo 'type')
      const { data: transData } = await supabase.from('transactions').select('*');
      if (transData) {
         // Filtra compras (type = 'buy') e vendas (type = 'sell')
         setCompras(transData.filter((t: any) => t.type === 'buy' || t.tipo === 'compra') as any);
         setVendas(transData.filter((t: any) => t.type === 'sell' || t.tipo === 'venda') as any);
      }

      // Payables
      const { data: payData } = await supabase.from('payables').select('*');
      if (payData) setContasPagar(payData);

      // Receivables
      const { data: recData } = await supabase.from('receivables').select('*');
      if (recData) setContasReceber(recData);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro de conexão com o banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  // Helper para verificar login
  const checkUser = () => {
    if (!session?.user) {
      toast.error('Você precisa estar logado.');
      throw new Error('No user');
    }
    return session.user.id;
  };

  // --- FUNÇÕES DE ESCRITA (Mantidas iguais) ---

  // Programas (Geralmente admin cria, mas deixei a função aqui)
  const addPrograma = async (item: any) => {
    // Se quiser permitir usuário criar programa, descomente o user_id se sua tabela exigir
    const { data, error } = await supabase.from('programs').insert(item).select().single();
    if (error) { toast.error('Erro ao criar programa'); return; }
    // Mapeando a resposta de volta para o formato português
    const novoPrograma = {
        id: data.id,
        nome: data.name,
        descricao: data.slug,
        ativo: data.active,
        createdAt: new Date(data.created_at)
    };
    setProgramas(prev => [...prev, novoPrograma]);
  };
  const updatePrograma = async (id: string, item: any) => { /* Implementar se necessário */ };
  const deletePrograma = async (id: string) => { /* Implementar se necessário */ };

  // Contas
  const addConta = async (item: any) => {
    try {
      const userId = checkUser();
      const { data, error } = await supabase.from('accounts').insert({ ...item, user_id: userId }).select().single();
      if (error) throw error;
      setContas(prev => [...prev, data]);
      toast.success('Conta criada!');
    } catch (e) { toast.error('Erro ao salvar conta.'); }
  };
  const updateConta = async (id: string, item: any) => {
     try {
       const { error } = await supabase.from('accounts').update(item).eq('id', id);
       if (error) throw error;
       setContas(prev => prev.map(i => i.id === id ? { ...i, ...item } : i));
       toast.success('Conta atualizada!');
     } catch (e) { toast.error('Erro ao atualizar.'); }
  };
  const deleteConta = async (id: string) => {
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
      setContas(prev => prev.filter(i => i.id !== id));
      toast.success('Conta removida!');
    } catch (e) { toast.error('Erro ao remover.'); }
  };

  // Clientes
  const addCliente = async (cliente: any) => {
    try {
      const userId = checkUser();
      const { data, error } = await supabase.from('clients').insert({ ...cliente, user_id: userId }).select().single();
      if (error) throw error;
      setClientes(prev => [...prev, data]);
      toast.success('Cliente cadastrado!');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao cadastrar cliente: ' + error.message);
    }
  };
  const updateCliente = async (id: string, cliente: Partial<Cliente>) => {
    try {
      const { error } = await supabase.from('clients').update(cliente).eq('id', id);
      if (error) throw error;
      setClientes(prev => prev.map(c => c.id === id ? { ...c, ...cliente } : c));
      toast.success('Cliente atualizado!');
    } catch (e) { toast.error('Erro ao atualizar.'); }
  };
  const deleteCliente = async (id: string) => {
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      setClientes(prev => prev.filter(c => c.id !== id));
      toast.success('Cliente excluído!');
    } catch (e) { toast.error('Erro ao excluir.'); }
  };

  // Fornecedores
  const addFornecedor = async (item: any) => {
    try {
      const userId = checkUser();
      const { data, error } = await supabase.from('suppliers').insert({ ...item, user_id: userId }).select().single();
      if (error) throw error;
      setFornecedores(prev => [...prev, data]);
      toast.success('Fornecedor salvo!');
    } catch (e) { toast.error('Erro ao salvar fornecedor.'); }
  };
  const updateFornecedor = async (id: string, item: any) => {
    try {
      const { error } = await supabase.from('suppliers').update(item).eq('id', id);
      if (error) throw error;
      setFornecedores(prev => prev.map(f => f.id === id ? { ...f, ...item } : f));
    } catch (e) { toast.error('Erro ao atualizar.'); }
  };
  const deleteFornecedor = async (id: string) => {
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      setFornecedores(prev => prev.filter(f => f.id !== id));
    } catch (e) { toast.error('Erro ao remover.'); }
  };

  // Compras (Transactions type='buy')
  const addCompra = async (item: any) => {
    try {
      const userId = checkUser();
      const payload = { ...item, user_id: userId, type: 'buy' }; 
      
      const { data, error } = await supabase.from('transactions').insert(payload).select().single();
      if (error) throw error;
      
      setCompras(prev => [...prev, data]);
      toast.success('Compra registrada!');

      if (item.status === 'pendente') {
         const contaPagar = {
            compraId: data.id, 
            descricao: `Compra de ${item.quantidade} milhas`,
            valor: item.valorTotal,
            dataVencimento: item.dataCompra,
            status: 'pendente',
            user_id: userId
         };
         await supabase.from('payables').insert(contaPagar);
         const { data: payData } = await supabase.from('payables').select('*').order('created_at', {ascending: false}).limit(1);
         if(payData) setContasPagar(prev => [...prev, payData[0]]);
      }
    } catch (e) { toast.error('Erro ao registrar compra.'); }
  };
  const updateCompra = async (id: string, item: any) => { /* Implementar */ };
  const deleteCompra = async (id: string) => { /* Implementar */ };

  // Vendas (Transactions type='sell')
  const addVenda = async (item: any) => {
    try {
      const userId = checkUser();
      const payload = { ...item, user_id: userId, type: 'sell' };
      
      const { data, error } = await supabase.from('transactions').insert(payload).select().single();
      if (error) throw error;

      setVendas(prev => [...prev, data]);
      toast.success('Venda registrada!');

      if (item.status === 'pendente') {
         const contaReceber = {
            vendaId: data.id,
            descricao: `Venda de ${item.quantidade} milhas`,
            valor: item.valorTotal,
            dataVencimento: item.dataVenda,
            status: 'pendente',
            user_id: userId
         };
         await supabase.from('receivables').insert(contaReceber);
         const { data: recData } = await supabase.from('receivables').select('*').order('created_at', {ascending: false}).limit(1);
         if(recData) setContasReceber(prev => [...prev, recData[0]]);
      }
    } catch (e) { toast.error('Erro ao registrar venda.'); }
  };
  const updateVenda = async (id: string, item: any) => { /* Implementar */ };
  const deleteVenda = async (id: string) => { /* Implementar */ };

  // Contas a Pagar / Receber
  const addContaPagar = async (item: any) => { /* Implementar */ };
  const updateContaPagar = async (id: string, item: any) => { /* Implementar */ };
  const deleteContaPagar = async (id: string) => { /* Implementar */ };
  const addContaReceber = async (item: any) => { /* Implementar */ };
  const updateContaReceber = async (id: string, item: any) => { /* Implementar */ };
  const deleteContaReceber = async (id: string) => { /* Implementar */ };

  // Dashboard Stats
  const getDashboardStats = (): DashboardStats => {
    const totalCompras = compras.reduce((acc, c) => acc + (c.valorTotal || 0), 0);
    const totalVendas = vendas.reduce((acc, v) => acc + (v.valorTotal || 0), 0);
    const milhasCompradas = compras.reduce((acc, c) => acc + (c.quantidade || 0), 0);
    const milhasVendidas = vendas.reduce((acc, v) => acc + (v.quantidade || 0), 0);
    
    return {
      totalMilhasEstoque: milhasCompradas - milhasVendidas,
      totalCompras,
      totalVendas,
      lucroTotal: totalVendas - totalCompras,
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
