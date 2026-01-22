
import React, { useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Save, Tag, Info, ListFilter, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Flavor, Category } from '../types';

const Settings: React.FC = () => {
  const { flavors, updateFlavor, categories, addCategory, updateCategory, deleteCategory } = useInventory();
  
  // States Sabores
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Flavor | null>(null);
  
  // States Categorias
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatForm, setEditCatForm] = useState<Category | null>(null);

  const handleStartEdit = (f: Flavor) => {
    setEditingId(f.id);
    setEditForm({ ...f });
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

  const handleSaveCategory = () => {
    if (editCatForm) {
      updateCategory(editCatForm);
      setEditingCatId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Gestão de Categorias */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <ListFilter size={20} className="text-rose-400" />
          Categorias de Gelato
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
             <label className="text-xs font-bold text-gray-400 uppercase">Adicionar Categoria</label>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="Ex: Novos Sabores..."
                 value={newCatName}
                 onChange={(e) => setNewCatName(e.target.value)}
                 className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100"
               />
               <button 
                 onClick={handleAddCategory}
                 className="bg-rose-500 text-white p-2.5 rounded-xl shadow-lg shadow-rose-100 hover:bg-rose-600 transition-all"
               >
                 <Plus size={20} />
               </button>
             </div>
          </div>
          <div className="space-y-2">
             <label className="text-xs font-bold text-gray-400 uppercase">Categorias Atuais</label>
             <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
               {categories.map(c => (
                 <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                   {editingCatId === c.id ? (
                      <input 
                        className="bg-white border border-rose-200 rounded-lg px-2 py-1 text-sm outline-none w-full mr-2"
                        value={editCatForm?.name}
                        onChange={(e) => setEditCatForm({ ...editCatForm!, name: e.target.value })}
                        onBlur={handleSaveCategory}
                        autoFocus
                      />
                   ) : (
                      <span className="text-sm font-bold text-gray-700">{c.name}</span>
                   )}
                   <div className="flex gap-1">
                     <button onClick={() => { setEditingCatId(c.id); setEditCatForm(c); }} className="p-1.5 text-gray-400 hover:text-sky-500"><Info size={14} /></button>
                     <button onClick={() => deleteCategory(c.id)} className="p-1.5 text-gray-400 hover:text-rose-500"><Trash2 size={14} /></button>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>

      {/* Gestão de Sabores */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Gerenciar Sabores</h3>
            <p className="text-sm text-gray-400">Ative/Desative ou edite informações dos gelatos.</p>
          </div>
        </div>

        <div className="space-y-3">
          {flavors.map(f => (
            <div key={f.id} className={`border border-gray-50 rounded-2xl p-4 transition-all ${f.isActive ? 'bg-gray-50/30' : 'bg-gray-100/50 opacity-60 grayscale'}`}>
              {editingId === f.id ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome</label>
                      <input 
                        type="text" 
                        value={editForm?.name} 
                        onChange={e => setEditForm(prev => prev ? {...prev, name: e.target.value} : null)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Categoria</label>
                      <select 
                        value={editForm?.categoryId}
                        onChange={e => setEditForm(prev => prev ? {...prev, categoryId: e.target.value} : null)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none"
                      >
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                       <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Status de Produção</label>
                       <button 
                        onClick={() => setEditForm(prev => prev ? {...prev, isActive: !prev.isActive} : null)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border ${editForm?.isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}
                       >
                         {editForm?.isActive ? <CheckCircle2 size={16}/> : <XCircle size={16}/>}
                         {editForm?.isActive ? 'Ativo na Lista' : 'Desativado'}
                       </button>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Notas Extras</label>
                      <input 
                        value={editForm?.description || ''}
                        onChange={e => setEditForm(prev => prev ? {...prev, description: e.target.value} : null)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-gray-400 font-bold">Cancelar</button>
                    <button onClick={handleSaveFlavor} className="bg-rose-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-rose-100 flex items-center gap-2">
                      <Save size={16} /> Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-mono text-xs font-bold ${f.isActive ? 'bg-white border-gray-100 text-gray-400' : 'bg-gray-200 border-transparent text-gray-500'}`}>
                      {f.initials}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-700">{f.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full font-bold uppercase">
                          {categories.find(c => c.id === f.categoryId)?.name || 'Sem Categoria'}
                        </span>
                        {!f.isActive && <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase">Inativo</span>}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleStartEdit(f)}
                    className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
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
