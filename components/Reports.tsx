
import React, { useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Download, TrendingUp, Package, Calendar, BarChart3, PieChart as PieIcon } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend 
} from 'recharts';

const COLORS = ['#D946EF', '#A21CAF', '#F472B6', '#F0ABFC', '#701A75'];

const Reports: React.FC = () => {
  const { productionLogs, flavors, categories, exportToCSV } = useInventory();
  const [dateRange, setDateRange] = useState({ 
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const filteredData = useMemo(() => {
    return productionLogs.filter(l => {
      const d = l.date.toISOString().split('T')[0];
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [productionLogs, dateRange]);

  // Analytics Transformations
  const timelineData = useMemo(() => {
    const daily: any = {};
    filteredData.forEach(l => {
      const d = l.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const total = l.entries.reduce((a, b) => a + b.totalGrams, 0) / 1000;
      daily[d] = (daily[d] || 0) + total;
    });
    return Object.entries(daily).map(([name, kg]) => ({ name, kg }));
  }, [filteredData]);

  const flavorRanking = useMemo(() => {
    const ranking: any = {};
    filteredData.forEach(l => {
      l.entries.forEach(e => {
        const name = flavors.find(f => f.id === e.flavorId)?.name || 'Outros';
        ranking[name] = (ranking[name] || 0) + e.totalGrams / 1000;
      });
    });
    return Object.entries(ranking)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, kg]) => ({ name, kg }));
  }, [filteredData, flavors]);

  const categoryDistribution = useMemo(() => {
    const dist: any = {};
    filteredData.forEach(l => {
      l.entries.forEach(e => {
        const flavor = flavors.find(f => f.id === e.flavorId);
        const cat = categories.find(c => c.id === flavor?.categoryIds[0])?.name || 'Outros';
        dist[cat] = (dist[cat] || 0) + e.totalGrams / 1000;
      });
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [filteredData, flavors, categories]);

  const totalKg = timelineData.reduce((a, b) => a + b.kg, 0);

  return (
    <div className="space-y-8 pb-32">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Performance</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Análise de Produção</p>
        </div>
        <button onClick={exportToCSV} className="bg-green-500 text-white p-4 rounded-2xl shadow-xl shadow-green-100"><Download size={20} /></button>
      </header>

      {/* Date Filters */}
      <div className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full space-y-2">
           <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest ml-2">De</label>
           <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full bg-fuchsia-50/30 p-3 rounded-xl border-none font-bold text-gray-600 outline-none" />
        </div>
        <div className="flex-1 w-full space-y-2">
           <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest ml-2">Até</label>
           <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full bg-fuchsia-50/30 p-3 rounded-xl border-none font-bold text-gray-600 outline-none" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm">
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Massa Total</p>
           <h4 className="text-3xl font-black text-fuchsia-600">{totalKg.toFixed(1)}kg</h4>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm">
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Batidas</p>
           <h4 className="text-3xl font-black text-gray-800">{filteredData.length}</h4>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="bg-white p-6 rounded-[40px] border border-fuchsia-50 shadow-sm">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <TrendingUp size={16} className="text-fuchsia-500" /> Evolução Diária (kg)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
              <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} />
              <Line type="monotone" dataKey="kg" stroke="#D946EF" strokeWidth={4} dot={{r: 4, fill: '#D946EF', strokeWidth: 0}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row: Pie & Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-[40px] border border-fuchsia-50 shadow-sm">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <PieIcon size={16} className="text-fuchsia-500" /> Mix por Categoria
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryDistribution} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {categoryDistribution.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{fontSize: 10, fontWeight: 800, textTransform: 'uppercase'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[40px] border border-fuchsia-50 shadow-sm">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <BarChart3 size={16} className="text-fuchsia-500" /> Top 5 Sabores (kg)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={flavorRanking}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 800}} />
                <Tooltip />
                <Bar dataKey="kg" fill="#D946EF" radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
