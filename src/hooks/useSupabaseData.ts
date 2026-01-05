export const useCreateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newSale: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. GARANTIR QUE A QUANTIDADE SEJA NEGATIVA
      const quantidadeNegativa = -1 * Math.abs(parseInt(newSale.quantidade));

      // A. Salva a Transação (Estoque)
      const transactionData = {
        user_id: user?.id,
        program_id: newSale.programaId,
        account_id: newSale.contaId,
        type: 'VENDA',
        quantity: quantidadeNegativa,
        total_cost: parseFloat(newSale.valorTotal),
        transaction_date: newSale.dataVenda,
        description: `Venda Milhas - ${newSale.passageiros?.length || 0} Passageiros`, 
        notes: `${newSale.observacoes || ''}`, 
      };

      const { data: transaction, error: transError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (transError) throw transError;

      // 2. SALVAR OS PASSAGEIROS
      if (newSale.passageiros && newSale.passageiros.length > 0) {
          const passageirosParaSalvar = newSale.passageiros.map((p: any) => ({
              user_id: user?.id,
              transaction_id: transaction.id, 
              name: p.nome,
              cpf: p.cpf
          }));

          const { error: passError } = await supabase
              .from('passengers')
              .insert(passageirosParaSalvar);
          
          if (passError) console.error("Erro ao salvar passageiros:", passError);
      }

      // 3. INTEGRAÇÃO FINANCEIRA
      // Só cria se o valor for maior que 0
      if (parseFloat(newSale.valorTotal) > 0) {
        
        const receivableData = {
          user_id: user?.id,
          description: `Venda de Milhas - Transação #${transaction.id.slice(0, 8)}`, 
          total_amount: parseFloat(newSale.valorTotal),
        };

        const { data: receivable, error: recError } = await supabase
          .from('receivables')
          .insert(receivableData)
          .select()
          .single();

        if (recError) {
            toast.error("Erro ao gerar financeiro.");
        } else {
            // C. Criar as Parcelas usando a DATA DE RECEBIMENTO ESCOLHIDA
            const numParcelas = newSale.parcelas || 1;
            const valorParcela = parseFloat(newSale.valorTotal) / numParcelas;
            const installments = [];

            for (let i = 0; i < numParcelas; i++) {
                // Usa a dataRecebimento vinda do formulário
                const dataVencimento = new Date(newSale.dataRecebimento);
                // Soma meses APENAS se for a parcela 2 em diante (i > 0)
                // Se i=0 (1ª parcela), usa a data exata que o usuário colocou
                if (i > 0) {
                    dataVencimento.setMonth(dataVencimento.getMonth() + i); 
                }

                installments.push({
                    user_id: user?.id,
                    receivable_id: receivable.id,
                    installment_number: i + 1,
                    amount: valorParcela,
                    due_date: dataVencimento.toISOString().split('T')[0],
                    status: 'PENDENTE'
                });
            }

            await supabase.from('receivable_installments').insert(installments);
        }
      }

      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['miles_balance'] });
      queryClient.invalidateQueries({ queryKey: ['receivable_installments'] });
      queryClient.invalidateQueries({ queryKey: ['passengers'] });
      queryClient.invalidateQueries({ queryKey: ['passengers_with_transactions'] }); // Importante para o Limites CPF
      toast.success('Venda registrada com sucesso!');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`)
  });
};
