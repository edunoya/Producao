import React, { useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Save, Tag, Info, ListFilter, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Flavor, Category } from '../types';

const Settings: React.FC = () => {
  const { flavors, updateFlavor, categories, addCategory, updateCategory, deleteCategory } = useInventory();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Flavor | null>(null);
  
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatForm, setEditCatForm] = useState<Category | null>(null);

  const handleStartEdit = (f: Flavor) => {
    setEditingId(f.id);
    setEditForm({ ...f });
  };

  const toggleCategoryInFlavor = (catId: string) => {
    if (!editForm) return;
    const current = editForm.categoryIds || [];
    const updated = current.includes(catId) 
      ? current.filter(id => id !== catId)
      : [...current, catId];
    setEditForm({ ...editForm, categoryIds: updated });
  };

  const handleSaveFlavor = () => {
    if (editForm) {
      updateFlavor(editForm);
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleAddCategory = () => {
    if (newCatName.trim()) {
      addCategory(newCatName);
      setNewCatName('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-fuchsia-50 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-8 flex items-center gap-2 uppercase tracking-widest text-xs">
          <ListFilter size={18} className="text-fuchsia-400" />
          Categorias Lorenza
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nova Categoria</label>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="Ex: Zero Açúcar..."
                 value={newCatName}
                 onChange={(e) => setNewCatName(e.target.value)}
                 className="flex-1 bg-fuchsia-50/50 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-fuchsia-100"
               />
               <button 
                 onClick={handleAddCategory}
                 className="magenta-gradient text-white p-3 rounded-xl shadow-lg shadow-fuchsia-100 hover:scale-105 transition-all"
               >
                 <Plus size={24} />
               </button>
             </div>
          </div>
          <div className="space-y-3">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Atuais</label>
             <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-2">
               {categories.map(c => (
                 <div key={c.id} className="flex items-center justify-between p-4 bg-fuchsia-50/20 rounded-2xl border border-fuchsia-50/50 group">
                   <span className="text-sm font-bold text-gray-700">{c.name}</span>
                   <button onClick={() => deleteCategory(c.id)} className="p-2 text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                     <Trash2 size={16} />
                   </button>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-fuchsia-50 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-8 uppercase tracking-widest text-xs">Catálogo de Sabores</h3>
        <div className="grid grid-cols-1 gap-3">
          {flavors.sort((a,b) => a.name.localeCompare(b.name)).map(f => (
            <div key={f.id} className={`border border-fuchsia-50 rounded-2xl p-4 transition-all ${f.isActive ? 'bg-white' : 'bg-gray-50 opacity-40 grayscale shadow-none'}`}>
              {editingId === f.id ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Nome do Gelato</label>
                      <input 
                        type="text" 
                        value={editForm?.name} 
                        onChange={e => setEditForm(prev => prev ? {...prev, name: e.target.value} : null)}
                        className="w-full bg-fuchsia-50/30 border border-fuchsia-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Sigla/ID</label>
                      <input 
                        type="text" 
                        value={editForm?.initials} 
                        maxLength={4}
                        onChange={e => setEditForm(prev => prev ? {...prev, initials: e.target.value.toUpperCase()} : null)}
                        className="w-full bg-fuchsia-50/30 border border-fuchsia-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-3">Categorias Relacionadas (Múltiplas)</label>
                    <div className="flex flex-wrap gap-2">
                       {categories.map(c => (
                         <button
                          key={c.id}
                          onClick={() => toggleCategoryInFlavor(c.id)}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${
                            editForm?.categoryIds?.includes(c.id)
                              ? 'bg-fuchsia-500 border-fuchsia-500 text-white'
                              : 'bg-white border-fuchsia-100 text-fuchsia-300 hover:border-fuchsia-300'
                          }`}
                         >
                           {c.name}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-4 border-t border-fuchsia-50">
                    <button 
                      onClick={() => setEditForm(prev => prev ? {...prev, isActive: !prev.isActive} : null)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase border ${editForm?.isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}
                    >
                      {editForm?.isActive ? 'Disponível' : 'Indisponível'}
                    </button>
                    <div className="flex-1 flex justify-end gap-3">
                      <button onClick={() => setEditingId(null)} className="text-xs font-bold text-gray-400 px-4">Voltar</button>
                      <button onClick={handleSaveFlavor} className="magenta-gradient text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-fuchsia-100">
                        Gravar Alterações
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-fuchsia-50 text-fuchsia-300 flex items-center justify-center font-mono text-[10px] font-black">
                      {f.initials}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-700">{f.name}</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {f.categoryIds?.map(catId => (
                          <span key={catId} className="text-[8px] font-black uppercase bg-fuchsia-50/50 text-fuchsia-400 px-1.5 py-0.5 rounded border border-fuchsia-50">
                            {categories.find(c => c.id === catId)?.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleStartEdit(f)}
                    className="p-3 text-fuchsia-200 hover:text-fuchsia-500 hover:bg-fuchsia-50 rounded-xl transition-all"
                  >
                    <Info size={18} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;