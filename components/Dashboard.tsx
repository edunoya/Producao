
import React, { useEffect, useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Sparkles, Package, MapPin, ChevronRight, Scale, TrendingUp, BarChart3, Star } from 'lucide-react';
import { getInventoryInsights } from '../services/geminiService';
import { STORES } from '../constants';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { buckets, flavors, productionLogs } = useInventory();
  const [aiInsights, setAiInsights] = useState<string>("Analisando estoque e tendências de produção...");

  useEffect(() => {
    const fetchInsights = async () => {
      if (buckets.length > 0) {
        const text = await getInventoryInsights(buckets, flavors);
        setAiInsights(text);
      }
    };
    fetchInsights();
  }, [buckets, flavors]);

  const metrics = useMemo(() => {
    const activeBuckets = buckets.filter(b => b.status === 'estoque');
    const totalProducedGrams = productionLogs.reduce((acc, log) => 
      acc + log.entries.reduce((sum, e) => sum + e.totalGrams, 0), 0
    );
    
    // Cálculo do sabor líder (mais produzido historicamente)
    const flavorStats: Record<string, number> = {};
    productionLogs.forEach(log => {
      log.entries.forEach(e => {
        flavorStats[e.flavorId] = (flavorStats[e.flavorId] || 0) + e.totalGrams;
      });
    });
    
    const leaderFlavorId = Object.entries(flavorStats).sort((a,b) => b[1] - a[1])[0]?.[0];
    const leaderFlavor = flavors.find(f => f.id === leaderFlavorId)?.name || "N/A";

    return {
      totalKg: activeBuckets.reduce((a, b) => a + b.grams, 0) / 1000,
      factoryKg: activeBuckets.filter(b => b.location === 'Fábrica').reduce((a, b) => a + b.grams, 0) / 1000,
      historyKg: totalProducedGrams / 1000,
      avgBatchKg: productionLogs.length > 0 ? (totalProducedGrams / productionLogs.length) / 1000 : 0,
      leaderFlavor
    };
  }, [buckets, productionLogs, flavors]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Banner de Status Global */}
      <div className="magenta-gradient p-8 rounded-[40px] text-white shadow-2xl shadow-fuchsia-200 relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="opacity-60" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Estoque Ativo em Rede</p>
          </div>
          <div className="flex items-end gap-2">
            <h2 className="text-6xl font-black tracking-tighter">{metrics.totalKg.toFixed(1)}</h2>
            <span className="text-xl font-bold mb-2 opacity-60 italic">kg</span>
          </div>
          
          <div className="mt-8 flex gap-4">
             <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
               <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Fábrica</p>
               <p className="font-black text-lg">{metrics.factoryKg.toFixed(1)}kg</p>
             </div>
             <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
               <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Lojas</p>
               <p className="font-black text-lg">{(metrics.totalKg - metrics.factoryKg).toFixed(1)}kg</p>
             </div>
          </div>
        </div>
        <Package size={160} className="absolute -right-12 -bottom-12 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-[32px] border border-fuchsia-50 shadow-sm flex flex-col justify-between group hover:border-fuchsia-200 transition-all">
          <div className="flex justify-between items-start">
            <BarChart3 size={18} className="text-fuchsia-200 group-hover:text-fuchsia-500 transition-colors" />
            <span className="text-[8px] font-black text-fuchsia-300 uppercase tracking-widest">Histórico</span>
          </div>
          <div className="mt-4">
            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Média por Batida</p>
            <h4 className="text-2xl font-black text-gray-800 tracking-tight">{metrics.avgBatchKg.toFixed(1)}kg</h4>
          </div>
        </div>
        <div className="bg-white p-5 rounded-[32px] border border-fuchsia-50 shadow-sm flex flex-col justify-between group hover:border-fuchsia-200 transition-all">
          <div className="flex justify-between items-start">
            <Star size={18} className="text-amber-200 group-hover:text-amber-500 transition-colors" />
            <span className="text-[8px] font-black text-amber-300 uppercase tracking-widest">Líder</span>
          </div>
          <div className="mt-4">
            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Sabor Favorito</p>
            <h4 className="text-lg font-black text-gray-800 tracking-tight truncate">{metrics.leaderFlavor}</h4>
          </div>
        </div>
      </div>

      {/* IA Insights */}
      <div className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4 text-fuchsia-600">
          <Sparkles size={16} className="animate-pulse" />
          <h3 className="text-[10px] font-black uppercase tracking-widest">Análise de Tendências Gemini</h3>
        </div>
        <div className="bg-fuchsia-50/40 p-5 rounded-2xl border border-fuchsia-100/50">
          <p className="text-sm text-gray-600 leading-relaxed font-medium italic">
            "{aiInsights}"
          </p>
        </div>
      </div>

      {/* Unidades de Loja */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2">Audit de Unidades</h3>
        <div className="grid grid-cols-1 gap-3">
          {STORES.map(s => {
            const kg = buckets.filter(b => b.location === s && b.status === 'estoque').reduce((a,b)=>a+b.grams,0)/1000;
            const percentage = Math.min(100, (kg / 20) * 100); 
            
            return (
              <Link 
                key={s} 
                to={`/loja/${encodeURIComponent(s)}`}
                className="bg-white p-5 rounded-[32px] border border-fuchsia-50 shadow-sm flex justify-between items-center group hover:border-fuchsia-200 transition-all active:scale-95"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-fuchsia-50 rounded-2xl flex items-center justify-center text-fuchsia-500 shadow-inner group-hover:magenta-gradient group-hover:text-white transition-all">
                    <MapPin size={26} />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-800 tracking-tight text-lg">{s}</h4>
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-fuchsia-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-fuchsia-600 tracking-tighter">{kg.toFixed(1)}kg</span>
                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">Em Vitrine</span>
                  </div>
                  <ChevronRight size={18} className="text-fuchsia-100 group-hover:text-fuchsia-500 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
