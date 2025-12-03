import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const checkSidebar = () => {
      const sidebar = document.querySelector('aside');
      if (sidebar) {
        setSidebarCollapsed(sidebar.classList.contains('w-16'));
      }
    };
    
    const observer = new MutationObserver(checkSidebar);
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }
    
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background dark">
      <Sidebar />
      <main
        className={cn(
          'transition-all duration-300 min-h-screen',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
