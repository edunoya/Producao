
import React, { useEffect, useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Sparkles, Package, MapPin, ChevronRight, Scale } from 'lucide-react';
import { getInventoryInsights } from '../services/geminiService';
import { STORES } from '../constants';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { buckets, flavors, isInitialLoad } = useInventory();
  const [aiInsights, setAiInsights] = useState<string>("Analisando estoque Lorenza...");

  useEffect(() => {
    const fetchInsights = async () => {
      if (buckets.length > 0) {
        const text = await getInventoryInsights(buckets, flavors);
        setAiInsights(text);
      }
    };
    fetchInsights();
  }, [buckets, flavors]);

  const totalKg = buckets.filter(b => b.status === 'estoque').reduce((a, b) => a + b.grams, 0) / 1000;
  const factoryKg = buckets.filter(b => b.location === 'Fábrica' && b.status === 'estoque').reduce((a, b) => a + b.grams, 0) / 1000;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* KPI Global */}
      <div className="magenta-gradient p-8 rounded-[40px] text-white shadow-2xl shadow-fuchsia-200 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">Estoque Global Ativo</p>
          <div className="flex items-end gap-2">
            <h2 className="text-5xl font-black tracking-tighter">{totalKg.toFixed(1)}</h2>
            <span className="text-xl font-bold mb-1 opacity-60">kg</span>
          </div>
          <div className="mt-8 flex gap-4">
             <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
               <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Fábrica</p>
               <p className="font-bold">{factoryKg.toFixed(1)}kg</p>
             </div>
             <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
               <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Em Lojas</p>
               <p className="font-bold">{(totalKg - factoryKg).toFixed(1)}kg</p>
             </div>
          </div>
        </div>
        <Package size={140} className="absolute -right-10 -bottom-10 opacity-10 rotate-12" />
      </div>

      {/* IA Insights */}
      <div className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-fuchsia-600">
          <Sparkles size={18} className="animate-pulse" />
          <h3 className="text-[10px] font-black uppercase tracking-widest">Lorenza AI Intelligence</h3>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed italic font-medium bg-fuchsia-50/30 p-4 rounded-2xl border border-fuchsia-50/50">
          "{aiInsights}"
        </p>
      </div>

      {/* Unidades */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Monitoramento por Unidade</h3>
        {STORES.map(s => {
          const kg = buckets.filter(b => b.location === s && b.status === 'estoque').reduce((a,b)=>a+b.grams,0)/1000;
          return (
            <Link 
              key={s} 
              to={`/loja/${encodeURIComponent(s)}`}
              className="bg-white p-5 rounded-3xl border border-fuchsia-50 shadow-sm flex justify-between items-center group active:scale-95 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-fuchsia-50 rounded-2xl flex items-center justify-center text-fuchsia-500 shadow-inner">
                  <MapPin size={24} />
                </div>
                <div>
                  <h4 className="font-black text-gray-800 tracking-tight">{s}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{(kg * 10).toFixed(0)}% de capacidade</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-xl font-black text-fuchsia-600 tracking-tighter">{kg.toFixed(1)}kg</span>
                </div>
                <ChevronRight className="text-fuchsia-200 group-hover:text-fuchsia-500 transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
