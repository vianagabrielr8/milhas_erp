import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, Ban, Filter, Plane } from 'lucide-react';
import { subYears } from 'date-fns';

const Limites = () => {
  const { contas, programas, vendas } = useData();

  // Estados para os filtros
  const [filtroConta, setFiltroConta] = useState("all");
  const [filtroCia, setFiltroCia] = useState("all");

  // Lista de palavras-chave para identificar quem é Cia Aérea
  // Se você tiver outro programa aéreo (ex: Iberia), adicione aqui
  const ciasAereasKeywords = ['latam', 'smiles', 'azul', 'tap', 'aadvantage', 'iberia', 'qatar'];

  // 1. Filtrar apenas os programas que são Cias Aéreas
  const programasAereos = useMemo(() => {
    return programas.filter(p => {
      const nome = p.nome.toLowerCase();
      // Retorna true se o nome do programa tiver alguma das palavras da lista
      return ciasAereasKeywords.some(keyword => nome.includes(keyword));
    });
  }, [programas]);

  // 2. Lógica Principal: Calcular uso por Conta + Cia Aérea
  const usoPorConta = useMemo(() => {
    const umAnoAtras = subYears(new Date(), 1);
    const resultado: any[] = [];

    // Filtra as contas com base na seleção
    const contasFiltradas = filtroConta === "all" 
      ? contas 
      : contas.filter(c => c.id === filtroConta);

    // Filtra os programas com base na seleção
    const programasFiltrados = filtroCia === "all"
      ? programasAereos
      : programasAereos.filter(p => p.id === filtroCia);

    // Loop Cruzado: Contas x Programas Aéreos
    contasFiltradas.forEach(conta => {
      programasFiltrados.filter(p => p.ativo).forEach(prog => {
        
        // A. Pegar vendas dessa conta nessa Cia no último ano
        const vendasRelevantes = vendas.filter(v => 
          v.contaId === conta.id && 
          v.programaId === prog.id &&
          new Date(v.dataVenda) >= umAnoAtras &&
          v.clienteId // Tem que ter cliente vinculado
        );

        // B. Extrair CPFs ÚNICOS
        const clientesUnicos = new Set(vendasRelevantes.map(v => v.clienteId));
        
        const usados = clientesUnicos.size;
        // Limites Padrão (Fallback caso o banco esteja zerado)
        let limitePadrao = 25; 
        if (prog.nome.toLowerCase().includes('azul')) limitePadrao = 5;
        
        const limite = prog.limite && prog.limite > 0 ? prog.limite : limitePadrao;
        const disponivel = limite - usados;
        
        resultado.push({
          contaNome: conta.nome,
          programaNome: prog.nome,
          usados,
          limite,
          disponivel,
          porcentagem: Math.min((usados / limite) * 100, 100) // Trava em 100% visualmente
        });
      });
    });

    // Ordena: Quem está mais perto de estourar o limite aparece primeiro
    return resultado.sort((a, b) => b.porcentagem - a.porcentagem);
  }, [contas, programasAereos, vendas, filtroConta, filtroCia]);

  return (
    <MainLayout>
      <PageHeader
        title="Limites de CPF"
        description="Controle de emissões por CPF nas companhias aéreas (Janela de 12 meses)"
      />

      {/* ÁREA DE FILTROS */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-muted/20 p-4 rounded-lg border border-border/50">
        <div className="flex items-center gap-2 text-muted-foreground text-sm min-w-[80px]">
          <Filter className="h-4 w-4" />
          Filtros:
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          {/* Filtro por Conta */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground ml-1">Conta (Login)</label>
            <Select value={filtroConta} onValueChange={setFiltroConta}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todas as contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {contas.map(conta => (
                  <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Cia Aérea */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground ml-1">Cia Aérea</label>
            <Select value={filtroCia} onValueChange={setFiltroCia}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todas as Cias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Cias</SelectItem>
                {programasAereos.map(prog => (
                  <SelectItem key={prog.id} value={prog.id}>{prog.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* GRID DE CARDS */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {usoPorConta.length > 0 ? (
          usoPorConta.map((item, index) => (
            <Card key={index} className={`transition-all hover:shadow-md ${
              item.usados >= item.limite ? "border-destructive/50 bg-destructive/5" : "border-border/50"
            }`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary/50" />
                    {item.contaNome}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground font-bold flex items-center gap-1">
                    <Plane className="h-3 w-3" />
                    {item.programaNome}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <div className="text-4xl font-bold flex items-end gap-2 tracking-tight">
                      {item.usados}
                      <span className="text-sm font-medium text-muted-foreground mb-1.5">/ {item.limite}</span>
                    </div>
                    <p className={`text-xs font-medium mt-1 ${item.disponivel <= 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {item.disponivel <= 0 ? 'Sem vagas disponíveis' : `${item.disponivel} vagas disponíveis`}
                    </p>
                  </div>
                  
                  {/* Ícone de Status Dinâmico */}
                  {item.usados >= item.limite ? (
                    <Ban className="h-10 w-10 text-destructive opacity-80" />
                  ) : item.usados >= (item.limite * 0.8) ? (
                    <AlertTriangle className="h-10 w-10 text-warning opacity-80" />
                  ) : (
                    <CheckCircle2 className="h-10 w-10 text-success opacity-80" />
                  )}
                </div>

                <div className="space-y-1">
                  <Progress 
                    value={item.porcentagem} 
                    className={`h-2.5 ${
                      item.usados >= item.limite ? "bg-destructive/20" : "bg-secondary"
                    }`}
                    // Para customizar a cor da barra de progresso (indicator), 
                    // geralmente é via classe CSS global ou prop específica dependendo da lib ui
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
                
                {item.usados >= (item.limite * 0.8) && item.usados < item.limite && (
                  <div className="mt-4 p-2 bg-warning/10 border border-warning/20 rounded text-xs text-warning font-medium flex gap-2 items-center">
                    <AlertTriangle className="h-3 w-3" />
                    Atenção: Limite próximo!
                  </div>
                )}
                
                {item.usados >= item.limite && (
                  <div className="mt-4 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive font-bold flex gap-2 items-center">
                    <Ban className="h-3 w-3" />
                    LIMITE ATINGIDO!
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
            Nenhum dado encontrado para os filtros selecionados.
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Limites;
