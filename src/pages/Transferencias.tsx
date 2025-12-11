import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRightLeft, Calculator, TrendingUp } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/utils/financeLogic';
import { toast } from 'sonner';
import { format } from 'date-fns';

const Transferencias = () => {
  const { contas, programas, milesBalance, addCompra, addVenda } = useData(); // Vamos usar addCompra/Venda como base ou criar lógica direta

  // Estados do Formulário
  const [contaId, setContaId] = useState("");
  const [origemId, setOrigemId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [bonus, setBonus] = useState("0");
  const [dataTransf, setDataTransf] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [custoPersonalizado, setCustoPersonalizado] = useState(""); // Opcional: Para definir custo zero ou específico

  // Cálculos em tempo real
  const qtdOrigem = Number(quantidade) || 0;
  const percBonus = Number(bonus) || 0;
  const qtdDestino = qtdOrigem + (qtdOrigem * (percBonus / 100));

  // Achar CPM da Origem para transferir o custo
  const saldoOrigem = milesBalance?.find(m => m.account_id === contaId && m.program_id === origemId);
  const cpmOrigem = saldoOrigem?.avg_cpm || 0;
  const custoTotalOrigem = (qtdOrigem / 1000) * cpmOrigem;
  
  // O custo no destino será o mesmo valor total da origem (você não gastou mais dinheiro, só mudou de lugar)
  // Mas a quantidade aumentou, então o CPM vai diminuir (diluição).
  const cpmDestino = qtdDestino > 0 ? (custoTotalOrigem / qtdDestino) * 1000 : 0;

  const handleTransferir = async () => {
    if (!contaId || !origemId || !destinoId || !quantidade) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      // 1. Saída da Origem (Registro como TRANSF_SAIDA)
      // Usamos a lógica de 'Venda' ou 'Transação Negativa'
      // Precisamos adaptar o DataContext para aceitar o tipo específico ou chamar a API direto.
      // Vou assumir que você vai adicionar suporte a esses tipos no DataContext ou usaremos o hook direto.
      // *SIMPLIFICAÇÃO*: Vamos chamar transaction direto aqui se possível, ou usar os helpers.
      
      // Como o DataContext atual abstrai, vou sugerir usar uma função dedicada se você tiver, 
      // mas aqui vou simular usando addCompra/Venda com flags ou chamando a API customizada.
      
      // MELHOR CAMINHO: Usar os hooks do Supabase direto aqui para ter controle total dos tipos
      // (Mas para manter consistência com seu projeto, vou descrever a lógica de negócio):
      
      /*
        Lógica de Banco de Dados:
        Transaction 1: Type='TRANSF_SAIDA', Qty = -qtdOrigem, Total = 0 (ou custo proporcional negativo se quiser abater financeiro, mas geralmente só zeramos quantidade)
        Transaction 2: Type='TRANSF_ENTRADA', Qty = +qtdDestino, Total = custoTotalOrigem (carrega o custo)
      */
     
      // Para funcionar AGORA com o que você tem, você precisará expor 'createTransaction' no DataContext 
      // ou importar 'useCreateTransaction' aqui. Vou usar os hooks do useSupabaseData que vi no seu Modal.
      toast.info("Funcionalidade precisa ser conectada ao Backend (Ver instrução abaixo)");
      
    } catch (error) {
      toast.error("Erro na transferência");
    }
  };

  // Precisamos importar o hook real para funcionar
  const { useCreateTransaction } = require('@/hooks/useSupabaseData'); 
  const createTransaction = useCreateTransaction();

  const handleSalvarReal = async () => {
     if (!contaId || !origemId || !destinoId || !quantidade) return;
     
     // 1. SAÍDA
     await createTransaction.mutateAsync({
        account_id: contaId,
        program_id: origemId,
        type: 'TRANSF_SAIDA',
        quantity: -qtdOrigem,
        total_cost: 0, // Sai a custo zero para não bagunçar o "Lucro", ou pode retirar o valor do investimento. 
        // *Recomendação Contábil*: Se você transfere, o valor $$ sai de um pote e vai pro outro.
        // Então na saída, o custo é 0 (apenas baixa de estoque), e na entrada carregamos o custo.
        transaction_date: dataTransf,
        notes: `Transferência para ${programas.find(p=>p.id===destinoId)?.nome}`
     });

     // 2. ENTRADA (Com Bônus)
     await createTransaction.mutateAsync({
        account_id: contaId,
        program_id: destinoId,
        type: 'TRANSF_ENTRADA',
        quantity: qtdDestino,
        total_cost: custoTotalOrigem, // AQUI ESTÁ O SEGREDO: O custo viaja junto!
        transaction_date: dataTransf,
        notes: `Transferência de ${programas.find(p=>p.id===origemId)?.nome} com ${bonus}% bônus`
     });

     toast.success("Transferência realizada com sucesso!");
     // Limpar form...
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
                <p className="text-xs text-muted-foreground">Saldo: {formatNumber(saldoOrigem?.balance || 0)}</p>
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

        <Card className="bg-muted/10 border-dashed">
          <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5"/> Simulação</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground">Vai sair da Origem:</p>
              <p className="text-2xl font-bold text-destructive">-{formatNumber(qtdOrigem)}</p>
              <p className="text-xs text-muted-foreground">Custo Histórico: {formatCurrency(custoTotalOrigem)}</p>
            </div>
            
            <div className="relative">
               <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-dashed" /></div>
               <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Transformação</span></div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Vai entrar no Destino:</p>
              <p className="text-3xl font-bold text-success">+{formatNumber(qtdDestino)}</p>
              <p className="text-xs text-muted-foreground">Custo Herdado: {formatCurrency(custoTotalOrigem)}</p>
            </div>

            <div className="p-4 bg-background rounded-lg border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Novo CPM (Destino)</span>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-primary">{formatCurrency(cpmDestino/1000 * 1000)} <span className="text-xs font-normal text-muted-foreground">/milheiro</span></div>
              <p className="text-xs text-muted-foreground mt-1">O custo do milheiro caiu devido ao bônus.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Transferencias;
