import { useState, useEffect } from "react";
import Login from "./pages/Login";
// IMPORTANTE: Confira se o caminho abaixo está certo no seu projeto
import { supabase } from "@/integrations/supabase/client"; 

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DataProvider } from "@/contexts/DataContext";
import Index from "./pages/Index";
import Compras from "./pages/Compras";
import Vendas from "./pages/Vendas";
import ContasPagar from "./pages/ContasPagar";
import ContasReceber from "./pages/ContasReceber";
import Clientes from "./pages/Clientes";
import Fornecedores from "./pages/Fornecedores";
import Programas from "./pages/Programas";
import Contas from "./pages/Contas";
import Estoque from "./pages/Estoque";
import ProgramDetails from "./pages/ProgramDetails";
import CartoesPagamento from "./pages/CartoesPagamento";
import Limites from "./pages/Limites";
import Transferencias from "./pages/Transferencias";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Verifica sessão inicial ao carregar a página (F5)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuta mudanças (Login ou Logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Evita piscar a tela de login enquanto verifica
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DataProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {/* LÓGICA DE PROTEÇÃO:
               Se não tiver sessão (!session), mostra apenas o Login.
               Se tiver sessão, libera as rotas do sistema.
            */}
            {!session ? (
              <Routes>
                <Route path="*" element={<Login />} />
              </Routes>
            ) : (
              <Routes>
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/" element={<Index />} />
                
                {/* ESTOQUE E DETALHES */}
                <Route path="/estoque" element={<Estoque />} />
                <Route path="/estoque/:id" element={<ProgramDetails />} />

                <Route path="/compras" element={<Compras />} />
                <Route path="/vendas" element={<Vendas />} />
                
                <Route path="/contas-pagar" element={<ContasPagar />} />
                <Route path="/contas-receber" element={<ContasReceber />} />
                <Route path="/cartoes" element={<CartoesPagamento />} />
                
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/fornecedores" element={<Fornecedores />} />
                <Route path="/programas" element={<Programas />} />
                <Route path="/contas" element={<Contas />} />
                <Route path="/limites" element={<Limites />} />
                <Route path="/transferencias" element={<Transferencias />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            )}
          </BrowserRouter>
        </TooltipProvider>
      </DataProvider>
    </QueryClientProvider>
  );
};

export default App;
