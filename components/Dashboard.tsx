import React, { useEffect, useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { STORES } from '../constants';
import { Sparkles, Package, TrendingUp, ChefHat, BarChart3, ArrowRight } from 'lucide-react';
import { getInventoryInsights } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { buckets, flavors } = useInventory();
  const navigate = useNavigate();
  const [aiInsights, setAiInsights] = useState<string>("Analisando estoque Lorenza...");

  useEffect(() => {
    const fetchInsights = async () => {
      if (buckets.length > 0) {
        const text = await getInventoryInsights(buckets, flavors);
        setAiInsights(text);
      } else {
        setAiInsights("Registre a produção para receber insights inteligentes.");
      }
    };
    fetchInsights();
  }, [buckets, flavors]);

  const totalStockGrams = buckets.reduce((acc, b) => acc + b.grams, 0);
  const factoryStockGrams = buckets.filter(b => b.location === 'Fábrica').reduce((acc, b) => acc + b.grams, 0);
  
  const stockByStore = STORES.map(store => ({
    name: store,
    value: buckets.filter(b => b.location === store).reduce((acc, b) => acc + b.grams, 0) / 1000,
  }));

  const stockByFlavor = flavors.map(f => ({
    name: f.name,
    kg: buckets.filter(b => b.flavorId === f.id).reduce((acc, b) => acc + b.grams, 0) / 1000,
  })).filter(item => item.kg > 0).sort((a, b) => b.kg - a.kg).slice(0, 5);

  const COLORS = ['#D946EF', '#818CF8', '#F472B6', '#34D399', '#FB923C'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-fuchsia-50 rounded-full opacity-50 transition-transform group-hover:scale-110"></div>
          <div className="relative">
            <div className="p-3 bg-fuchsia-50 text-fuchsia-500 rounded-2xl w-fit mb-4">
              <Package size={24} />
            </div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Estoque Global</p>
            <h3 className="text-3xl font-black text-gray-800">{(totalStockGrams / 1000).toFixed(1)} <span className="text-lg font-normal text-gray-400">kg</span></h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm">
          <div className="p-3 bg-sky-50 text-sky-500 rounded-2xl w-fit mb-4">
            <TrendingUp size={24} />
          </div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Na Fábrica</p>
          <h3 className="text-3xl font-black text-gray-800">{(factoryStockGrams / 1000).toFixed(1)} <span className="text-lg font-normal text-gray-400">kg</span></h3>
        </div>

        <div className="magenta-gradient p-6 rounded-3xl text-white shadow-xl shadow-fuchsia-100 flex flex-col justify-between group cursor-pointer" onClick={() => navigate('/producao')}>
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-lg">Nova Batida</h3>
            <ChefHat size={24} className="opacity-50 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="mt-6 flex items-center justify-between">
            <span className="text-xs font-bold text-fuchsia-100 uppercase tracking-widest">Registrar Lote</span>
            <ArrowRight size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-fuchsia-600">
            <Sparkles size={20} className="animate-pulse" />
            <h3 className="font-bold uppercase text-xs tracking-widest">Insights Lorenza AI</h3>
          </div>
          <div className="text-gray-700 leading-relaxed text-sm bg-fuchsia-50/30 p-5 rounded-2xl border border-fuchsia-50/50 italic">
            "{aiInsights}"
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm flex flex-col h-full">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
             <BarChart3 size={18} className="text-fuchsia-400" />
             Distribuição (KG)
          </h3>
          <div className="flex-1 min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stockByStore} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value">
                  {stockByStore.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 justify-center">
            {stockByStore.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="text-[10px] text-gray-500 font-bold uppercase">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-6 uppercase text-xs tracking-widest">Disponibilidade por Sabor</h3>
        <div className="h-64">
           <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockByFlavor} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10, fontWeight: 700, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#FDF2F8' }} />
                <Bar dataKey="kg" fill="#D946EF" radius={[0, 10, 10, 0]} barSize={16} />
              </BarChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;