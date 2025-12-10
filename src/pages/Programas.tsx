import { useData } from '@/contexts/DataContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Programa } from '@/types';

const Programas = () => {
  // Apenas lemos os programas, não importamos as funções de editar/excluir
  const { programas } = useData();

  const columns = [
    { key: 'nome', header: 'Nome' },
    {
      key: 'ativo',
      header: 'Status',
      render: (programa: Programa) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            programa.ativo
              ? 'bg-success/10 text-success border border-success/30'
              : 'bg-muted text-muted-foreground border border-border'
          }`}
        >
          {programa.ativo ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    // Removemos a coluna de Ações (Lápis e Lixeira)
  ];

  return (
    <MainLayout>
      <PageHeader
        title="Programas de Milhas"
        description="Programas de fidelidade disponíveis no sistema"
        // Removemos a propriedade 'action', o botão sumiu
      />

      <DataTable
        data={programas}
        columns={columns}
        emptyMessage="Nenhum programa cadastrado no sistema."
      />
    </MainLayout>
  );
};

export default Programas;
