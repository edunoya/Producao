
import React from 'react';
import { useInventory } from '../store/InventoryContext';
// Added missing Calculator import
import { FileSpreadsheet, Download, TrendingUp, Package, Store, Calendar, ArrowRight, Calculator } from 'lucide-react';

const Reports: React.FC = () => {
  const { productionLogs, storeClosingLogs, exportToCSV, flavors, resetDatabase } = useInventory();

  const totalProducedKg = productionLogs.reduce((a, b) => a + b.totalGrams, 0) / 1000;
  const totalProducedBuckets = productionLogs.reduce((a, b) => a + b.bucketCount, 0);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Relatórios</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Performance Lorenza</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="bg-green-500 text-white p-4 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-green-100 active:scale-95 transition-all"
        >
          <Download size={18} /> Exportar CSV
        </button>
      </header>

      {/* KPI's de Performance */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm space-y-3">
          <div className="w-10 h-10 bg-fuchsia-50 rounded-xl flex items-center justify-center text-fuchsia-500">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Massa Produzida</p>
            <p className="text-3xl font-black text-gray-800 tracking-tighter">{totalProducedKg.toFixed(1)}kg</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm space-y-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
            <Package size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Baldes</p>
            <p className="text-3xl font-black text-gray-800 tracking-tighter">{totalProducedBuckets}un</p>
          </div>
        </div>
      </div>

      {/* Histórico por Unidade */}
      <div className="bg-white p-7 rounded-[40px] border border-fuchsia-50 shadow-sm">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Store size={16} className="text-fuchsia-400" /> Histórico das Lojas
        </h3>
        <div className="space-y-3">
          {storeClosingLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-300 font-bold italic">Nenhum inventário de loja registrado.</div>
          ) : (
            storeClosingLogs.slice(0, 10).map(log => (
              <div key={log.id} className="flex justify-between items-center p-5 bg-fuchsia-50/20 rounded-2xl border border-fuchsia-50 transition-all hover:bg-white hover:shadow-md">
                <div>
                  <p className="text-sm font-black text-gray-800 uppercase tracking-tight">{log.storeName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 opacity-50">
                    <Calendar size={10} />
                    <span className="text-[9px] font-bold">{new Date(log.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-fuchsia-600 tracking-tighter">{log.totalKg.toFixed(1)}kg</p>
                  <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Em Vitrine</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Listagem de Produção Recente */}
      <div className="bg-white p-7 rounded-[40px] border border-fuchsia-50 shadow-sm">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Calculator size={16} className="text-fuchsia-400" /> Últimas Batidas
        </h3>
        <div className="space-y-2">
          {productionLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-300 font-bold italic">Nenhuma produção registrada ainda.</div>
          ) : (
            productionLogs.slice(0, 8).map(log => {
              const flavor = flavors.find(f => f.id === log.flavorId);
              return (
                <div key={log.id} className="flex justify-between items-center p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-mono text-[10px] font-black text-fuchsia-300">
                      {flavor?.initials}
                    </div>
                    <span className="text-xs font-bold text-gray-700">{flavor?.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <span className="text-sm font-black text-fuchsia-500 tracking-tighter">{log.totalGrams}g</span>
                     <ArrowRight size={14} className="text-gray-200" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="pt-10">
        <button 
          onClick={resetDatabase}
          className="w-full py-5 bg-rose-50 text-rose-500 rounded-[28px] text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm"
        >
          Zerar Banco de Dados (Cuidado!)
        </button>
      </div>
    </div>
  );
};

export default Reports;
