
import React from 'react';
import { useInventory } from '../store/InventoryContext';
import { FileSpreadsheet, Download, TrendingUp, Package, Store } from 'lucide-react';

const Reports: React.FC = () => {
  const { productionLogs, storeClosingLogs, exportToCSV, flavors } = useInventory();

  const totalProducedKg = productionLogs.reduce((a, b) => a + b.totalGrams, 0) / 1000;
  const totalProducedBuckets = productionLogs.reduce((a, b) => a + b.bucketCount, 0);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-gray-800 tracking-tight">Relatórios</h2>
        <button 
          onClick={exportToCSV}
          className="bg-green-500 text-white p-3 rounded-2xl flex items-center gap-2 text-xs font-black uppercase shadow-lg shadow-green-100"
        >
          <Download size={16} /> CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm flex flex-col gap-2">
          <TrendingUp className="text-fuchsia-500" size={24} />
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Produção Total</p>
            <p className="text-2xl font-black text-gray-800">{totalProducedKg.toFixed(1)}kg</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm flex flex-col gap-2">
          <Package className="text-indigo-500" size={24} />
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Baldes</p>
            <p className="text-2xl font-black text-gray-800">{totalProducedBuckets}un</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Store size={14} /> Histórico de Lojas
        </h3>
        <div className="space-y-3">
          {storeClosingLogs.length === 0 ? (
            <p className="text-center text-gray-300 text-xs italic py-10">Nenhum inventário de loja registrado.</p>
          ) : (
            storeClosingLogs.map(log => (
              <div key={log.id} className="flex justify-between items-center p-4 bg-fuchsia-50/20 rounded-2xl border border-fuchsia-50">
                <div>
                  <p className="text-sm font-black text-gray-700 uppercase tracking-tighter">{log.storeName}</p>
                  <p className="text-[10px] text-gray-400">{new Date(log.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-fuchsia-600">{log.totalKg.toFixed(1)}kg</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Em Vitrine</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <TrendingUp size={14} /> Histórico de Produção
        </h3>
        <div className="space-y-2">
          {productionLogs.slice(0, 10).map(log => (
            <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50/50 rounded-xl">
               <span className="text-xs font-bold text-gray-700">{flavors.find(f=>f.id===log.flavorId)?.name}</span>
               <span className="text-xs font-black text-fuchsia-500">{log.totalGrams/1000}kg</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Reports;
