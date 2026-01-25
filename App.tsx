
import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { InventoryProvider } from './store/InventoryContext';
import { Loader2, AlertTriangle } from 'lucide-react';

const safeLazy = (importFn: () => Promise<any>) => {
  return lazy(() => 
    importFn().catch(err => {
      console.error("Erro ao carregar módulo:", err);
      return { default: () => (
        <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="text-amber-500 mb-4" size={48} />
          <h2 className="font-bold text-gray-800">Erro de Carregamento</h2>
          <p className="text-gray-500 text-sm mt-2">Não foi possível carregar esta parte do sistema. Por favor, recarregue a página.</p>
          <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-fuchsia-600 text-white rounded-xl font-bold">Recarregar agora</button>
        </div>
      )};
    })
  );
};

const Layout = safeLazy(() => import('./components/Layout'));
const Dashboard = safeLazy(() => import('./components/Dashboard'));
const ProductionForm = safeLazy(() => import('./components/ProductionForm'));
const DistributionForm = safeLazy(() => import('./components/DistributionForm'));
const InventoryList = safeLazy(() => import('./components/InventoryList'));
const Settings = safeLazy(() => import('./components/Settings'));
const Reports = safeLazy(() => import('./components/Reports'));
const AdminInventory = safeLazy(() => import('./components/AdminInventory'));

const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#FFFDF5] gap-4">
    <Loader2 className="w-10 h-10 text-fuchsia-500 animate-spin" />
    <p className="text-fuchsia-400 font-black uppercase tracking-widest text-[10px]">Carregando Sistema...</p>
  </div>
);

const App: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HashRouter>
        <InventoryProvider>
          <Routes>
            <Route 
              path="/loja/:storeName" 
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <InventoryList standalone={true} />
                </Suspense>
              } 
            />
            
            <Route path="/" element={<Layout><Dashboard /></Layout>} />
            <Route path="/producao" element={<Layout><ProductionForm /></Layout>} />
            <Route path="/distribuicao" element={<Layout><DistributionForm /></Layout>} />
            <Route path="/estoque" element={<Layout><AdminInventory /></Layout>} />
            <Route path="/configuracoes" element={<Layout><Settings /></Layout>} />
            <Route path="/relatorios" element={<Layout><Reports /></Layout>} />
            <Route path="*" element={<Layout><Dashboard /></Layout>} />
          </Routes>
        </InventoryProvider>
      </HashRouter>
    </Suspense>
  );
};

export default App;
