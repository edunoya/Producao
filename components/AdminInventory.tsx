
import React, { useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { STORES } from '../constants';
import { 
  ClipboardList, Search, Factory, Store, Package, 
  ChevronRight, AlertCircle, Filter, Scale 
} from 'lucide-react';

const AdminInventory: React.FC = () => {
  const { buckets, flavorsMap, isSyncing } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLoc, setFilterLoc] = useState<string>('all');

  const locations = ['Fábrica', ...STORES];

  const stockMatrix = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const matrix: any = {};

    buckets.filter(b => b.status === 'estoque').forEach(b => {
      const flavorName = flavorsMap[b.flavorId]?.name || 'Desconhecido';
      if (!flavorName.toLowerCase().includes(term)) return;
      if (filterLoc !== 'all' && b.location !== filterLoc) return;

      if (!matrix[flavorName]) {
        matrix[flavorName] = { total: 0, units: {} };
        locations.forEach(loc => matrix[flavorName].units[loc] = 0);
      }
      
      matrix[flavorName].units[b.location] += b.grams;
      matrix[flavorName].total += b.grams;
    });

    return Object.entries(matrix).sort((a: any, b: any) => b[1].total - a[1].total);
  }, [buckets, flavorsMap, searchTerm, filterLoc]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Estoque Global</h2>
          <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mt-1">Visão Geral Fábrica + Lojas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select 
            className="bg-fuchsia-50/50 text-[10px] font-black uppercase px-4 py-2 rounded-xl outline-none text-fuchsia-600 border border-fuchsia-100"
            value={filterLoc}
            onChange={(e) => setFilterLoc(e.target.value)}
          >
            <option value="all">Todas Unidades</option>
            {locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </header>

      <div className="relative">
        <input 
          type="text" 
          placeholder="Pesquisar sabor..." 
          className="w-full bg-white rounded-2xl px-12 py-4 text-sm font-bold shadow-sm border border-fuchsia-50 outline-none focus:border-fuchsia-200 transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-200" />
      </div>

      <div className="space-y-4">
        {stockMatrix.map(([flavor, data]: any) => (
          <div key={flavor} className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm group hover:border-fuchsia-100 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-black text-gray-800 tracking-tight">{flavor}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Scale size={12} className="text-fuchsia-300" />
                  <span className="text-[10px] font-black text-fuchsia-500 uppercase">Total: {(data.total / 1000).toFixed(1)}kg</span>
                </div>
              </div>
              {data.total < 10000 && (
                <div className="bg-amber-50 text-amber-600 p-2 rounded-xl flex items-center gap-2 text-[8px] font-black uppercase border border-amber-100">
                  <AlertCircle size={12} /> Estoque Baixo
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {locations.map(loc => {
                const val = data.units[loc];
                const isFactory = loc === 'Fábrica';
                
                return (
                  <div key={loc} className={`p-4 rounded-2xl border ${val > 0 ? 'bg-fuchsia-50/20 border-fuchsia-50' : 'bg-gray-50/30 border-gray-100 opacity-40'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {isFactory ? <Factory size={10} className="text-gray-400" /> : <Store size={10} className="text-gray-400" />}
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{loc}</span>
                    </div>
                    <p className={`text-sm font-black ${val > 0 ? 'text-fuchsia-600' : 'text-gray-300'}`}>
                      {(val / 1000).toFixed(1)}kg
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {stockMatrix.length === 0 && (
          <div className="py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-fuchsia-50">
            <Package size={48} className="mx-auto text-fuchsia-100 mb-4" />
            <p className="text-gray-400 font-bold italic">Nenhum estoque encontrado para esta busca.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInventory;
