
import React, { useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { STORES } from '../constants';
import { Search, Factory, Store, Package, Scale, AlertCircle } from 'lucide-react';

const AdminInventory: React.FC = () => {
  const { buckets, flavorsMap } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  
  const locations = ['Fábrica', ...STORES];

  const stockMatrix = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const matrix: any = {};

    buckets.filter(b => b.status === 'estoque').forEach(b => {
      const flavorName = flavorsMap[b.flavorId]?.name || 'Desconhecido';
      if (!flavorName.toLowerCase().includes(term)) return;

      if (!matrix[flavorName]) {
        matrix[flavorName] = { total: 0, units: {} };
        locations.forEach(loc => matrix[flavorName].units[loc] = 0);
      }
      matrix[flavorName].units[b.location] += b.grams;
      matrix[flavorName].total += b.grams;
    });

    return Object.entries(matrix).sort((a: any, b: any) => b[1].total - a[1].total);
  }, [buckets, flavorsMap, searchTerm]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <header className="bg-white p-6 rounded-[40px] border border-fuchsia-50 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Estoque Global</h2>
          <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mt-1">Gestão Central Lorenza</p>
        </div>
        <div className="w-12 h-12 magenta-gradient rounded-2xl flex items-center justify-center text-white shadow-lg">
          <Package size={24} />
        </div>
      </header>

      <div className="relative">
        <input 
          type="text" 
          placeholder="Pesquisar sabor..." 
          className="w-full bg-white rounded-3xl px-12 py-5 text-sm font-bold shadow-sm border border-fuchsia-50 outline-none focus:border-fuchsia-200 transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-fuchsia-200" />
      </div>

      <div className="space-y-4">
        {stockMatrix.map(([flavor, data]: any) => (
          <div key={flavor} className="bg-white p-6 rounded-[40px] border border-fuchsia-50 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-black text-gray-800 tracking-tight">{flavor}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Scale size={14} className="text-fuchsia-300" />
                  <span className="text-[10px] font-black text-fuchsia-500 uppercase">Total: {(data.total / 1000).toFixed(1)}kg</span>
                </div>
              </div>
              {data.total < 10000 && (
                <div className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-full flex items-center gap-2 text-[8px] font-black uppercase border border-amber-100">
                  <AlertCircle size={12} /> Baixo
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {locations.map(loc => (
                <div key={loc} className={`p-4 rounded-3xl border ${data.units[loc] > 0 ? 'bg-fuchsia-50/20 border-fuchsia-100' : 'bg-gray-50 border-transparent opacity-40'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {loc === 'Fábrica' ? <Factory size={12} className="text-gray-400" /> : <Store size={12} className="text-gray-400" />}
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{loc}</span>
                  </div>
                  <p className="text-sm font-black text-fuchsia-600">{(data.units[loc] / 1000).toFixed(1)}kg</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminInventory;
