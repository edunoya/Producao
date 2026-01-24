
import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { InventoryProvider } from './store/InventoryContext';
import { Loader2 } from 'lucide-react';

// Lazy loading components for performance optimization
const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const ProductionForm = lazy(() => import('./components/ProductionForm'));
const DistributionForm = lazy(() => import('./components/DistributionForm'));
const InventoryList = lazy(() => import('./components/InventoryList'));
const Settings = lazy(() => import('./components/Settings'));
const Reports = lazy(() => import('./components/Reports'));

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
            {/* Special standalone route for stores */}
            <Route 
              path="/loja/:storeName" 
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <InventoryList standalone={true} />
                </Suspense>
              } 
            />
            
            {/* Administrative routes with Layout */}
            <Route path="/" element={<Layout><Dashboard /></Layout>} />
            <Route path="/producao" element={<Layout><ProductionForm /></Layout>} />
            <Route path="/distribuicao" element={<Layout><DistributionForm /></Layout>} />
            <Route path="/estoque" element={<Layout><InventoryList /></Layout>} />
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
