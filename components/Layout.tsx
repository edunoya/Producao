
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
  Download,
  Upload,
  Cloud
} from 'lucide-react';
import { useInventory } from '../store/InventoryContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { notifications, dismissNotification, exportData, importData } = useInventory();
  const [showNotifs, setShowNotifs] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const navItems = [
    { path: '/', label: 'Painel', icon: LayoutDashboard },
    { path: '/producao', label: 'Produção', icon: ChefHat },
    { path: '/distribuicao', label: 'Distribuição', icon: Truck },
    { path: '/estoque', label: 'Estoque', icon: ClipboardList },
    { path: '/configuracoes', label: 'Gestão', icon: Settings },
    { path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        importData(content);
      };
      reader.readAsText(file);
    }
  };

  const handleCloudSync = () => {
    // Simulação de Sincronização Google Drive
    alert("Sincronização com Google Drive: Esta função requer registro de API Console. Os dados foram exportados localmente para simular o upload.");
    exportData();
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#fcfaf7]">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 p-6 fixed h-full">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-10 h-10 bg-rose-400 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-rose-200">G</div>
          <h1 className="text-xl font-bold text-gray-800">Gelato Flow</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                location.pathname === item.path
                  ? 'bg-rose-50 text-rose-600 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="pt-6 border-t border-gray-100 mt-6 space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Sincronização</p>
          <button onClick={handleCloudSync} className="flex items-center gap-2 text-xs text-sky-500 font-bold hover:text-sky-700 w-full p-2 transition-colors">
            <Cloud size={14} /> Google Drive Sync
          </button>
          <button onClick={exportData} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800 w-full p-2 transition-colors">
            <Download size={14} /> Exportar Backup
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800 w-full p-2 transition-colors">
            <Upload size={14} /> Importar Dados
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".json" />
        </div>

        <div className="pt-6 mt-6 border-t border-gray-100">
          <div className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 font-bold text-xs">AD</div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Admin</p>
              <p className="text-xs text-green-500">PWA Ativo</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 pb-24 md:pb-12">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <div className="md:hidden flex items-center gap-2">
             <div className="w-8 h-8 bg-rose-400 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">G</div>
             <h1 className="text-lg font-bold text-gray-800">Gelato Flow</h1>
          </div>
          <h2 className="hidden md:block text-lg font-semibold text-gray-800">
            {navItems.find(i => i.path === location.pathname)?.label || 'Bem-vindo'}
          </h2>

          <div className="relative flex items-center gap-2">
            <button onClick={() => setShowNotifs(!showNotifs)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative">
              <Bell size={22} />
              {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>}
            </button>
          </div>
        </header>

        <div className="p-6">
          {children}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-3 px-2 z-50">
        {navItems.map(item => (
          <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-1 ${location.pathname === item.path ? 'text-rose-600' : 'text-gray-400'}`}>
            <item.icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
