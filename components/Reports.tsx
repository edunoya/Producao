
import React, { useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { STORES } from '../constants';
import { Download, TrendingUp, Package, Calendar, BarChart3, PieChart as PieIcon, MapPin, ChevronDown, ChevronUp, AlertCircle, Share2, Award, List, Store as StoreIcon } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend 
} from 'recharts';

const COLORS = ['#D946EF', '#A21CAF', '#F472B6', '#F0ABFC', '#701A75', '#E879F9'];

const Reports: React.FC = () => {
  const { productionLogs, buckets, flavors, categories, storeClosingLogs, exportToCSV, isSyncing } = useInventory();
  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ 
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const filteredLogs = useMemo(() => {
    return productionLogs.filter(l => {
      const d = l.date.toISOString().split('T')[0];
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [productionLogs, dateRange]);

  // 1. Timeline Comparativa dos Top 5 Sabores
  const timelineMultiData = useMemo(() => {
    const daily: any = {};
    const top5Ids = flavors.map(f => {
      const total = filteredLogs.reduce((acc, l) => acc + l.entries.filter(e => e.flavorId === f.id).reduce((s, e) => s + e.totalGrams, 0), 0);
      return { id: f.id, name: f.name, total };
    }).sort((a, b) => b.total - a.total).slice(0, 5);

    filteredLogs.forEach(l => {
      const d = l.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!daily[d]) daily[d] = { name: d };
      top5Ids.forEach(t => {
        const entry = l.entries.find(e => e.flavorId === t.id);
        daily[d][t.name] = (daily[d][t.name] || 0) + (entry ? entry.totalGrams / 1000 : 0);
      });
    });
    return { data: Object.values(daily), flavors: top5Ids.map(t => t.name) };
  }, [filteredLogs, flavors]);

  // 2. Vendas por Loja (Baseado nos logs de fechamento)
  const salesByStoreReport = useMemo(() => {
    const report: any = {};
    STORES.forEach(s => report[s] = []);
    
    storeClosingLogs.forEach(log => {
      const d = log.date.toISOString().split('T')[0];
      if (d >= dateRange.start && d <= dateRange.end) {
        log.items.forEach(item => {
          if (item.soldGrams > 0) {
            const flavor = flavors.find(f => f.id === item.flavorId)?.name || 'Outros';
            const existing = report[log.storeName].find((r:any) => r.flavor === flavor);
            if (existing) {
              existing.grams += item.soldGrams;
              existing.count += 1;
            } else {
              report[log.storeName].push({ flavor, grams: item.soldGrams, count: 1 });
            }
          }
        });
      }
    });
    return report;
  }, [storeClosingLogs, dateRange, flavors]);

  // 3. Gráfico Horizontal de Categorias
  const categoryGrams = useMemo(() => {
    const data: any = {};
    filteredLogs.forEach(l => {
      l.entries.forEach(e => {
        const flavor = flavors.find(f => f.id === e.flavorId);
        const cat = categories.find(c => c.id === flavor?.categoryIds?.[0])?.name || 'Outros';
        data[cat] = (data[cat] || 0) + e.totalGrams / 1000;
      });
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }))
      .sort((a:any, b:any) => b.value - a.value);
  }, [filteredLogs, flavors, categories]);

  // 4. Auditoria Detalhada
  const unitAudit = useMemo(() => {
    const audit: any = {};
    ['Fábrica', ...STORES].forEach(loc => {
      const locBuckets = buckets.filter(b => b.location === loc && b.status === 'estoque');
      const flavorsStats: any = {};
      locBuckets.forEach(b => {
        const f = flavors.find(fl => fl.id === b.flavorId)?.name || 'Desconhecido';
        if (!flavorsStats[f]) flavorsStats[f] = { grams: 0, count: 0 };
        flavorsStats[f].grams += b.grams;
        flavorsStats[f].count += 1;
      });
      audit[loc] = {
        totalKg: locBuckets.reduce((a, b) => a + b.grams, 0) / 1000,
        bucketCount: locBuckets.length,
        items: Object.entries(flavorsStats).map(([name, s]: any) => ({ name, kg: s.grams / 1000, count: s.count }))
          .sort((a, b) => b.kg - a.kg)
      };
    });
    return audit;
  }, [buckets, flavors]);

  return (
    <div className="space-y-10 pb-32 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[40px] border border-fuchsia-50 shadow-sm gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Analytics Lorenza</h2>
          <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mt-1">Visão 360 do Negócio</p>
        </div>
        <button onClick={exportToCSV} className="w-full md:w-auto magenta-gradient text-white px-8 py-5 rounded-[24px] shadow-xl flex items-center justify-center gap-4">
          <Download size={22} /> Extrair Relatório Global
        </button>
      </header>

      {/* Auditoria por Unidade com Expansão */}
      <section className="space-y-4">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3 px-4">
          <MapPin size={18} className="text-fuchsia-500" /> Auditoria Detalhada de Unidades
        </h3>
        {Object.entries(unitAudit).map(([loc, data]: any) => (
          <div key={loc} className="bg-white rounded-[32px] border border-fuchsia-50 shadow-sm overflow-hidden">
            <button 
              onClick={() => setExpandedStore(expandedStore === loc ? null : loc)}
              className="w-full p-6 flex justify-between items-center hover:bg-fuchsia-50/10 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-fuchsia-50 rounded-2xl flex items-center justify-center text-fuchsia-500">
                  <Package size={24} />
                </div>
                <div className="text-left">
                  <h4 className="font-black text-gray-800">{loc}</h4>
                  <p className="text-[9px] font-black text-fuchsia-400 uppercase tracking-widest">{data.totalKg.toFixed(1)}kg • {data.bucketCount} Baldes</p>
                </div>
              </div>
              {expandedStore === loc ? <ChevronUp className="text-fuchsia-300" /> : <ChevronDown className="text-fuchsia-300" />}
            </button>
            {expandedStore === loc && (
              <div className="px-6 pb-6 animate-in slide-in-from-top-2">
                <div className="grid grid-cols-1 gap-2 pt-4 border-t border-fuchsia-50">
                  {data.items.slice(0, 1).map((item:any) => (
                    <div key="top" className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Award className="text-amber-500" size={16} />
                        <span className="text-xs font-black uppercase text-amber-700">Líder de Estoque: {item.name}</span>
                      </div>
                      <span className="text-lg font-black text-amber-600">{item.kg.toFixed(1)}kg</span>
                    </div>
                  ))}
                  {data.items.map((item: any) => (
                    <div key={item.name} className="flex justify-between items-center p-3 hover:bg-fuchsia-50/30 rounded-xl transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full" />
                        <span className="text-xs font-bold text-gray-600">{item.name}</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-[10px] font-black text-fuchsia-300 uppercase">{item.count} un</span>
                        <span className="text-xs font-black text-fuchsia-600">{item.kg.toFixed(1)}kg</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Gráfico de Categorias Horizontal */}
      <section className="bg-white p-10 rounded-[56px] border border-fuchsia-50 shadow-sm">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-10 flex items-center gap-3">
          <BarChart3 size={18} className="text-fuchsia-500" /> Produção Total por Categoria (kg)
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={categoryGrams} margin={{ left: 20 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} width={100} />
              <Tooltip cursor={{ fill: '#fdf5ff' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
              <Bar dataKey="value" fill="#D946EF" radius={[0, 12, 12, 0]} barSize={32}>
                {categoryGrams.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Timeline de Produção Top 5 */}
      <section className="bg-white p-10 rounded-[56px] border border-fuchsia-50 shadow-sm">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-10 flex items-center gap-3">
          <TrendingUp size={18} className="text-fuchsia-500" /> Histórico de Produção: Top 5 Sabores (kg)
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineMultiData.data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
              <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              {timelineMultiData.flavors.map((f, i) => (
                <Line key={f} type="monotone" dataKey={f} stroke={COLORS[i % COLORS.length]} strokeWidth={4} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Itens Vendidos por Loja */}
      <section className="space-y-6">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3 px-4">
          <List size={18} className="text-fuchsia-500" /> Resumo de Vendas por Unidade
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STORES.map(s => (
            <div key={s} className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm">
              <h4 className="font-black text-gray-800 text-sm mb-6 pb-2 border-b border-fuchsia-50 flex items-center gap-2">
                 <StoreIcon size={16} className="text-fuchsia-300" /> {s}
              </h4>
              <div className="space-y-4">
                {salesByStoreReport[s].length === 0 ? (
                  <p className="text-[10px] text-gray-300 font-bold italic">Nenhuma venda registrada.</p>
                ) : (
                  salesByStoreReport[s].map((item:any) => (
                    <div key={item.flavor} className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-gray-400 truncate max-w-[100px]">{item.flavor}</span>
                        <span className="text-[9px] font-bold text-fuchsia-300">{item.count} baldes</span>
                      </div>
                      <span className="text-sm font-black text-fuchsia-600">{(item.grams/1000).toFixed(1)}kg</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Reports;
