
import React from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, ChefHat, Truck, ClipboardList, 
  Settings, BarChart3, RefreshCw, Wifi, WifiOff 
} from 'lucide-react';
import { useInventory } from '../store/InventoryContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { isSyncing, isInitialLoad } = useInventory();
  const isStandaloneStore = location.pathname.startsWith('/loja/');

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
        <div className="relative mb-6">
          <RefreshCw className="w-12 h-12 text-fuchsia-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-fuchsia-600">L</div>
        </div>
        <p className="text-fuchsia-600 font-black uppercase tracking-[0.3em] animate-pulse">Lorenza Cloud Sync...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#FFFDF5] ${!isStandaloneStore ? 'pb-28' : ''}`}>
      {/* Header Premium - Oculto em modo Standalone */}
      {!isStandaloneStore && (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-fuchsia-50 px-6 py-5 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 magenta-gradient rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-fuchsia-200">L</div>
            <div>
              <h1 className="text-xl font-black text-gray-800 tracking-tight leading-none">Lorenza</h1>
              <span className="text-[9px] font-black text-fuchsia-400 uppercase tracking-widest">Painel Administrativo</span>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isSyncing ? 'bg-amber-50 text-amber-500' : 'bg-green-50 text-green-500'}`}>
            {isSyncing ? <RefreshCw size={12} className="animate-spin" /> : <Wifi size={12} />}
            {isSyncing ? 'Sincronizando' : 'Online'}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`p-4 md:p-6 mx-auto ${isStandaloneStore ? 'max-w-none' : 'max-w-lg'} animate-in fade-in duration-500`}>
        {children}
      </main>

      {/* Bottom Navigation - Oculto em modo Standalone */}
      {!isStandaloneStore && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-fuchsia-50 flex justify-around py-4 px-2 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.04)]">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative ${
                  isActive ? 'text-fuchsia-600' : 'text-gray-300 hover:text-fuchsia-300'
                }`}
              >
                <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-fuchsia-50' : 'bg-transparent'}`}>
                  <item.icon size={22} strokeWidth={isActive ? 3 : 2} />
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
                {isActive && <div className="absolute -top-4 w-1 h-1 bg-fuchsia-500 rounded-full" />}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
};

export default Layout;
