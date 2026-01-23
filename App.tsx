
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
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/producao" element={<ProductionForm />} />
              <Route path="/distribuicao" element={<DistributionForm />} />
              <Route path="/estoque" element={<InventoryList />} />
              <Route path="/configuracoes" element={<Settings />} />
              <Route path="/relatorios" element={<Reports />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </Layout>
        </InventoryProvider>
      </HashRouter>
    </Suspense>
  );
};

export default App;
