
import React, { useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { STORES } from '../constants';
import { Filter, Search, Tag, MapPin, Calendar, Package, Store } from 'lucide-react';

const InventoryList: React.FC = () => {
  const { buckets, flavors, categories } = useInventory();
  const [filterStore, setFilterStore] = useState<string>('Todos');
  const [filterCategory, setFilterCategory] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBuckets = buckets.filter(b => {
    const flavor = flavors.find(f => f.id === b.flavorId);
    const category = categories.find(c => c.id === flavor?.categoryId);
    const matchesStore = filterStore === 'Todos' || b.location === filterStore;
    const matchesCategory = filterCategory === 'Todos' || category?.id === filterCategory;
    const matchesSearch = flavor?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStore && matchesCategory && matchesSearch;
  });

  // Cálculos de Resumo
  const getWeightByLocation = (loc: string) => buckets.filter(b => b.location === loc).reduce((acc, b) => acc + b.grams, 0) / 1000;
  const totalGlobalKg = buckets.reduce((acc, b) => acc + b.grams, 0) / 1000;

  return (
    <div className="space-y-8">
      {/* Resumo Visual Superior */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-rose-500 p-4 rounded-2xl text-white shadow-lg shadow-rose-100 flex flex-col justify-between">
           <Package size={20} className="mb-2 opacity-80" />
           <div>
             <p className="text-[10px] font-bold uppercase opacity-80">Total Geral</p>
             <p className="text-xl font-bold">{totalGlobalKg.toFixed(1)}kg</p>
           </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
           <Store size={20} className="mb-2 text-sky-400" />
           <div>
             <p className="text-[10px] font-bold text-gray-400 uppercase">Fábrica</p>
             <p className="text-xl font-bold text-gray-800">{getWeightByLocation('Fábrica').toFixed(1)}kg</p>
           </div>
        </div>
        {STORES.map(s => (
          <div key={s} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <MapPin size={20} className="mb-2 text-rose-400" />
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{s}</p>
              <p className="text-xl font-bold text-gray-800">{getWeightByLocation(s).toFixed(1)}kg</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por sabor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-100 outline-none"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
            <MapPin size={14} className="text-gray-400" />
            <select 
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-700 outline-none"
            >
              <option value="Todos">Todas Unidades</option>
              <option value="Fábrica">Fábrica</option>
              {STORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
            <Tag size={14} className="text-gray-400" />
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-700 outline-none"
            >
              <option value="Todos">Categorias</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Sabor</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Localização</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase text-center">Peso</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">ID / Produção</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredBuckets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">Nenhum balde encontrado.</td>
                </tr>
              ) : (
                filteredBuckets.map(b => {
                  const flavor = flavors.find(f => f.id === b.flavorId);
                  const category = categories.find(c => c.id === flavor?.categoryId);
                  return (
                    <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-800">{flavor?.name}</span>
                          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{category?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                          b.location === 'Fábrica' ? 'bg-orange-50 text-orange-600' : 'bg-sky-50 text-sky-600'
                        }`}>
                          {b.location}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-center text-gray-600">
                        {b.grams}g
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-mono font-bold text-gray-800">{b.id}</span>
                           <span className="text-[9px] text-gray-400 italic">{b.producedAt.toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${b.status === 'estoque' ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase">{b.status}</span>
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryList;
