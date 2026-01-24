
import React, { useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { STORES } from '../constants';
import { Download, TrendingUp, Package, Calendar, BarChart3, PieChart as PieIcon, MapPin, ChevronDown, ChevronUp, AlertCircle, Share2 } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend 
} from 'recharts';

const COLORS = ['#D946EF', '#A21CAF', '#F472B6', '#F0ABFC', '#701A75'];

interface StoreStockData {
  totalGrams: number;
  bucketCount: number;
  flavors: Record<string, { grams: number, count: number }>;
}

const Reports: React.FC = () => {
  const { productionLogs, buckets, flavors, categories, exportToCSV, isSyncing } = useInventory();
  const [dateRange, setDateRange] = useState({ 
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [expandedStore, setExpandedStore] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    return productionLogs.filter(l => {
      const d = l.date.toISOString().split('T')[0];
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [productionLogs, dateRange]);

  const storeStockReport = useMemo(() => {
    const report: Record<string, StoreStockData> = {};
    const locations = ['Fábrica', ...STORES];
    
    locations.forEach(loc => {
      report[loc] = { totalGrams: 0, bucketCount: 0, flavors: {} };
    });

    buckets.filter(b => b.status === 'estoque').forEach(b => {
      const loc = b.location;
      if (!report[loc]) return;
      report[loc].totalGrams += b.grams;
      report[loc].bucketCount += 1;
      const flavorName = flavors.find(f => f.id === b.flavorId)?.name || 'Desconhecido';
      if (!report[loc].flavors[flavorName]) {
        report[loc].flavors[flavorName] = { grams: 0, count: 0 };
      }
      report[loc].flavors[flavorName].grams += b.grams;
      report[loc].flavors[flavorName].count += 1;
    });

    return report;
  }, [buckets, flavors]);

  const timelineData = useMemo(() => {
    const daily: any = {};
    filteredLogs.forEach(l => {
      const d = l.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const total = l.entries.reduce((a, b) => a + b.totalGrams, 0) / 1000;
      daily[d] = (daily[d] || 0) + total;
    });
    return Object.entries(daily).map(([name, kg]) => ({ name, kg }));
  }, [filteredLogs]);

  const flavorRanking = useMemo(() => {
    const ranking: any = {};
    filteredLogs.forEach(l => {
      l.entries.forEach(e => {
        const name = flavors.find(f => f.id === e.flavorId)?.name || 'Outros';
        ranking[name] = (ranking[name] || 0) + e.totalGrams / 1000;
      });
    });
    return Object.entries(ranking)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, kg]) => ({ name, kg }));
  }, [filteredLogs, flavors]);

  const distributionByStore = useMemo(() => {
    const dist: Record<string, number> = {};
    STORES.forEach(s => dist[s] = 0);
    
    buckets.forEach(b => {
      const d = b.producedAt.toISOString().split('T')[0];
      if (d >= dateRange.start && d <= dateRange.end && b.location !== 'Fábrica') {
        dist[b.location] = (dist[b.location] || 0) + b.grams / 1000;
      }
    });

    return Object.entries(dist).map(([name, kg]) => ({ name, kg }));
  }, [buckets, dateRange]);

  const categoryDistribution = useMemo(() => {
    const dist: any = {};
    filteredLogs.forEach(l => {
      l.entries.forEach(e => {
        const flavor = flavors.find(f => f.id === e.flavorId);
        const cat = categories.find(c => c.id === flavor?.categoryIds?.[0])?.name || 'Outros';
        dist[cat] = (dist[cat] || 0) + e.totalGrams / 1000;
      });
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [filteredLogs, flavors, categories]);

  const totalKg = timelineData.reduce((a, b) => a + Number(b.kg), 0);

  return (
    <div className="space-y-10 pb-32 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[40px] border border-fuchsia-50 shadow-sm gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Relatórios Lorenza</h2>
          <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mt-1">Visão 360 do seu negócio</p>
        </div>
        <button 
          onClick={exportToCSV} 
          disabled={isSyncing}
          className="w-full md:w-auto magenta-gradient text-white px-8 py-5 rounded-[24px] shadow-xl shadow-fuchsia-100 flex items-center justify-center gap-4 hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
        >
          <Download size={22} />
          <span className="text-xs font-black uppercase tracking-widest">Extrair Excel (CSV)</span>
        </button>
      </header>

      {/* Relatório de Estoque por Unidade */}
      <section className="space-y-6">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3 px-4">
          <MapPin size={18} className="text-fuchsia-500" /> Auditoria por Unidade (Hoje)
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {(Object.entries(storeStockReport) as [string, StoreStockData][]).map(([loc, data]) => (
            <div key={loc} className="bg-white rounded-[32px] border border-fuchsia-50 shadow-sm overflow-hidden transition-all duration-300">
               <button 
                onClick={() => setExpandedStore(expandedStore === loc ? null : loc)}
                className="w-full p-8 flex justify-between items-center hover:bg-fuchsia-50/10 transition-colors"
               >
                 <div className="flex items-center gap-6 text-left">
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner ${data.totalGrams > 50000 ? 'bg-green-50 text-green-500' : 'bg-fuchsia-50 text-fuchsia-500'}`}>
                      <Package size={32} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-gray-800 tracking-tight">{loc}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black text-fuchsia-600 uppercase tracking-widest">{(data.totalGrams/1000).toFixed(1)}kg</span>
                        <span className="w-1 h-1 bg-gray-200 rounded-full" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{data.bucketCount} Baldes</span>
                      </div>
                    </div>
                 </div>
                 <div className="bg-fuchsia-50 p-2 rounded-xl text-fuchsia-200">
                   {expandedStore === loc ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                 </div>
               </button>
               
               {expandedStore === loc && (
                 <div className="px-8 pb-8 animate-in slide-in-from-top-4">
                    <div className="border-t border-fuchsia-50 pt-6 space-y-3">
                       {Object.entries(data.flavors).length === 0 ? (
                         <div className="py-12 flex flex-col items-center gap-3 text-gray-300 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-50">
                           <AlertCircle size={32} />
                           <p className="text-xs font-bold uppercase tracking-widest">Unidade sem estoque ativo</p>
                         </div>
                       ) : (
                         Object.entries(data.flavors)
                          .sort((a: any, b: any) => b[1].grams - a[1].grams)
                          .map(([flavor, stats]: any) => (
                           <div key={flavor} className="flex justify-between items-center p-5 bg-fuchsia-50/30 rounded-2xl border border-fuchsia-100/20 hover:bg-fuchsia-50 transition-colors">
                              <span className="text-xs font-black text-gray-700 uppercase tracking-tighter">{flavor}</span>
                              <div className="flex gap-6 items-center">
                                <span className="text-[9px] font-black text-fuchsia-300 uppercase tracking-[0.2em]">{stats.count} vol</span>
                                <div className="text-right">
                                  <span className="text-lg font-black text-fuchsia-600">{(stats.grams/1000).toFixed(1)}</span>
                                  <span className="text-[10px] font-bold text-fuchsia-300 ml-1">kg</span>
                                </div>
                              </div>
                           </div>
                         ))
                       )}
                    </div>
                 </div>
               )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8 pt-12 border-t border-fuchsia-50">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3 px-4">
          <TrendingUp size={18} className="text-fuchsia-500" /> Evolução & Histórico
        </h3>
        
        <div className="bg-white p-8 rounded-[40px] border border-fuchsia-50 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
              <Calendar size={12} /> Data Inicial
            </label>
            <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full bg-fuchsia-50/50 p-5 rounded-2xl border-none font-bold text-gray-600 outline-none focus:ring-2 focus:ring-fuchsia-100 transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
              <Calendar size={12} /> Data Final
            </label>
            <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full bg-fuchsia-50/50 p-5 rounded-2xl border-none font-bold text-gray-600 outline-none focus:ring-2 focus:ring-fuchsia-100 transition-all" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white p-10 rounded-[48px] border border-fuchsia-50 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Massa Produzida</p>
            <h4 className="text-5xl font-black text-fuchsia-600 tracking-tighter">{totalKg.toFixed(1)}<span className="text-base italic opacity-40 ml-2">kg</span></h4>
          </div>
          <div className="bg-white p-10 rounded-[48px] border border-fuchsia-50 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Lotes</p>
            <h4 className="text-5xl font-black text-gray-800 tracking-tighter">{filteredLogs.length}</h4>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-10 rounded-[56px] border border-fuchsia-50 shadow-sm overflow-hidden">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-10 flex items-center gap-3">
              <Share2 size={18} className="text-fuchsia-500" /> Distribuição por Loja (Massa kg)
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionByStore}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}} />
                  <Tooltip 
                    cursor={{fill: '#fdf5ff'}}
                    contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}}
                  />
                  <Bar dataKey="kg" fill="#D946EF" radius={[12, 12, 0, 0]} barSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 flex justify-around">
              {distributionByStore.map(s => (
                <div key={s.name} className="text-center">
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">{s.name}</p>
                  <p className="text-xl font-black text-fuchsia-600">{s.kg.toFixed(1)}kg</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-10 rounded-[56px] border border-fuchsia-50 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-10 flex items-center gap-3">
              <TrendingUp size={18} className="text-fuchsia-500" /> Produção Diária (Massa kg)
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', fontWeight: 800, padding: '16px'}}
                    itemStyle={{color: '#D946EF'}}
                  />
                  <Line type="monotone" dataKey="kg" stroke="#D946EF" strokeWidth={6} dot={{r: 6, fill: '#D946EF', strokeWidth: 0}} activeDot={{r: 10}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-[56px] border border-fuchsia-50 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-10 flex items-center gap-3">
                <PieIcon size={18} className="text-fuchsia-500" /> Mix de Categorias
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryDistribution} innerRadius={70} outerRadius={100} paddingAngle={10} dataKey="value">
                      {categoryDistribution.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} strokeWidth={0} />)}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '20px', border: 'none'}} />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{fontSize: 12, fontWeight: 800, textTransform: 'uppercase', paddingTop: '30px'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[56px] border border-fuchsia-50 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-10 flex items-center gap-3">
                <BarChart3 size={18} className="text-fuchsia-500" /> Top 5 Sabores Produzidos
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={flavorRanking} margin={{left: 20}}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={110} axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#64748b'}} />
                    <Tooltip cursor={{fill: '#fdf5ff'}} />
                    <Bar dataKey="kg" fill="#D946EF" radius={[0, 16, 16, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Reports;
