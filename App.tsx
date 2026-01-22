import React, { Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { InventoryProvider } from './store/InventoryContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ProductionForm from './components/ProductionForm';
import DistributionForm from './components/DistributionForm';
import InventoryList from './components/InventoryList';
import Settings from './components/Settings';
import { BarChart3, Loader2 } from 'lucide-react';

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-[#fcfaf7]">
    <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
  </div>
);

const Reports: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-gray-100 min-h-[400px]">
    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-4">
      <BarChart3 size={32} />
    </div>
    <h3 className="text-xl font-bold text-gray-800">Relatórios Dinâmicos</h3>
    <p className="text-gray-400 text-sm mt-2 text-center max-w-xs">
      Visualize o histórico de movimentação e performance de vendas por unidade em breve.
    </p>
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