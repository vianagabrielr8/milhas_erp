import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, User, UserPlus, X, CalendarIcon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { usePrograms, useAccounts, useSales, useCreateSale, useDeleteSale } from '@/hooks/useSupabaseData';

interface PassageiroVenda {
    id: string;
    nome: string;
    cpf: string;
}

const Vendas = () => {
    const { data: vendas = [], isLoading } = useSales();
    const { data: programas = [] } = usePrograms();
    const { data: contas = [] } = useAccounts();
    
    const createSaleMutation = useCreateSale();
    const deleteSaleMutation = useDeleteSale();

    const [isOpen, setIsOpen] = useState(false);
    const [parcelas, setParcelas] = useState(1);
    const [passageirosVenda, setPassageirosVenda] = useState<PassageiroVenda[]>([]);
    const [novoPassageiro, setNovoPassageiro] = useState({ nome: '', cpf: '' });

    const [formData, setFormData] = useState({
        programaId: '',
        contaId: '',
        quantidade: '',
        valorUnitario: '',
        dataVenda: format(new Date(), 'yyyy-MM-dd'),
        dataRecebimento: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        status: 'pendente' as 'pendente' | 'recebido',
        observacoes: '',
    });

    const resetForm = () => {
        setFormData({
            programaId: '',
            contaId: '',
            quantidade: '',
            valorUnitario: '',
            dataVenda: format(new Date(), 'yyyy-MM-dd'),
            dataRecebimento: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
            status: 'pendente',
            observacoes: '',
        });
        setParcelas(1);
        setPassageirosVenda([]);
        setNovoPassageiro({ nome: '', cpf: '' });
    };

    const handleAddPassageiro = () => {
        if (!novoPassageiro.nome.trim() || !novoPassageiro.cpf.trim()) {
            toast.error('Nome e CPF do passageiro são obrigatórios.');
            return;
        }
        const newId = Date.now().toString();
        setPassageirosVenda([...passageirosVenda, { ...novoPassageiro, id: newId }]);
        setNovoPassageiro({ nome: '', cpf: '' });
    };

    const handleRemovePassageiro = (id: string) => {
        setPassageirosVenda(passageirosVenda.filter(p => p.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (passageirosVenda.length === 0) {
            toast.error('É obrigatório adicionar ao menos um passageiro.');
            return;
        }

        const quantidade = parseInt(formData.quantidade);
        
        // CORREÇÃO CRÍTICA: Troca vírgula por ponto ANTES de converter
        const valUnitString = formData.valorUnitario.toString().replace(',', '.');
        const valorUnitario = parseFloat(valUnitString);
        
        const valorTotal = (quantidade / 1000) * valorUnitario;

        if (isNaN(valorTotal) || valorTotal <= 0) {
             if(!confirm("O valor total da venda parece zerado. Deseja continuar mesmo assim?")) return;
        }

        const vendaData = {
            programaId: formData.programaId,
            contaId: formData.contaId,
            quantidade,
            valorUnitario, // Salva o valor corrigido
            valorTotal,    // Salva o total calculado
            dataVenda: formData.dataVenda,
            dataRecebimento: formData.dataRecebimento,
            status: formData.status,
            observacoes: formData.observacoes,
            passageiros: passageirosVenda, 
            parcelas: parcelas, 
        };

        createSaleMutation.mutate(vendaData, {
            onSuccess: () => {
                setIsOpen(false);
                resetForm();
            }
        });
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta venda?')) {
            deleteSaleMutation.mutate(id);
        }
    };

    const columns = [
        {
            key: 'dataVenda',
            header: 'Data',
            render: (venda: any) => format(new Date(venda.transaction_date || venda.created_at), 'dd/MM/yyyy'),
        },
        {
            key: 'programaId',
            header: 'Programa',
            render: (venda: any) => programas.find(p => p.id === venda.program_id)?.name || '-',
        },
        {
            key: 'contaId',
            header: 'Conta',
            render: (venda: any) => contas.find(c => c.id === venda.account_id)?.name || '-',
        },
        {
            key: 'passageiros',
            header: 'Passageiros',
            render: (venda: any) => {
                if (venda.description && venda.description.includes('Passageiros')) {
                     return <span className="text-xs text-muted-foreground">{venda.description}</span>
                }
                return <span className="text-xs text-muted-foreground">-</span>;
            },
        },
        {
            key: 'quantidade',
            header: 'Qtd. Milhas',
            render: (venda: any) => Math.abs(venda.quantity)?.toLocaleString('pt-BR'),
        },
        {
            key: 'valorTotal',
            header: 'Valor Total',
            render: (venda: any) =>
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.total_cost || 0),
        },
        {
            key: 'actions',
            header: 'Ações',
            render: (venda: any) => (
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(venda.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <MainLayout>
            <PageHeader
                title="Vendas"
                description="Gerencie suas vendas de milhas"
                action={
                    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button className="gradient-primary">
                                <Plus className="h-4 w-4 mr-2" />
                                Nova Venda
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Nova Venda</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Programa</Label>
                                        <Select
                                            value={formData.programaId}
                                            onValueChange={(value) => setFormData({ ...formData, programaId: value })}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                            <SelectContent>
                                                {programas?.map((programa: any) => (
                                                    <SelectItem key={programa.id} value={programa.id}>
                                                        {programa.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Conta</Label>
                                        <Select
                                            value={formData.contaId}
                                            onValueChange={(value) => setFormData({ ...formData, contaId: value })}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                            <SelectContent>
                                                {contas?.map((conta: any) => (
                                                    <SelectItem key={conta.id} value={conta.id}>
                                                        {conta.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                
                                {/* Passageiros */}
                                <div className="space-y-3 p-4 border rounded-lg bg-muted/10">
                                    <Label className="text-base font-semibold flex items-center gap-2">
                                        <User className="h-4 w-4" /> Cadastro de Passageiros
                                    </Label>
                                    
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="col-span-1 space-y-1">
                                            <Label className="text-xs">CPF</Label>
                                            <Input
                                                type="text"
                                                value={novoPassageiro.cpf}
                                                onChange={(e) => setNovoPassageiro({ ...novoPassageiro, cpf: e.target.value })}
                                                placeholder="000.000.000-00"
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-xs">Nome Completo</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="text"
                                                    value={novoPassageiro.nome}
                                                    onChange={(e) => setNovoPassageiro({ ...novoPassageiro, nome: e.target.value })}
                                                    placeholder="Nome do Passageiro"
                                                />
                                                <Button type="button" size="icon" onClick={handleAddPassageiro} className="h-10 w-10">
                                                    <UserPlus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="max-h-28 overflow-y-auto space-y-1 mt-2">
                                        {passageirosVenda.length === 0 ? (
                                            <p className="text-xs text-muted-foreground pt-1">Adicione o(s) CPF(s) que consumirá(ão) a cota.</p>
                                        ) : (
                                            passageirosVenda.map(p => (
                                                <div key={p.id} className="flex justify-between items-center bg-background p-2 rounded text-sm border">
                                                    <span className="font-medium truncate">{p.nome}</span>
                                                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                        <span>{p.cpf}</span>
                                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemovePassageiro(p.id)}>
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Quantidade de Milhas</Label>
                                        <Input
                                            type="number"
                                            value={formData.quantidade}
                                            onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                                            placeholder="10000"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Valor Unitário (R$/1000)</Label>
                                        <Input
                                            type="text"
                                            value={formData.valorUnitario}
                                            onChange={(e) => setFormData({ ...formData, valorUnitario: e.target.value })}
                                            placeholder="20,50"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* DATAS: VENDA E RECEBIMENTO */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Data da Venda</Label>
                                        <Input
                                            type="date"
                                            value={formData.dataVenda}
                                            onChange={(e) => setFormData({ ...formData, dataVenda: e.target.value })}
                                            required
                                        />
                                    </div>
                                    {/* CAMPO NOVO: DATA DE RECEBIMENTO */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-emerald-500 font-medium">
                                            <CalendarIcon className="h-4 w-4" />
                                            Recebimento (1ª Parc)
                                        </Label>
                                        <Input
                                            type="date"
                                            value={formData.dataRecebimento}
                                            onChange={(e) => setFormData({ ...formData, dataRecebimento: e.target.value })}
                                            required
                                            className="border-emerald-500/30 focus-visible:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                {/* Parcelamento */}
                                {formData.status === 'pendente' && (
                                    <div className="space-y-2 border-t pt-4 bg-muted/20 p-3 rounded-lg">
                                        <Label className="text-primary font-medium">Parcelamento</Label>
                                        <div className="flex gap-4 items-start">
                                            <div className="w-1/3 space-y-2">
                                                <Label className="text-xs text-muted-foreground">Qtd Parcelas</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max="24"
                                                    value={parcelas}
                                                    onChange={(e) => setParcelas(Number(e.target.value))}
                                                />
                                            </div>
                                            
                                            {/* Previsão Visual */}
                                            <div className="flex-1 text-sm text-muted-foreground bg-muted/50 p-3 rounded border">
                                                <p className="font-medium mb-2 text-xs uppercase tracking-wide">Previsão</p>
                                                <div className="max-h-32 overflow-y-auto text-xs space-y-2 pr-1 custom-scrollbar">
                                                    {Array.from({ length: Math.max(1, parcelas) }).map((_, i) => {
                                                        const dataBase = formData.dataRecebimento ? new Date(formData.dataRecebimento) : new Date();
                                                        // Ajuste de timezone visual
                                                        const dataPrevista = new Date(dataBase.valueOf() + dataBase.getTimezoneOffset() * 60000);
                                                        
                                                        if (i > 0) dataPrevista.setMonth(dataPrevista.getMonth() + i);
                                                        
                                                        const qtd = parseInt(formData.quantidade) || 0;
                                                        const valUnitString = formData.valorUnitario.toString().replace(',', '.');
                                                        const valUnit = parseFloat(valUnitString) || 0;
                                                        const total = (qtd/1000) * valUnit;
                                                        const valorParc = total / (parcelas || 1);
                                                        
                                                        return (
                                                            <div key={i} className="flex justify-between items-center border-b border-border/50 pb-1 last:border-0 last:pb-0">
                                                                <span className="font-medium">{i + 1}ª Parc: {dataPrevista.toLocaleDateString('pt-BR')}</span>
                                                                <span className="text-primary">{valorParc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="space-y-2">
                                    <Label>Observações</Label>
                                    <Input
                                        value={formData.observacoes}
                                        onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                        placeholder="Observações (opcional)"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" className="gradient-primary" disabled={createSaleMutation.isPending}>
                                        {createSaleMutation.isPending ? 'Salvando...' : 'Registrar'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                }
            />

            <DataTable
                data={vendas}
                columns={columns}
                emptyMessage={isLoading ? "Carregando vendas..." : "Nenhuma venda registrada."}
            />
        </MainLayout>
    );
};

export default Vendas;
