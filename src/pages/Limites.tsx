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
import { AlertTriangle, CheckCircle2, Ban, Filter, Plane, CalendarDays, RotateCcw } from 'lucide-react';
import { subYears, startOfYear, isAfter } from 'date-fns';

const Limites = () => {
  const { contas, programas, vendas } = useData();

  const [filtroConta, setFiltroConta] = useState("all");
  const [filtroCia, setFiltroCia] = useState("all");

  const ciasAereasKeywords = ['latam', 'smiles', 'azul', 'tap', 'aadvantage', 'iberia', 'qatar'];

  // 1. Identificar Cias Aéreas
  const programasAereos = useMemo(() => {
    return programas.filter(p => {
      const nome = p.nome.toLowerCase();
      return ciasAereasKeywords.some(keyword => nome.includes(keyword));
    });
  }, [programas]);

  // 2. Lógica Inteligente de Datas por Cia
  const getRegraCia = (nomePrograma: string) => {
    const nome = nomePrograma.toLowerCase();
    
    if (nome.includes('smiles') || nome.includes('tap')) {
      return {
        tipo: 'ANO_CIVIL',
        dataCorte: startOfYear(new Date()), // 01 de Janeiro deste ano
        texto: 'Renova em 01/Jan'
      };
    }
    
    if (nome.includes('azul')) {
      return {
        tipo: 'LISTA_FIXA',
        dataCorte: subYears(new Date(), 2), // Azul é lista fixa, olhamos histórico longo
        texto: 'Lista Fixa (5 vagas)'
      };
    }

    if (nome.includes('aadvantage')) {
        return {
          tipo: 'ILIMITADO',
          dataCorte: startOfYear(new Date()),
          texto: 'Sem limite oficial'
        };
    }

    // Padrão LATAM (Janela Móvel de 1 ano)
    return {
      tipo: 'JANELA_MOVEL',
      dataCorte: subYears(new Date(), 1), // Hoje - 1 ano
      texto: 'Libera 1 ano após uso'
    };
  };

  const usoPorConta = useMemo(() => {
    const resultado: any[] = [];

    const contasFiltradas = filtroConta === "all" ? contas : contas.filter(c => c.id === filtroConta);
    const programasFiltrados = filtroCia === "all" ? programasAereos : programasAereos.filter(p => p.id === filtroCia);

    contasFiltradas.forEach(conta => {
      programasFiltrados.filter(p => p.ativo).forEach(prog => {
        
        const regra = getRegraCia(prog.nome);
        
        // Filtra vendas baseadas na REGRA DA CIA (A Mágica acontece aqui)
        const vendasRelevantes = vendas.filter(v => 
          v.contaId === conta.id && 
          v.programaId === prog.id &&
          v.clienteId &&
          new Date(v.dataVenda) >= regra.dataCorte
        );

        const clientesUnicos = new Set(vendasRelevantes.map(v => v.clienteId));
        const usados = clientesUnicos.size;
        
        // Definição de Limites Específicos
        let limitePadrao = 25; 
        if (prog.nome.toLowerCase().includes('azul')) limitePadrao = 5;
        if (prog.nome.toLowerCase().includes('tap')) limitePadrao = 10;
        if (prog.nome.toLowerCase().includes('aadvantage')) limitePadrao = 999; // Visualmente ilimitado
        
        // Usa o limite do banco se tiver, senão usa o padrão da regra
        const limite = prog.limite && prog.limite > 0 ? prog.limite : limitePadrao;
        const disponivel = limite - usados;
        
        // Cálculo da porcentagem (com trava visual para AAdvantage)
        let porcentagem = 0;
        if (limite === 999) porcentagem = 0; // AA sempre parece livre
        else porcentagem = Math.min((usados / limite) * 100, 100);

        resultado.push({
          contaNome: conta.nome,
          programaNome: prog.nome,
          usados,
          limite,
          disponivel,
          porcentagem,
          regraTexto: regra.texto,
          isIlimitado: limite === 999
        });
      });
    });

    return resultado.sort((a, b) => b.porcentagem - a.porcentagem);
  }, [contas, programasAereos, vendas, filtroConta, filtroCia]);

  return (
    <MainLayout>
      <PageHeader
        title="Limites de CPF"
        description="Monitoramento inteligente de cotas por Cia Aérea"
      />

      <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-muted/20 p-4 rounded-lg border border-border/50">
        <div className="flex items-center gap-2 text-muted-foreground text-sm min-w-[80px]">
          <Filter className="h-4 w-4" />
          Filtros:
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {usoPorConta.length > 0 ? (
          usoPorConta.map((item, index) => (
            <Card key={index} className={`transition-all hover:shadow-md ${
              !item.isIlimitado && item.usados >= item.limite ? "border-destructive/50 bg-destructive/5" : "border-border/50"
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
                      {!item.isIlimitado && (
                        <span className="text-sm font-medium text-muted-foreground mb-1.5">/ {item.limite}</span>
                      )}
                    </div>
                    
                    {/* Regra de Renovação */}
                    <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded w-fit">
                      {item.regraTexto.includes('01/Jan') ? <CalendarDays className="h-3 w-3"/> : <RotateCcw className="h-3 w-3"/>}
                      {item.regraTexto}
                    </div>
                  </div>
                  
                  {/* Ícones de Status */}
                  {item.isIlimitado ? (
                    <CheckCircle2 className="h-10 w-10 text-primary opacity-50" />
                  ) : item.usados >= item.limite ? (
                    <Ban className="h-10 w-10 text-destructive opacity-80" />
                  ) : item.usados >= (item.limite * 0.8) ? (
                    <AlertTriangle className="h-10 w-10 text-warning opacity-80" />
                  ) : (
                    <CheckCircle2 className="h-10 w-10 text-success opacity-80" />
                  )}
                </div>

                {!item.isIlimitado && (
                  <div className="space-y-1">
                    <Progress 
                      value={item.porcentagem} 
                      className={`h-2.5 ${
                        item.usados >= item.limite ? "bg-destructive/20" : "bg-secondary"
                      }`}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      <span>0%</span>
                      <span>{Math.round(item.limite / 2)}</span>
                      <span>{item.limite}</span>
                    </div>
                  </div>
                )}
                
                {/* Alertas */}
                {!item.isIlimitado && item.usados >= (item.limite * 0.8) && item.usados < item.limite && (
                  <div className="mt-4 p-2 bg-warning/10 border border-warning/20 rounded text-xs text-warning font-medium flex gap-2 items-center">
                    <AlertTriangle className="h-3 w-3" />
                    Atenção: Limite próximo!
                  </div>
                )}
                
                {!item.isIlimitado && item.usados >= item.limite && (
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
