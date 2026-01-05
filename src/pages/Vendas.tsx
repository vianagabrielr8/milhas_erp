import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, User, UserPlus, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Importando os Hooks diretos do Supabase (A Correção)
import { usePrograms, useAccounts, useSales, useCreateSale, useDeleteSale } from '@/hooks/useSupabaseData';

interface PassageiroVenda {
    id: string;
    nome: string;
    cpf: string;
}

const Vendas = () => {
    // 1. Substituímos o useData pelos hooks individuais
    const { data: vendas = [], isLoading } = useSales();
    const { data: programas = [] } = usePrograms();
    const { data: contas = [] } = useAccounts();
    
    // Hooks de ação (Criar e Deletar)
    const createSaleMutation = useCreateSale();
    const deleteSaleMutation = useDeleteSale();

    const [isOpen, setIsOpen] = useState(false);
    const [editingVenda, setEditingVenda] = useState<any | null>(null);
    
    const [parcelas, setParcelas] = useState(1);
    const [passageirosVenda, setPassageirosVenda] = useState<PassageiroVenda[]>([]);
    const [novoPassageiro, setNovoPassageiro] = useState({ nome: '', cpf: '' });

    const [formData, setFormData] = useState({
        programaId: '',
        contaId: '',
        quantidade: '',
        valorUnitario: '',
        dataVenda: format(new Date(), 'yyyy-MM-dd'),
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
            status: 'pendente',
            observacoes: '',
        });
        setEditingVenda(null);
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
        const valorUnitario = parseFloat(formData.valorUnitario);
        const valorTotal = (quantidade / 1000) * valorUnitario;

        const vendaData = {
            programaId: formData.programaId,
            contaId: formData.contaId,
            quantidade,
            valorUnitario,
            valorTotal,
            dataVenda: formData.dataVenda,
            status: formData.status,
            observacoes: formData.observacoes,
            passageiros: passageirosVenda,
            // NOVO: Enviando dados do parcelamento para gerar o financeiro
            parcelas: parcelas, 
        };

        if (editingVenda) {
            toast.info("Edição ainda não implementada no backend");
        } else {
            createSaleMutation.mutate(vendaData, {
                onSuccess: () => {
                    setIsOpen(false);
                    resetForm();
                }
            });
        }
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
            render: (venda: any) => format(new Date(venda.date || venda.created_at), 'dd/MM/yyyy'),
        },
        {
            key: 'programaId',
            header: 'Programa',
            // Busca o nome do programa na lista carregada
            render: (venda: any) => programas.find(p => p.id === venda.program_id)?.name || '-',
        },
        {
            key: 'contaId',
            header: 'Conta',
            // Busca o nome da conta na lista carregada
            render: (venda: any) => contas.find(c => c.id === venda.account_id)?.name || '-',
        },
        {
            key: 'quantidade',
            header: 'Qtd. Milhas',
            render: (venda: any) => venda.quantity?.toLocaleString('pt-BR'),
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
                                <DialogTitle>{editingVenda ? 'Editar Venda' : 'Nova Venda'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                
                                {/* BLOCO 1: CONTA E PROGRAMA */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Programa</Label>
                                        <Select
                                            value={formData.programaId}
                                            onValueChange={(value) => setFormData({ ...formData, programaId: value })}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                            <SelectContent>
                                                {/* Agora iteramos sobre 'programas' vindo do Supabase */}
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
                                
                                {/* BLOCO 2: PASSAGEIROS */}
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


                                {/* BLOCO 3: QUANTIDADE E VALOR */}
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
                                            type="number"
                                            step="0.01"
                                            value={formData.valorUnitario}
                                            onChange={(e) => setFormData({ ...formData, valorUnitario: e.target.value })}
                                            placeholder="20.00"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* BLOCO 4: DATA E STATUS */}
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
                                </div>

                                {/* BLOCO 5: PARCELAMENTO (Visual apenas por enquanto) */}
                                {formData.status === 'pendente' && !editingVenda && (
                                    <div className="space-y-2 border-t pt-4 bg-muted/20 p-3 rounded-lg">
                                        <Label className="text-primary font-medium">Parcelamento (Visual)</Label>
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
                                        </div>
                                    </div>
                                )}
                                
                                {/* BLOCO 6: OBSERVAÇÕES */}
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
