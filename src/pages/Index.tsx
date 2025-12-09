import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Dashboard from "./Dashboard"; // Mantendo seu import original

const Index = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Verifica se já existe um usuário logado
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // 2. SE NÃO TIVER LOGADO: Manda pro Login imediatamente
        navigate("/login");
      }
      setLoading(false);
    };

    checkUser();

    // 3. Monitora se o usuário fez logout para chutar ele de novo
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Enquanto verifica, mostra carregando (para não piscar o painel)
  if (loading) {
    return <div className="h-screen flex items-center justify-center">Verificando segurança...</div>;
  }

  // Se passou pelo segurança, mostra o Dashboard
  return <Dashboard />;
};

export default Index;
