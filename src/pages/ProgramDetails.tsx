import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';

const ProgramDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">TESTE DE TELA</h1>
        <p className="mb-4">Se você está lendo isso, a rota funcionou!</p>
        <p>ID do Programa: {id}</p>
        <Button onClick={() => navigate('/estoque')}>Voltar</Button>
      </div>
    </MainLayout>
  );
};

export default ProgramDetails;
