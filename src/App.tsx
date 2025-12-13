import Login from "./pages/Login";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import ProgramDetails from "./pages/ProgramDetails"; // <--- IMPORT NOVO
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DataProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Index />} />
            
            {/* ESTOQUE E DETALHES */}
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/estoque/:id" element={<ProgramDetails />} /> {/* <--- ROTA NOVA */}

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
        </BrowserRouter>
      </TooltipProvider>
    </DataProvider>
  </QueryClientProvider>
);

export default App;
