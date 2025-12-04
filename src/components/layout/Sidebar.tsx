import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingCart,
  DollarSign,
  Users,
  Truck,
  CreditCard,
  Receipt,
  Plane,
  UserCircle,
  ChevronLeft,
  Menu,
  Package,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Package, label: 'Estoque', path: '/estoque' },
  { icon: ShoppingCart, label: 'Compras', path: '/compras' },
  { icon: DollarSign, label: 'Vendas', path: '/vendas' },
  { icon: CreditCard, label: 'Contas a Pagar', path: '/contas-pagar' },
  { icon: Receipt, label: 'Contas a Receber', path: '/contas-receber' },
  { icon: Wallet, label: 'Cartões', path: '/cartoes' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: Truck, label: 'Fornecedores', path: '/fornecedores' },
  { icon: Plane, label: 'Programas', path: '/programas' },
  { icon: UserCircle, label: 'Contas', path: '/contas' },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

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
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
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
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="border-t border-sidebar-border p-4">
            <p className="text-xs text-muted-foreground text-center">
              © 2024 MilhasERP
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
