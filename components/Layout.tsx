
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ChefHat, 
  Truck, 
  ClipboardList, 
  BarChart3, 
  Bell,
  Settings,
  FileSpreadsheet,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { useInventory } from '../store/InventoryContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { notifications, isSyncing, isLocalMode, exportToCSV } = useInventory();
  const [showNotifs, setShowNotifs] = React.useState(false);

  const navItems = [
    { path: '/', label: 'Painel', icon: LayoutDashboard },
    { path: '/producao', label: 'Produção', icon: ChefHat },
    { path: '/distribuicao', label: 'Distribuição', icon: Truck },
    { path: '/estoque', label: 'Estoque', icon: ClipboardList },
    { path: '/configuracoes', label: 'Gestão', icon: Settings },
    { path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FFFDF5]">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-fuchsia-50 p-6 fixed h-full shadow-sm">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-10 h-10 magenta-gradient rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-fuchsia-100">L</div>
          <h1 className="text-xl font-bold text-gray-800">Lorenza</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                location.pathname === item.path
                  ? 'bg-fuchsia-50 text-fuchsia-600 font-semibold shadow-sm border border-fuchsia-100'
                  : 'text-gray-400 hover:bg-fuchsia-50/50 hover:text-fuchsia-400'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="pt-6 border-t border-fuchsia-50 mt-6 space-y-2">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 text-xs font-bold text-fuchsia-500 bg-fuchsia-50 w-full p-3 rounded-xl hover:bg-fuchsia-100 transition-colors shadow-sm"
          >
            <FileSpreadsheet size={16} /> Exportar para Sheets
          </button>
        </div>

        <div className="pt-6 mt-6 border-t border-fuchsia-50">
          <div className="flex items-center gap-3 p-2">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isSyncing ? 'bg-amber-50 text-amber-500' : isLocalMode ? 'bg-gray-50 text-gray-400' : 'bg-green-50 text-green-500'}`}>
               {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : isLocalMode ? <WifiOff size={14} /> : <Wifi size={14} />}
             </div>
             <div>
               <p className="text-[10px] font-bold text-gray-700 uppercase">{isSyncing ? 'Sincronizando' : isLocalMode ? 'Modo Local' : 'Conectado'}</p>
               <p className="text-[9px] text-gray-400">{isLocalMode ? 'Dados salvos no navegador' : 'Banco de Dados Lorenza'}</p>
             </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 pb-24 md:pb-12">
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-fuchsia-50 px-6 py-4 flex justify-between items-center shadow-sm">
          <div className="md:hidden flex items-center gap-2">
             <div className="w-8 h-8 magenta-gradient rounded-lg flex items-center justify-center text-white font-bold">L</div>
             <h1 className="text-lg font-bold text-gray-800">Lorenza</h1>
          </div>
          
          <h2 className="hidden md:block text-lg font-bold text-gray-800">
            {navItems.find(i => i.path === location.pathname)?.label || 'Bem-vindo'}
          </h2>

          <div className="flex items-center gap-3">
             <button onClick={() => setShowNotifs(!showNotifs)} className="p-2 text-fuchsia-300 hover:bg-fuchsia-50 rounded-full relative transition-colors">
               <Bell size={22} />
               {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-fuchsia-500 rounded-full border-2 border-white"></span>}
             </button>
          </div>
        </header>

        <div className="p-6">
          {children}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-fuchsia-50 flex justify-around py-3 px-2 z-50 shadow-2xl">
        {navItems.slice(0, 5).map(item => (
          <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-1 ${location.pathname === item.path ? 'text-fuchsia-600' : 'text-gray-300'}`}>
            <item.icon size={20} />
            <span className="text-[9px] font-bold uppercase tracking-tight">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
