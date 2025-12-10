import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, AlertTriangle, CheckCircle2, Ban } from 'lucide-react';
import { subYears, isAfter } from 'date-fns';

const Limites = () => {
  const { contas, programas, vendas } = useData();

  // Lógica pesada: Calcular uso por Conta + Programa
  const usoPorConta = useMemo(() => {
    const umAnoAtras = subYears(new Date(), 1);
    const resultado: any[] = [];

    // Para cada conta cadastrada (CPF do dono)
    contas.forEach(conta => {
      // Para cada programa (Latam, Smiles...)
      programas.filter(p => p.ativo).forEach(prog => {
        
        // 1. Pegar vendas dessa conta nesse programa no último ano
        const vendasRelevantes = vendas.filter(v => 
          v.contaId === conta.id && 
          v.programaId === prog.id &&
          new Date(v.dataVenda) >= umAnoAtras &&
          v.clienteId // Tem que ter cliente vinculado
        );

        // 2. Extrair CPFs ÚNICOS (Clientes distintos)
        // Usamos um Set para garantir que o mesmo cliente não conte 2x
        const clientesUnicos = new Set(vendasRelevantes.map(v => v.clienteId));
        const usados = clientesUnicos.size;
        const limite = prog.limite || 25;
        const disponivel = limite - usados;
        
        // Só mostra se tiver algum uso ou se for importante
        // (Você pode remover esse if se quiser ver tudo zerado também)
        if (true) { 
          resultado.push({
            contaNome: conta.nome,
            programaNome: prog.nome,
            usados,
            limite,
            disponivel,
            porcentagem: (usados / limite) * 100
          });
        }
      });
    });

    return resultado.sort((a, b) => b.porcentagem - a.porcentagem);
  }, [contas, programas, vendas]);

  return (
    <MainLayout>
      <PageHeader
        title="Limites de CPF"
        description="Controle de emissões por CPF nas companhias aéreas (Últimos 12 meses)"
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {usoPorConta.map((item, index) => (
          <Card key={index} className={item.usados >= item.limite ? "border-destructive/50 bg-destructive/5" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between items-center">
                <span>{item.contaNome}</span>
                <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground font-bold">
                  {item.programaNome}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <div className="text-3xl font-bold flex items-center gap-2">
                    {item.usados}
                    <span className="text-sm font-normal text-muted-foreground">/ {item.limite}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.disponivel} vagas disponíveis
                  </p>
                </div>
                
                {/* Ícone de Status */}
                {item.usados >= item.limite ? (
                  <Ban className="h-8 w-8 text-destructive" />
                ) : item.usados >= (item.limite * 0.8) ? (
                  <AlertTriangle className="h-8 w-8 text-warning" />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-success" />
                )}
              </div>

              <Progress 
                value={item.porcentagem} 
                className={`h-2 ${
                  item.usados >= item.limite ? "bg-destructive/20" : ""
                }`}
                // Nota: A cor da barra interna depende da classe do componente Progress ou cor do tema
              />
              
              {item.usados >= (item.limite * 0.8) && item.usados < item.limite && (
                <p className="text-xs text-warning mt-2 font-medium">
                  Atenção: Limite próximo!
                </p>
              )}
              {item.usados >= item.limite && (
                <p className="text-xs text-destructive mt-2 font-bold">
                  LIMITE ATINGIDO! Não emita mais passagens.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </MainLayout>
  );
};

export default Limites;
