import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Páginas
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Estoque from "./pages/Estoque";
import ProgramDetails from "./pages/ProgramDetails";
import Compras from "./pages/Compras";
import Vendas from "./pages/Vendas";
import Transferencias from "./pages/Transferencias";
import ContasPagar from "./pages/ContasPagar";
import ContasReceber from "./pages/ContasReceber";
import CartoesPagamento from "./pages/CartoesPagamento";
import Contas from "./pages/Contas";
import Programas from "./pages/Programas";
import Clientes from "./pages/Clientes";
import Fornecedores from "./pages/Fornecedores";
import Limites from "./pages/Limites";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={<Dashboard />} />
          
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/estoque/:id" element={<ProgramDetails />} />
          
          <Route path="/compras" element={<Compras />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/transferencias" element={<Transferencias />} />
          
          <Route path="/financeiro/pagar" element={<ContasPagar />} />
          <Route path="/financeiro/receber" element={<ContasReceber />} />
          <Route path="/financeiro/cartoes" element={<CartoesPagamento />} />
          
          <Route path="/cadastros/contas" element={<Contas />} />
          <Route path="/cadastros/programas" element={<Programas />} />
          <Route path="/cadastros/clientes" element={<Clientes />} />
          <Route path="/cadastros/fornecedores" element={<Fornecedores />} />
          
          <Route path="/seguranca/limites" element={<Limites />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
