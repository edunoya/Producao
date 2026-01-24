
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, ChefHat, Truck, ClipboardList, 
  Settings, BarChart3, Wifi, WifiOff, RefreshCw 
} from 'lucide-react';
import { useInventory } from '../store/InventoryContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { isSyncing, isInitialLoad } = useInventory();

  const navItems = [
    { path: '/', label: 'Início', icon: LayoutDashboard },
    { path: '/producao', label: 'Produzir', icon: ChefHat },
    { path: '/distribuicao', label: 'Enviar', icon: Truck },
    { path: '/estoque', label: 'Estoque', icon: ClipboardList },
    { path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
    { path: '/configuracoes', label: 'Ajustes', icon: Settings },
  ];

  if (isInitialLoad) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#FFFDF5]">
        <RefreshCw className="w-10 h-10 text-fuchsia-500 animate-spin mb-4" />
        <p className="text-fuchsia-600 font-bold animate-pulse">Sincronizando Lorenza...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF5] pb-24">
      {/* Header Mobile */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-fuchsia-50 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 magenta-gradient rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">L</div>
          <h1 className="text-lg font-black text-gray-800 tracking-tight">Lorenza</h1>
        </div>
        <div className={`p-2 rounded-full ${isSyncing ? 'bg-amber-50 text-amber-500' : 'bg-green-50 text-green-500'}`}>
          {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <Wifi size={18} />}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-lg mx-auto">
        {children}
      </main>

      {/* Bottom Navigation (Mobile First) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-fuchsia-50 flex justify-around py-3 px-2 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        {navItems.map(item => (
          <Link 
            key={item.path} 
            to={item.path} 
            className={`flex flex-col items-center gap-1 min-w-[64px] transition-all ${
              location.pathname === item.path ? 'text-fuchsia-600 scale-110' : 'text-gray-300'
            }`}
          >
            <item.icon size={22} strokeWidth={location.pathname === item.path ? 3 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
