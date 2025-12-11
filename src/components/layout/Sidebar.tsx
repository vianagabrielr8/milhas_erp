import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  ShoppingCart,
  DollarSign,
  Users,
  Truck,
  Receipt,
  Plane,
  UserCircle,
  ChevronLeft,
  Menu,
  Package,
  Wallet,
  LogOut,
User,
  ShieldCheck, 
  ArrowRightLeft, // <--- ADICIONE ESTE ÍCONE
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Package, label: 'Estoque', path: '/estoque' },
  { icon: ShoppingCart, label: 'Compras', path: '/compras' },
  { icon: DollarSign, label: 'Vendas', path: '/vendas' },
{ icon: Receipt, label: 'Financeiro', path: '/financeiro' },
  { icon: ArrowRightLeft, label: 'Transferências', path: '/transferencias' }, // <--- ADICIONE ESTA LINHA
  { icon: Wallet, label: 'Cartões', path: '/cartoes' },
  { icon: ShieldCheck, label: 'Limites CPF', path: '/limites' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: Truck, label: 'Fornecedores', path: '/fornecedores' },
  { icon: Plane, label: 'Programas', path: '/programas' },
  { icon: UserCircle, label: 'Contas', path: '/contas' },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string; email: string; avatar: string | null } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserInfo({
          name: user.user_metadata.full_name || user.user_metadata.name || 'Usuário',
          email: user.email || '',
          avatar: user.user_metadata.avatar_url || null,
        });
      }
    };
    getUserData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <Plane className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold text-lg text-sidebar-foreground">
                MilhasERP
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent ml-auto"
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  collapsed ? 'justify-center' : '',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer com Perfil + Logout */}
        <div className="border-t border-sidebar-border p-4 bg-sidebar-accent/10">
          
          {/* Seção do Usuário */}
          {userInfo && (
            <div className={cn("flex items-center gap-3 mb-4", collapsed ? "justify-center" : "")}>
              <div className="relative flex-shrink-0">
                {userInfo.avatar ? (
                  <img 
                    src={userInfo.avatar} 
                    alt="Avatar" 
                    className="h-9 w-9 rounded-full border border-sidebar-border object-cover" 
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center border border-sidebar-border">
                    <User className="h-5 w-5 text-sidebar-foreground" />
                  </div>
                )}
                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-sidebar" />
              </div>

              {!collapsed && (
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium text-sidebar-foreground truncate" title={userInfo.name}>
                    {userInfo.name.split(' ')[0]} 
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate" title={userInfo.email}>
                    {userInfo.email}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Botão de Sair */}
          <button
            onClick={handleLogout}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 text-red-400 hover:bg-red-500/10 hover:text-red-500',
              collapsed ? 'justify-center' : ''
            )}
            title="Sair da Conta"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Sair da Conta</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};
