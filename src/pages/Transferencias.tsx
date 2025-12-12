import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccounts, usePrograms } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowRightLeft, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const Transferencias = () => {
  // Dados do Banco
  const { data: accounts } = useAccounts();
  const { data: programs } = usePrograms();

  // Estados do Formulário
  const [sourceAccount, setSourceAccount] = useState('');
  const [destProgram, setDestProgram] = useState('');
  const [destAccount, setDestAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [bonusPercent, setBonusPercent] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Estado de Carregamento (TRAVA O BOTÃO)
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validações
    if (!sourceAccount || !destProgram || !destAccount || !amount || !date) {
        toast.error('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    if (parseFloat(amount) <= 0) {
        toast.error('A quantidade deve ser maior que zero.');
        return;
    }

    // 2. Trava o botão para não clicar 2 vezes
    setIsSubmitting(true);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não logado');

        // 3. Chama a função BLINDADA no banco
        const { error } = await supabase.rpc('perform_transfer', {
            p_user_id: user.id,
            p_source_account_id: sourceAccount,
            p_program_id: destProgram,
            p_dest_account_id: destAccount,
            p_amount: parseFloat(amount),
            p_bonus_percent: parseFloat(bonusPercent || '0'),
            p_date: date,
            p_cost_per_thousand: 0 // Se você tiver lógica de custo médio, insira aqui
        });

        if (error) throw error;

        // 4. Sucesso
        toast.success('Transferência realizada com sucesso!');
        
        // Limpa o formulário
        setAmount('');
        setBonusPercent('');
        // Opcional: Limpar seleções
        // setDestProgram('');
        
    } catch (error: any) {
        console.error(error);
        toast.error('Erro ao realizar transferência: ' + error.message);
    } finally {
        // 5. Destrava o botão (seja sucesso ou erro)
        setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <PageHeader 
        title="Transferência de Pontos" 
        description="Envie pontos entre contas (Bonificadas)"
      />

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Nova Transferência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTransfer} className="space-y-6">
              
              {/* ORIGEM */}
              <div className="space-y-2 p-4 bg-muted/30 rounded-lg border">
                <Label className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Origem (Sai de)</Label>
                <Select value={sourceAccount} onValueChange={setSourceAccount}>
                  <SelectTrigger><SelectValue placeholder="Selecione a conta de origem" /></SelectTrigger>
                  <SelectContent>
                    {accounts?.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* DESTINO */}
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                <Label className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Destino (Vai para)</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Programa de Destino</Label>
                    <Select value={destProgram} onValueChange={setDestProgram}>
                      <SelectTrigger><SelectValue placeholder="Ex: Latam Pass" /></SelectTrigger>
                      <SelectContent>
                        {programs?.map(prog => (
                          <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Conta de Destino (CPF)</Label>
                    <Select value={destAccount} onValueChange={setDestAccount}>
                      <SelectTrigger><SelectValue placeholder="Selecione o titular" /></SelectTrigger>
                      <SelectContent>
                        {accounts?.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* VALORES E DATAS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade de Pontos (Saindo)</Label>
                  <Input 
                    type="number" 
                    placeholder="Ex: 10000" 
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bônus (%)</Label>
                  <Input 
                    type="number" 
                    placeholder="Ex: 30" 
                    value={bonusPercent}
                    onChange={e => setBonusPercent(e.target.value)}
                  />
                  {amount && bonusPercent && (
                    <p className="text-xs text-muted-foreground text-right">
                      Total a receber: <strong>{(parseFloat(amount) * (1 + parseFloat(bonusPercent)/100)).toLocaleString('pt-BR')}</strong>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data da Transferência</Label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="date" 
                      className="pl-9"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                    />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                    <div className="flex items-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Processando...
                    </div>
                ) : (
                    'Confirmar Transferência'
                )}
              </Button>

            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Transferencias;
