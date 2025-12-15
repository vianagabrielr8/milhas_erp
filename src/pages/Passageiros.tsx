import { useData } from '@/contexts/DataContext'; 
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';

const Passageiros = () => {
  // Pegamos os dados de todas as tabelas
  const { passageiros, contas, programas, isLoading } = useData();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-8">Carregando dados para debug...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="DEBUG: Verificação de Dados"
        description="Este é um modo de debug temporário para verificar Contas e Programas. O problema é no RLS/Dados ou na renderização da tabela."
        action={null}
      />
      
      <div className="p-4 space-y-8 bg-card rounded-lg">
        
        {/* 1. Exibe DADOS CRUS de Contas (CPFs) */}
        <div>
          <h3 className="text-lg font-semibold mb-2 text-primary">Contas (CPFs) - {contas.length} registros</h3>
          <pre className="p-3 bg-muted rounded-md overflow-auto text-sm max-h-60">
            {JSON.stringify(contas, null, 2)}
          </pre>
        </div>

        {/* 2. Exibe DADOS CRUS de Programas */}
        <div>
          <h3 className="text-lg font-semibold mb-2 text-primary">Programas - {programas.length} registros</h3>
          <pre className="p-3 bg-muted rounded-md overflow-auto text-sm max-h-60">
            {JSON.stringify(programas, null, 2)}
          </pre>
        </div>

        {/* 3. Exibe DADOS CRUS de Passageiros (Para comparação) */}
        <div>
          <h3 className="text-lg font-semibold mb-2 text-primary">Passageiros (Referência) - {passageiros.length} registros</h3>
          <pre className="p-3 bg-muted rounded-md overflow-auto text-sm max-h-60">
            {JSON.stringify(passageiros, null, 2)}
          </pre>
        </div>

      </div>
    </MainLayout>
  );
};

export default Passageiros;
