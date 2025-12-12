import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// PÁGINAS CONFIRMADAS NO SEU PRINT
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Estoque from "./pages/Estoque";
import Transferencias from "./pages/Transferencias";
import Vendas from "./pages/Vendas";
import ContasPagar from "./pages/ContasPagar";
import ContasReceber from "./pages/ContasReceber";
import Programas from "./pages/Programas";
import Fornecedores from "./pages/Fornecedores";
import Limites from "./pages/Limites";
import Financeiro from "./pages/Financeiro"; 
// import Compras from "./pages/Compras"; // Descomente se existir
// import Clientes from "./pages/Clientes"; // Descomente se existir

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          {/* Rotas Principais */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Operacional */}
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/transferencias" element={<Transferencias />} />
          
          {/* Financeiro */}
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/financeiro/pagar" element={<ContasPagar />} />
          <Route path="/financeiro/receber" element={<ContasReceber />} />
          
          {/* Cadastros e Configurações */}
          <Route path="/cadastros/programas" element={<Programas />} />
          <Route path="/cadastros/fornecedores" element={<Fornecedores />} />
          <Route path="/seguranca/limites" element={<Limites />} />
          
          {/* Rotas Comentadas (Para evitar erro se o arquivo não existir) */}
          {/* <Route path="/compras" element={<Compras />} /> */}
          {/* <Route path="/cadastros/clientes" element={<Clientes />} /> */}
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
