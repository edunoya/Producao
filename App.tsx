
import React, { Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { InventoryProvider } from './store/InventoryContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ProductionForm from './components/ProductionForm';
import DistributionForm from './components/DistributionForm';
import InventoryList from './components/InventoryList';
import Settings from './components/Settings';
import Reports from './components/Reports';
import { Loader2 } from 'lucide-react';

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-[#FFFDF5]">
    <Loader2 className="w-8 h-8 text-fuchsia-500 animate-spin" />
  </div>
);

const App: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HashRouter>
        <InventoryProvider>
          <Routes>
            {/* Rota especial para Loja (sem layout padrão) */}
            <Route path="/loja/:storeName" element={<InventoryList standalone={true} />} />
            
            {/* Rotas com Layout Administrativo */}
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
