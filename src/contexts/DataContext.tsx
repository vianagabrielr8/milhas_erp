import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Programa, 
  Conta, 
  Cliente, 
  Fornecedor, 
  Compra, 
  Venda, 
  ContaPagar, 
  ContaReceber,
  DashboardStats 
} from '@/types';

interface DataContextType {
  programas: Programa[];
  contas: Conta[];
  clientes: Cliente[];
  fornecedores: Fornecedor[];
  compras: Compra[];
  vendas: Venda[];
  contasPagar: ContaPagar[];
  contasReceber: ContaReceber[];
  
  addPrograma: (programa: Omit<Programa, 'id' | 'createdAt'>) => void;
  updatePrograma: (id: string, programa: Partial<Programa>) => void;
  deletePrograma: (id: string) => void;
  
  addConta: (conta: Omit<Conta, 'id' | 'createdAt'>) => void;
  updateConta: (id: string, conta: Partial<Conta>) => void;
  deleteConta: (id: string) => void;
  
  addCliente: (cliente: Omit<Cliente, 'id' | 'createdAt'>) => void;
  updateCliente: (id: string, cliente: Partial<Cliente>) => void;
  deleteCliente: (id: string) => void;
  
  addFornecedor: (fornecedor: Omit<Fornecedor, 'id' | 'createdAt'>) => void;
  updateFornecedor: (id: string, fornecedor: Partial<Fornecedor>) => void;
  deleteFornecedor: (id: string) => void;
  
  addCompra: (compra: Omit<Compra, 'id' | 'createdAt'>) => void;
  updateCompra: (id: string, compra: Partial<Compra>) => void;
  deleteCompra: (id: string) => void;
  
  addVenda: (venda: Omit<Venda, 'id' | 'createdAt'>) => void;
  updateVenda: (id: string, venda: Partial<Venda>) => void;
  deleteVenda: (id: string) => void;
  
  addContaPagar: (conta: Omit<ContaPagar, 'id' | 'createdAt'>) => void;
  updateContaPagar: (id: string, conta: Partial<ContaPagar>) => void;
  deleteContaPagar: (id: string) => void;
  
  addContaReceber: (conta: Omit<ContaReceber, 'id' | 'createdAt'>) => void;
  updateContaReceber: (id: string, conta: Partial<ContaReceber>) => void;
  deleteContaReceber: (id: string) => void;
  
  getDashboardStats: () => DashboardStats;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored, (key, value) => {
        if (key.includes('data') || key.includes('Data') || key === 'createdAt') {
          return new Date(value);
        }
        return value;
      });
    }
  } catch (error) {
    console.error(`Error loading ${key} from storage:`, error);
  }
  return defaultValue;
};

const saveToStorage = <T,>(key: string, data: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [programas, setProgramas] = useState<Programa[]>(() => 
    loadFromStorage('milhas_programas', [
      { id: '1', nome: 'Smiles', descricao: 'Programa GOL', ativo: true, createdAt: new Date() },
      { id: '2', nome: 'LATAM Pass', descricao: 'Programa LATAM', ativo: true, createdAt: new Date() },
    ])
  );
  
  const [contas, setContas] = useState<Conta[]>(() => 
    loadFromStorage('milhas_contas', [
      { id: '1', nome: 'Gabriel Viana', cpf: '', ativo: true, createdAt: new Date() },
      { id: '2', nome: 'Ingrid Bittencourt', cpf: '', ativo: true, createdAt: new Date() },
    ])
  );
  
  const [clientes, setClientes] = useState<Cliente[]>(() => loadFromStorage('milhas_clientes', []));
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(() => loadFromStorage('milhas_fornecedores', []));
  const [compras, setCompras] = useState<Compra[]>(() => loadFromStorage('milhas_compras', []));
  const [vendas, setVendas] = useState<Venda[]>(() => loadFromStorage('milhas_vendas', []));
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>(() => loadFromStorage('milhas_contas_pagar', []));
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>(() => loadFromStorage('milhas_contas_receber', []));

  useEffect(() => saveToStorage('milhas_programas', programas), [programas]);
  useEffect(() => saveToStorage('milhas_contas', contas), [contas]);
  useEffect(() => saveToStorage('milhas_clientes', clientes), [clientes]);
  useEffect(() => saveToStorage('milhas_fornecedores', fornecedores), [fornecedores]);
  useEffect(() => saveToStorage('milhas_compras', compras), [compras]);
  useEffect(() => saveToStorage('milhas_vendas', vendas), [vendas]);
  useEffect(() => saveToStorage('milhas_contas_pagar', contasPagar), [contasPagar]);
  useEffect(() => saveToStorage('milhas_contas_receber', contasReceber), [contasReceber]);

  // Programas
  const addPrograma = (programa: Omit<Programa, 'id' | 'createdAt'>) => {
    setProgramas(prev => [...prev, { ...programa, id: generateId(), createdAt: new Date() }]);
  };
  const updatePrograma = (id: string, programa: Partial<Programa>) => {
    setProgramas(prev => prev.map(p => p.id === id ? { ...p, ...programa } : p));
  };
  const deletePrograma = (id: string) => {
    setProgramas(prev => prev.filter(p => p.id !== id));
  };

  // Contas
  const addConta = (conta: Omit<Conta, 'id' | 'createdAt'>) => {
    setContas(prev => [...prev, { ...conta, id: generateId(), createdAt: new Date() }]);
  };
  const updateConta = (id: string, conta: Partial<Conta>) => {
    setContas(prev => prev.map(c => c.id === id ? { ...c, ...conta } : c));
  };
  const deleteConta = (id: string) => {
    setContas(prev => prev.filter(c => c.id !== id));
  };

  // Clientes
  const addCliente = (cliente: Omit<Cliente, 'id' | 'createdAt'>) => {
    setClientes(prev => [...prev, { ...cliente, id: generateId(), createdAt: new Date() }]);
  };
  const updateCliente = (id: string, cliente: Partial<Cliente>) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...cliente } : c));
  };
  const deleteCliente = (id: string) => {
    setClientes(prev => prev.filter(c => c.id !== id));
  };

  // Fornecedores
  const addFornecedor = (fornecedor: Omit<Fornecedor, 'id' | 'createdAt'>) => {
    setFornecedores(prev => [...prev, { ...fornecedor, id: generateId(), createdAt: new Date() }]);
  };
  const updateFornecedor = (id: string, fornecedor: Partial<Fornecedor>) => {
    setFornecedores(prev => prev.map(f => f.id === id ? { ...f, ...fornecedor } : f));
  };
  const deleteFornecedor = (id: string) => {
    setFornecedores(prev => prev.filter(f => f.id !== id));
  };

  // Compras
  const addCompra = (compra: Omit<Compra, 'id' | 'createdAt'>) => {
    const novaCompra = { ...compra, id: generateId(), createdAt: new Date() };
    setCompras(prev => [...prev, novaCompra]);
    
    if (compra.status === 'pendente') {
      const contaPagar: Omit<ContaPagar, 'id' | 'createdAt'> = {
        compraId: novaCompra.id,
        descricao: `Compra de ${compra.quantidade.toLocaleString()} milhas`,
        valor: compra.valorTotal,
        dataVencimento: compra.dataCompra,
        status: 'pendente',
      };
      addContaPagar(contaPagar);
    }
  };
  const updateCompra = (id: string, compra: Partial<Compra>) => {
    setCompras(prev => prev.map(c => c.id === id ? { ...c, ...compra } : c));
  };
  const deleteCompra = (id: string) => {
    setCompras(prev => prev.filter(c => c.id !== id));
    setContasPagar(prev => prev.filter(c => c.compraId !== id));
  };

  // Vendas
  const addVenda = (venda: Omit<Venda, 'id' | 'createdAt'>) => {
    const novaVenda = { ...venda, id: generateId(), createdAt: new Date() };
    setVendas(prev => [...prev, novaVenda]);
    
    if (venda.status === 'pendente') {
      const contaReceber: Omit<ContaReceber, 'id' | 'createdAt'> = {
        vendaId: novaVenda.id,
        descricao: `Venda de ${venda.quantidade.toLocaleString()} milhas`,
        valor: venda.valorTotal,
        dataVencimento: venda.dataVenda,
        status: 'pendente',
      };
      addContaReceber(contaReceber);
    }
  };
  const updateVenda = (id: string, venda: Partial<Venda>) => {
    setVendas(prev => prev.map(v => v.id === id ? { ...v, ...venda } : v));
  };
  const deleteVenda = (id: string) => {
    setVendas(prev => prev.filter(v => v.id !== id));
    setContasReceber(prev => prev.filter(c => c.vendaId !== id));
  };

  // Contas a Pagar
  const addContaPagar = (conta: Omit<ContaPagar, 'id' | 'createdAt'>) => {
    setContasPagar(prev => [...prev, { ...conta, id: generateId(), createdAt: new Date() }]);
  };
  const updateContaPagar = (id: string, conta: Partial<ContaPagar>) => {
    setContasPagar(prev => prev.map(c => c.id === id ? { ...c, ...conta } : c));
  };
  const deleteContaPagar = (id: string) => {
    setContasPagar(prev => prev.filter(c => c.id !== id));
  };

  // Contas a Receber
  const addContaReceber = (conta: Omit<ContaReceber, 'id' | 'createdAt'>) => {
    setContasReceber(prev => [...prev, { ...conta, id: generateId(), createdAt: new Date() }]);
  };
  const updateContaReceber = (id: string, conta: Partial<ContaReceber>) => {
    setContasReceber(prev => prev.map(c => c.id === id ? { ...c, ...conta } : c));
  };
  const deleteContaReceber = (id: string) => {
    setContasReceber(prev => prev.filter(c => c.id !== id));
  };

  // Dashboard Stats
  const getDashboardStats = (): DashboardStats => {
    const comprasPagas = compras.filter(c => c.status === 'pago');
    const vendasRecebidas = vendas.filter(v => v.status === 'recebido');
    
    const totalCompras = compras.reduce((acc, c) => acc + c.valorTotal, 0);
    const totalVendas = vendas.reduce((acc, v) => acc + v.valorTotal, 0);
    
    const milhasCompradas = compras.reduce((acc, c) => acc + c.quantidade, 0);
    const milhasVendidas = vendas.reduce((acc, v) => acc + v.quantidade, 0);
    
    const milhasPorPrograma = programas.map(p => {
      const comprasPrograma = compras.filter(c => c.programaId === p.id).reduce((acc, c) => acc + c.quantidade, 0);
      const vendasPrograma = vendas.filter(v => v.programaId === p.id).reduce((acc, v) => acc + v.quantidade, 0);
      return { programa: p.nome, quantidade: comprasPrograma - vendasPrograma };
    });
    
    const milhasPorConta = contas.map(c => {
      const comprasConta = compras.filter(cp => cp.contaId === c.id).reduce((acc, cp) => acc + cp.quantidade, 0);
      const vendasConta = vendas.filter(v => v.contaId === c.id).reduce((acc, v) => acc + v.quantidade, 0);
      return { conta: c.nome, quantidade: comprasConta - vendasConta };
    });
    
    const contasPagarPendentes = contasPagar.filter(c => c.status === 'pendente' || c.status === 'vencido').reduce((acc, c) => acc + c.valor, 0);
    const contasReceberPendentes = contasReceber.filter(c => c.status === 'pendente' || c.status === 'vencido').reduce((acc, c) => acc + c.valor, 0);
    
    return {
      totalMilhasEstoque: milhasCompradas - milhasVendidas,
      totalCompras,
      totalVendas,
      lucroTotal: totalVendas - totalCompras,
      contasPagarPendentes,
      contasReceberPendentes,
      milhasPorPrograma,
      milhasPorConta,
    };
  };

  return (
    <DataContext.Provider value={{
      programas,
      contas,
      clientes,
      fornecedores,
      compras,
      vendas,
      contasPagar,
      contasReceber,
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
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
