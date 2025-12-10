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

  // Estados locais para UI (sincronizados com o banco)
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]); // Mapeado de 'transactions' (tipo buy)
  const [vendas, setVendas] = useState<Venda[]>([]);   // Mapeado de 'transactions' (tipo sell)
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
      // Programas (Geralmente públicos ou compartilhados)
      const { data: progData } = await supabase.from('programs').select('*');
      if (progData) setProgramas(progData);

      // Dados específicos do usuário
      const { data: accData } = await supabase.from('accounts').select('*');
      if (accData) setContas(accData);

      const { data: cliData } = await supabase.from('clients').select('*');
      if (cliData) setClientes(cliData);

      const { data: supData } = await supabase.from('suppliers').select('*');
      if (supData) setFornecedores(supData);

      // Transações (Compras e Vendas ficam na mesma tabela 'transactions' geralmente)
      // Aqui assumo que você tem um campo 'type' ou similar. Se não tiver, ajuste o filtro.
      const { data: transData } = await supabase.from('transactions').select('*');
      if (transData) {
         // Ajuste esta lógica conforme seu banco. Ex: type = 'COMPRA' ou 'VENDA'
         // Se você não tem campo type, precisará criar ou usar tabelas separadas.
         // Por enquanto vou carregar tudo em compras para não quebrar, mas precisamos ajustar isso.
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

  // Helper para verificar login
  const checkUser = () => {
    if (!session?.user) {
      toast.error('Você precisa estar logado.');
      throw new Error('No user');
    }
    return session.user.id;
  };

// Programas (Mapeando Inglês -> Português)
      const { data: progData } = await supabase.from('programs').select('*');
      if (progData) {
        const programasFormatados = progData.map((p: any) => ({
          id: p.id,
          nome: p.name,             // O banco manda 'name', o site usa 'nome'
          descricao: p.slug,        // Usamos o slug como descrição por enquanto
          ativo: p.active,          // O banco manda 'active', o site usa 'ativo'
          createdAt: new Date(p.created_at)
        }));
        setProgramas(programasFormatados);
      }

  // --- CONTAS (Accounts) ---
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

  // --- CLIENTES ---
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

  // --- COMPRAS (Transactions type='buy') ---
  const addCompra = async (item: any) => {
    try {
      const userId = checkUser();
      // Ajuste: 'transactions' deve ter um campo para diferenciar compra de venda
      const payload = { ...item, user_id: userId, type: 'buy' }; 
      
      const { data, error } = await supabase.from('transactions').insert(payload).select().single();
      if (error) throw error;
      
      setCompras(prev => [...prev, data]);
      toast.success('Compra registrada!');

      // Se gerou conta a pagar
      if (item.status === 'pendente') {
         const contaPagar = {
            compraId: data.id, // Assumindo link
            descricao: `Compra de ${item.quantidade} milhas`,
            valor: item.valorTotal,
            dataVencimento: item.dataCompra,
            status: 'pendente',
            user_id: userId
         };
         await supabase.from('payables').insert(contaPagar);
         // Recarregar payables idealmente, ou adicionar ao state manual
         const { data: payData } = await supabase.from('payables').select('*').order('created_at', {ascending: false}).limit(1);
         if(payData) setContasPagar(prev => [...prev, payData[0]]);
      }

    } catch (e) { toast.error('Erro ao registrar compra.'); }
  };
  const updateCompra = async (id: string, item: any) => { /* Implementar update em transactions */ };
  const deleteCompra = async (id: string) => { /* Implementar delete */ };

  // --- VENDAS (Transactions type='sell') ---
  const addVenda = async (item: any) => {
    try {
      const userId = checkUser();
      const payload = { ...item, user_id: userId, type: 'sell' };
      
      const { data, error } = await supabase.from('transactions').insert(payload).select().single();
      if (error) throw error;

      setVendas(prev => [...prev, data]);
      toast.success('Venda registrada!');

      // Se gerou conta a receber
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

  // --- CONTAS A PAGAR / RECEBER ---
  const addContaPagar = async (item: any) => { /* Similar aos anteriores usando tabela 'payables' */ };
  const updateContaPagar = async (id: string, item: any) => { /* Similar usando 'payables' */ };
  const deleteContaPagar = async (id: string) => { /* Similar usando 'payables' */ };

  const addContaReceber = async (item: any) => { /* Similar usando 'receivables' */ };
  const updateContaReceber = async (id: string, item: any) => { /* Similar usando 'receivables' */ };
  const deleteContaReceber = async (id: string) => { /* Similar usando 'receivables' */ };

  // Dashboard Stats (Cálculo no Frontend com dados do Banco)
  const getDashboardStats = (): DashboardStats => {
    const comprasPagas = compras.filter(c => c.status === 'pago');
    const vendasRecebidas = vendas.filter(v => v.status === 'recebido');
    
    const totalCompras = compras.reduce((acc, c) => acc + (c.valorTotal || 0), 0);
    const totalVendas = vendas.reduce((acc, v) => acc + (v.valorTotal || 0), 0);
    
    const milhasCompradas = compras.reduce((acc, c) => acc + (c.quantidade || 0), 0);
    const milhasVendidas = vendas.reduce((acc, v) => acc + (v.quantidade || 0), 0);
    
    // ... restante da lógica de cálculo permanece igual ...
    return {
      totalMilhasEstoque: milhasCompradas - milhasVendidas,
      totalCompras,
      totalVendas,
      lucroTotal: totalVendas - totalCompras,
      contasPagarPendentes: 0, // Calcular do state contasPagar
      contasReceberPendentes: 0, // Calcular do state contasReceber
      milhasPorPrograma: [], // Implementar map
      milhasPorConta: [], // Implementar map
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
