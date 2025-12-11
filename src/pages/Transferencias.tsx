import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRightLeft, Calculator, TrendingUp } from 'lucide-react';
import { formatCurrency, formatNumber, formatCPM } from '@/utils/financeLogic';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCreateTransaction } from '@/hooks/useSupabaseData';

const Transferencias = () => {
  const { contas, programas, milesBalance } = useData();
  const createTransaction = useCreateTransaction();

  // Estados do Formulário
  const [contaId, setContaId] = useState("");
  const [origemId, setOrigemId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [bonus, setBonus] = useState("0");
  const [dataTransf, setDataTransf] = useState(format(new Date(), 'yyyy-MM-dd'));

  // 1. Busca os dados de saldo da origem selecionada
  const dadosOrigem = useMemo(() => {
    if (!contaId || !origemId || !milesBalance) return { saldo: 0, cpm: 0 };
    const saldo = milesBalance.find(m => m.account_id === contaId && m.program_id === origemId);
    return {
      saldo: saldo?.balance || 0,
      cpm: saldo?.avg_cpm || 0
    };
  }, [contaId, origemId, milesBalance]);

  // 2. Cálculos da Simulação
  const simulacao = useMemo(() => {
    const qtdSaida = Number(quantidade) || 0;
    const percBonus = Number(bonus) || 0;
    
    // Custo proporcional que vai sair da origem
    // (Qtd Saida / 1000) * CPM Origem
    const custoTransferido = (qtdSaida / 1000) * dadosOrigem.cpm;

    // Quantidade que vai entrar no destino
    const qtdEntrada = qtdSaida + (qtdSaida * (percBonus / 100));

    // Novo CPM no Destino (Custo Transferido / Qtd Entrada * 1000)
    const novoCpm = qtdEntrada > 0 ? (custoTransferido / qtdEntrada) * 1000 : 0;

    return {
      qtdSaida,
      qtdEntrada,
      custoTransferido,
      novoCpm
    };
  }, [quantidade, bonus, dadosOrigem]);

  const handleSalvarReal = async () => {
     if (!contaId || !origemId || !destinoId || !quantidade) {
        toast.error("Preencha todos os dados");
        return;
     }
     
     if (simulacao.qtdSaida > dadosOrigem.saldo) {
        toast.error(`Saldo insuficiente na origem (Disponível: ${formatNumber(dadosOrigem.saldo)})`);
        return;
     }

     try {
       // 1. SAÍDA
       await createTransaction.mutateAsync({
          account_id: contaId,
          program_id: origemId,
          type: 'TRANSF_SAIDA',
          quantity: -simulacao.qtdSaida,
          total_cost: 0, // Sai apenas a quantidade, o financeiro "zera" nessa ponta contabilmente ou reduz proporcional (decisão contábil)
          // *Melhoria*: Para abater do "Investido" da origem e jogar no destino, deveríamos lançar custo negativo aqui.
          // Mas para simplificar e não dar erro de saldo negativo, vamos manter 0 na saída e carregar o custo na entrada.
          sale_price: 0,
          transaction_date: dataTransf,
          notes: `Transferência para ${programas.find(p=>p.id===destinoId)?.nome}`
       });

       // 2. ENTRADA (Com Bônus e Custo)
       await createTransaction.mutateAsync({
          account_id: contaId,
          program_id: destinoId,
          type: 'TRANSF_ENTRADA',
          quantity: simulacao.qtdEntrada,
          total_cost: simulacao.custoTransferido, // Aqui o custo "renasce" no novo programa
          sale_price: 0,
          transaction_date: dataTransf,
          notes: `Transferência de ${programas.find(p=>p.id===origemId)?.nome} com ${bonus}% bônus`
       });

       toast.success("Transferência realizada com sucesso!");
       setQuantidade("");
       setBonus("0");
     } catch (error) {
        toast.error("Erro ao realizar transferência");
     }
  };

  return (
    <MainLayout>
      <PageHeader title="Transferência de Pontos" description="Transfira pontos entre programas com cálculo de bônus" />
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Dados da Transferência</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Conta (CPF)</Label>
              <Select value={contaId} onValueChange={setContaId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>De (Origem)</Label>
                <Select value={origemId} onValueChange={setOrigemId}>
                  <SelectTrigger><SelectValue placeholder="Programa" /></SelectTrigger>
                  <SelectContent>{programas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Disponível: {formatNumber(dadosOrigem.saldo)} | CPM: {formatCPM(dadosOrigem.cpm)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Para (Destino)</Label>
                <Select value={destinoId} onValueChange={setDestinoId}>
                  <SelectTrigger><SelectValue placeholder="Programa" /></SelectTrigger>
                  <SelectContent>{programas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade a Transferir</Label>
                <Input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bônus (%)</Label>
                <Input type="number" value={bonus} onChange={e => setBonus(e.target.value)} placeholder="Ex: 100" />
              </div>
            </div>
            
            <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={dataTransf} onChange={e => setDataTransf(e.target.value)} />
            </div>

            <Button className="w-full" onClick={handleSalvarReal}>
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Registrar Transferência
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-muted/10 border-dashed h-fit">
          <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5"/> Simulação</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center p-3 bg-background rounded border">
              <div>
                <p className="text-sm text-muted-foreground">Vai sair da Origem</p>
                <p className="text-xl font-bold text-destructive">-{formatNumber(simulacao.qtdSaida)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Custo total migrado</p>
                <p className="text-sm font-medium">{formatCurrency(simulacao.custoTransferido)}</p>
              </div>
            </div>
            
            <div className="relative flex items-center justify-center">
               <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-dashed" /></div>
               <span className="relative bg-background px-3 text-xs text-muted-foreground uppercase border rounded-full py-1">
                 Bônus de {bonus}%
               </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-background rounded border border-success/30">
              <div>
                <p className="text-sm text-muted-foreground">Vai entrar no Destino</p>
                <p className="text-2xl font-bold text-success">+{formatNumber(simulacao.qtdEntrada)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Valor mantido</p>
                <p className="text-sm font-medium text-success">{formatCurrency(simulacao.custoTransferido)}</p>
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Novo CPM (Destino)
                </span>
              </div>
              <div className="text-3xl font-bold text-primary">
                {formatCPM(simulacao.novoCpm)} 
                <span className="text-sm font-normal text-muted-foreground ml-1">/milheiro</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Seu CPM na origem era {formatCPM(dadosOrigem.cpm)}. Com o bônus, o custo por milheiro caiu.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Transferencias;
