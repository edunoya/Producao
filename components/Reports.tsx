
import React, { useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Calendar, FileText, TrendingUp, Award, 
  Scale, Package, FileSpreadsheet, Download 
} from 'lucide-react';

const Reports: React.FC = () => {
  const { productionLogs, flavors, categories, exportToCSV } = useInventory();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredLogs = useMemo(() => {
    return productionLogs.filter(log => {
      const d = new Date(log.date);
      d.setHours(0,0,0,0);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return d >= start && d <= end;
    });
  }, [productionLogs, startDate, endDate]);

  const stats = useMemo(() => {
    const totalGrams = filteredLogs.reduce((acc, l) => acc + l.totalGrams, 0);
    const totalBuckets = filteredLogs.reduce((acc, l) => acc + l.bucketCount, 0);
    const flavorCounts: Record<string, number> = {};
    
    filteredLogs.forEach(l => {
      flavorCounts[l.flavorId] = (flavorCounts[l.flavorId] || 0) + l.totalGrams;
    });

    const topFlavorId = Object.entries(flavorCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topFlavor = flavors.find(f => f.id === topFlavorId)?.name || 'N/A';

    return {
      totalKg: totalGrams / 1000,
      totalBuckets,
      avgWeight: totalBuckets > 0 ? (totalGrams / totalBuckets).toFixed(0) : 0,
      topFlavor
    };
  }, [filteredLogs, flavors]);

  const timeData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLogs.forEach(l => {
      const day = l.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      map[day] = (map[day] || 0) + l.totalGrams / 1000;
    });
    return Object.entries(map).map(([name, kg]) => ({ name, kg }));
  }, [filteredLogs]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLogs.forEach(l => {
      const flavor = flavors.find(f => f.id === l.flavorId);
      const catId = flavor?.categoryIds[0] || '1';
      const catName = categories.find(c => c.id === catId)?.name || 'Outros';
      map[catName] = (map[catName] || 0) + l.totalGrams / 1000;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredLogs, flavors, categories]);

  const COLORS = ['#D946EF', '#F472B6', '#818CF8', '#34D399', '#FB923C'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Cabeçalho e Filtros */}
      <div className="bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <FileText className="text-fuchsia-500" />
            Relatórios de Produção
          </h2>
          <p className="text-sm text-gray-400">Análise de desempenho da Produção Lorenza</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-fuchsia-50/50 p-2 rounded-2xl border border-fuchsia-50">
          <div className="flex items-center gap-2 px-3">
            <Calendar size={14} className="text-fuchsia-400" />
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer"
            />
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-2 px-3">
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer"
            />
          </div>
          <button 
            onClick={exportToCSV}
            className="ml-2 flex items-center gap-2 bg-fuchsia-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-fuchsia-100 hover:bg-fuchsia-600 transition-all"
          >
            <Download size={14} /> Exportar
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Volume Total', value: `${stats.totalKg.toFixed(1)}kg`, icon: Scale, color: 'bg-fuchsia-500' },
          { label: 'Total de Baldes', value: `${stats.totalBuckets} un`, icon: Package, color: 'bg-indigo-500' },
          { label: 'Média/Balde', value: `${stats.avgWeight}g`, icon: TrendingUp, color: 'bg-rose-500' },
          { label: 'Sabor Líder', value: stats.topFlavor, icon: Award, color: 'bg-amber-500' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-fuchsia-50 shadow-sm flex flex-col gap-3">
            <div className={`w-10 h-10 ${item.color} rounded-2xl flex items-center justify-center text-white shadow-lg opacity-80`}>
              <item.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.label}</p>
              <p className="text-lg font-black text-gray-800 truncate">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <TrendingUp size={14} /> Produção Diária (kg)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FDF2F8" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#A1A1AA'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#A1A1AA'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: 'bold', color: '#D946EF' }}
                />
                <Line type="monotone" dataKey="kg" stroke="#D946EF" strokeWidth={4} dot={{ r: 4, fill: '#D946EF' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Package size={14} /> Mix de Categorias
          </h3>
          <div className="h-64 flex flex-col md:flex-row items-center">
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 pr-4">
              {categoryData.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Histórico Detalhado */}
      <div className="bg-white rounded-3xl border border-fuchsia-50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-fuchsia-50 flex justify-between items-center">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Logs de Batidas (Lotes)</h3>
          <span className="text-[10px] font-bold bg-fuchsia-50 text-fuchsia-500 px-3 py-1 rounded-full">
            {filteredLogs.length} Registros
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-fuchsia-50/20 text-[10px] font-black text-fuchsia-400 uppercase">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Sabor</th>
                <th className="px-6 py-4 text-center">Baldes</th>
                <th className="px-6 py-4 text-right">Massa Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fuchsia-50/50">
              {filteredLogs.sort((a,b) => b.date.getTime() - a.date.getTime()).map(log => {
                const flavor = flavors.find(f => f.id === log.flavorId);
                return (
                  <tr key={log.id} className="hover:bg-fuchsia-50/20 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-gray-500">{log.date.toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-black text-gray-800">{flavor?.name}</td>
                    <td className="px-6 py-4 text-center text-xs font-bold text-gray-400">{log.bucketCount} un</td>
                    <td className="px-6 py-4 text-right text-sm font-black text-fuchsia-600">{log.totalGrams/1000}kg</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
