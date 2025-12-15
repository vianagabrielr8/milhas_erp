import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext'; // Assumindo que este hook usa usePassageiros agora
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, User, UserPlus, X } from 'lucide-react'; // Adicionado UserPlus e X
import { Venda } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

// NOVO TIPO: Passageiro
interface PassageiroVenda {
    id: string; // Gerado no front-end para o formulário
    nome: string;
    cpf: string;
}

const Vendas = () => {
    // ATENÇÃO: Se o hook do DataContext não tiver sido alterado para usar usePassageiros, 
    // a variável 'clientes' aqui vai estar vazia.
    const {
        vendas,
        programas,
        contas,
        addVenda,
        updateVenda,
        deleteVenda,
    } = useData(); // Removido 'clientes' do useData

    const [isOpen, setIsOpen] = useState(false);
    const [editingVenda, setEditingVenda] = useState<Venda | null>(null);
    
    // NOVO: Estado para parcelas
    const [parcelas, setParcelas] = useState(1);

    // NOVO: Estado para lista de passageiros
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

    // --- Lógica de Adicionar/Remover Passageiro ---
    const handleAddPassageiro = () => {
        if (!novoPassageiro.nome.trim() || !novoPassageiro.cpf.trim()) {
            toast.error('Nome e CPF do passageiro são obrigatórios.');
            return;
        }

        const newId = Date.now().toString(); // ID temporário
        setPassageirosVenda([...passageirosVenda, { ...novoPassageiro, id: newId }]);
        setNovoPassageiro({ nome: '', cpf: '' });
    };

    const handleRemovePassageiro = (id: string) => {
        setPassageirosVenda(passageirosVenda.filter(p => p.id !== id));
    };
    // ---------------------------------------------


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (passageirosVenda.length === 0) {
            toast.error('É obrigatório adicionar ao menos um passageiro.');
            return;
        }

        const quantidade = parseInt(formData.quantidade);
        const valorUnitario = parseFloat(formData.valorUnitario);
        const valorTotal = quantidade * valorUnitario;

        // NOVO: Prepara os dados do passageiro para salvar junto com a venda
        const passageirosData = passageirosVenda.map(p => ({ nome: p.nome, cpf: p.cpf }));

        const vendaData = {
            programaId: formData.programaId,
            contaId: formData.contaId,
            // REMOVIDO: clienteId (antigo)
            quantidade,
            valorUnitario,
            valorTotal,
            dataVenda: new Date(formData.dataVenda),
            status: formData.status,
            observacoes: formData.observacoes,
            // NOVO: Adiciona a lista de passageiros
            passageiros: passageirosData, 
        };

        if (editingVenda) {
            // ATENÇÃO: updateVenda precisará ser adaptado para lidar com a nova estrutura de dados (passageiros)
            // Aqui mantemos o básico, mas a lógica de edição no contexto precisa ser revista.
            updateVenda(editingVenda.id, vendaData);
            toast.success('Venda atualizada com sucesso!');
        } else {
            // ATUALIZADO: Passando o número de parcelas e os passageiros para o contexto
            addVenda(vendaData, parcelas);
            toast.success('Venda registrada com sucesso!');
        }

        setIsOpen(false);
        resetForm();
    };

    const handleEdit = (venda: Venda) => {
        setEditingVenda(venda);
        setFormData({
            programaId: venda.programaId,
            contaId: venda.contaId,
            quantidade: venda.quantidade.toString(),
            valorUnitario: venda.valorUnitario.toString(),
            dataVenda: format(new Date(venda.dataVenda), 'yyyy-MM-dd'),
            status: venda.status,
            observacoes: venda.observacoes || '',
        });
        
        // NOVO: Carregar passageiros existentes (assumindo que estão em venda.passageiros)
        const existingPassageiros = (venda as any).passageiros || [];
        setPassageirosVenda(existingPassageiros.map((p: any) => ({
             id: Date.now().toString() + Math.random(), 
             nome: p.nome, 
             cpf: p.cpf 
        })));

        // ATENÇÃO: Se a venda editada tiver parcelas, o estado 'parcelas' deve ser carregado daqui.
        // setParcelas((venda as any).numParcelas || 1); 

        setIsOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta venda?')) {
            deleteVenda(id);
            toast.success('Venda excluída com sucesso!');
        }
    };

    const columns = [
        {
            key: 'dataVenda',
            header: 'Data',
            render: (venda: Venda) => format(new Date(venda.dataVenda), 'dd/MM/yyyy'),
        },
        {
            key: 'programaId',
            header: 'Programa',
            render: (venda: Venda) => programas.find(p => p.id === venda.programaId)?.nome || '-',
        },
        {
            key: 'contaId',
            header: 'Conta',
            render: (venda: Venda) => contas.find(c => c.id === venda.contaId)?.nome || '-',
        },
        {
            key: 'passageiros',
            header: 'Passageiros',
            // Renderiza o primeiro passageiro + contagem
            render: (venda: Venda) => {
                const passageiros: PassageiroVenda[] = (venda as any).passageiros || [];
                if (passageiros.length === 0) return '-';
                return (
                    <div className="flex flex-col text-sm">
                        <span>{passageiros[0].nome}</span>
                        {passageiros.length > 1 && (
                            <span className="text-xs text-muted-foreground">
                                + {passageiros.length - 1} {passageiros.length === 2 ? 'outro' : 'outros'}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'quantidade',
            header: 'Qtd. Milhas',
            render: (venda: Venda) => venda.quantidade.toLocaleString('pt-BR'),
        },
        {
            key: 'valorTotal',
            header: 'Valor Total',
            render: (venda: Venda) =>
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.valorTotal),
        },
        {
            key: 'status',
            header: 'Status',
            render: (venda: Venda) => <StatusBadge status={venda.status} />,
        },
        {
            key: 'actions',
            header: 'Ações',
            render: (venda: Venda) => (
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(venda)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
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
                                
                                {/* -------------------- BLOCO 1: CONTA E PROGRAMA -------------------- */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Programa</Label>
                                        <Select
                                            value={formData.programaId}
                                            onValueChange={(value) => setFormData({ ...formData, programaId: value })}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                            <SelectContent>
                                                {programas.filter(p => p.ativo).map((programa) => (
                                                    <SelectItem key={programa.id} value={programa.id}>
                                                        {programa.nome}
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
                                                {contas.filter(c => c.ativo).map((conta) => (
                                                    <SelectItem key={conta.id} value={conta.id}>
                                                        {conta.nome}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                
                                {/* -------------------- BLOCO 2: PASSAGEIROS -------------------- */}
                                <div className="space-y-3 p-4 border rounded-lg bg-muted/10">
                                    <Label className="text-base font-semibold flex items-center gap-2">
                                        <User className="h-4 w-4" /> Cadastro de Passageiros
                                    </Label>
                                    
                                    {/* Formulário de Adição */}
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

                                    {/* Lista de Passageiros Adicionados */}
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


                                {/* -------------------- BLOCO 3: QUANTIDADE E VALOR -------------------- */}
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

                                {/* -------------------- BLOCO 4: DATA E STATUS -------------------- */}
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
                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <Select
                                            value={formData.status}
                                            onValueChange={(value: 'pendente' | 'recebido') => setFormData({ ...formData, status: value })}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pendente">Pendente</SelectItem>
                                                <SelectItem value="recebido">Recebido</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* -------------------- BLOCO 5: PARCELAMENTO -------------------- */}
                                {formData.status === 'pendente' && !editingVenda && (
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
                                            <div className="flex-1 text-sm text-muted-foreground bg-muted/50 p-3 rounded border">
                                                <p className="font-medium mb-2 text-xs uppercase tracking-wide">Previsão de Recebimento</p>
                                                <div className="max-h-32 overflow-y-auto text-xs space-y-2 pr-1 custom-scrollbar">
                                                    {Array.from({ length: Math.max(1, parcelas) }).map((_, i) => {
                                                        const dataBase = formData.dataVenda ? new Date(formData.dataVenda) : new Date();
                                                        const dataPrevista = new Date(dataBase);
                                                        dataPrevista.setMonth(dataBase.getMonth() + (i + 1));
                                                        
                                                        const qtd = parseInt(formData.quantidade) || 0;
                                                        const valUnit = parseFloat(formData.valorUnitario) || 0;
                                                        const total = qtd * valUnit;
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
                                
                                {/* -------------------- BLOCO 6: OBSERVAÇÕES E BOTÕES -------------------- */}
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
                                    <Button type="submit" className="gradient-primary">
                                        {editingVenda ? 'Salvar' : 'Registrar'}
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
                emptyMessage="Nenhuma venda registrada. Clique em 'Nova Venda' para começar."
            />
        </MainLayout>
    );
};

export default Vendas;
