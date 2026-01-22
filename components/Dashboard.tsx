
import React, { useEffect, useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { STORES } from '../constants';
// Fix: Added missing ChefHat and BarChart3 icons to the import list.
import { Sparkles, Package, TrendingUp, Info, ChefHat, BarChart3 } from 'lucide-react';
import { getInventoryInsights } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const Dashboard: React.FC = () => {
  // Use flavors from context to ensure updates in Settings are reflected here
  const { buckets, flavors } = useInventory();
  const [aiInsights, setAiInsights] = useState<string>("Carregando insights inteligentes...");

  useEffect(() => {
    const fetchInsights = async () => {
      if (buckets.length > 0) {
        const text = await getInventoryInsights(buckets, flavors);
        setAiInsights(text);
      } else {
        setAiInsights("Registre sua primeira produção para receber insights!");
      }
    };
    fetchInsights();
  }, [buckets, flavors]);

  // Calculations
  const totalStockGrams = buckets.reduce((acc, b) => acc + b.grams, 0);
  const factoryStockGrams = buckets.filter(b => b.location === 'Fábrica').reduce((acc, b) => acc + b.grams, 0);
  const storeStockGrams = totalStockGrams - factoryStockGrams;

  const stockByStore = STORES.map(store => ({
    name: store,
    value: buckets.filter(b => b.location === store).reduce((acc, b) => acc + b.grams, 0) / 1000, // In KG
  }));

  const stockByFlavor = flavors.map(f => ({
    name: f.name,
    kg: buckets.filter(b => b.flavorId === f.id).reduce((acc, b) => acc + b.grams, 0) / 1000,
  })).filter(item => item.kg > 0).sort((a, b) => b.kg - a.kg).slice(0, 5);

  const COLORS = ['#FB7185', '#38BDF8', '#FBBF24', '#34D399', '#818CF8'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl">
              <Package size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Estoque Total</p>
              <h3 className="text-2xl font-bold text-gray-800">{(totalStockGrams / 1000).toFixed(1)} kg</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-rose-500 font-bold">{(factoryStockGrams / 1000).toFixed(1)}kg</span>
            <span className="text-gray-400">na fábrica</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-sky-50 text-sky-500 rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Distribuição Ativa</p>
              <h3 className="text-2xl font-bold text-gray-800">{(storeStockGrams / 1000).toFixed(1)} kg</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Repartido entre 3 lojas</span>
          </div>
        </div>

        <div className="bg-rose-500 p-6 rounded-3xl text-white shadow-lg shadow-rose-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-lg">Próximo Passo</h3>
            <div className="p-1.5 bg-rose-400/30 rounded-lg">
              <ChefHat size={18} />
            </div>
          </div>
          <p className="text-sm text-rose-100 mt-2">Clique para registrar nova produção do dia.</p>
          <button className="mt-4 bg-white text-rose-600 px-4 py-2 rounded-xl text-sm font-bold w-full hover:bg-rose-50 transition-colors">
            Nova Fornada
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gemini Insights */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-50 to-white p-6 rounded-3xl border border-indigo-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-indigo-700">
            <Sparkles size={20} className="animate-pulse" />
            <h3 className="font-bold">Análise Inteligente (Gemini)</h3>
          </div>
          <div className="text-gray-700 leading-relaxed text-sm bg-white/50 p-4 rounded-2xl border border-indigo-50">
            {aiInsights}
          </div>
        </div>

        {/* Quick Stock Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
             <BarChart3 size={18} className="text-rose-400" />
             Estoque por Loja (KG)
          </h3>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockByStore}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stockByStore.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {stockByStore.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="text-[10px] text-gray-500 font-medium">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Flavors Table/Chart */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-6">Top 5 Sabores em Estoque</h3>
        <div className="h-64">
           <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockByFlavor} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="kg" fill="#FB7185" radius={[0, 10, 10, 0]} barSize={20} />
              </BarChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
