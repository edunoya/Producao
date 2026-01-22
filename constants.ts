
import { Flavor, Category, StoreName } from './types';

const rawFlavors = [
  "Pistache liso", "Pistache mescla", "Doce de Leite", "Chocolate", "Baunilha", "Morango", "Limão", 
  "Café com Castanha", "Manga com Gengibre", "Casquinha Tradicional", "Casquinha sem Glúten", 
  "Crocante", "Amarula", "Choco veg", "Frutas vermelhas", "Limão siciliano com gengibre", 
  "Melancia com limão", "Chocolate branco com castanha de caju", "Pistache com chocolate branco", 
  "Açaí com tâmaras", "Mascarpone com goiabada", "Stracciatela", "Frutas vermelhas sem açúcar", 
  "Zambaglione", "Ameixa", "Abacate com limão", "Pêssego", "Butiá com rapadura", 
  "Uva morango e limão", "Amendoim vegano", "Manga com tamaras", "Iogurte com frutas vermelhas", 
  "Melão Dissarono", "Castanha do Pará", "Creme", "Amora com cardamomo", 
  "Nozes com chocolate branco", "Gengibre", "Tâmaras com cacau", "Framboesa", 
  "Butiá com caldo de cana", "Maracujá"
];

const getInitials = (name: string): string => {
  const words = name.split(' ');
  if (words.length >= 3) return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  if (words.length === 2) return (words[0][0] + words[1][0] + words[1][1]).toUpperCase();
  return (name.substring(0, 3)).toUpperCase();
};

export const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Cremosos' },
  { id: '2', name: 'Frutas (Sorbet)' },
  { id: '3', name: 'Especiais' },
  { id: '4', name: 'Veganos' }
];

export const INITIAL_FLAVORS: Flavor[] = rawFlavors.map((name, index) => ({
  id: String(index + 1),
  name,
  initials: getInitials(name),
  categoryId: name.toLowerCase().includes('vegano') || name.toLowerCase().includes('veg') ? '4' : '1',
  isActive: true
}));

// Fixed: Added StoreName to imports from types.ts to resolve compilation error.
export const STORES: StoreName[] = ['Campo Duna', 'Casa Kimo', 'Rosa'];
export const LOW_STOCK_THRESHOLD_GRAMS = 10000;
