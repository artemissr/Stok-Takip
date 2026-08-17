import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type MainCategory = 'Bar' | 'Mutfak' | 'Tezgah';
export type Area = 'Soğuk depo' | 'Kuru depo' | 'Bar' | 'Dondurucu' | 'Sarf malzeme';

export const MAIN_CATEGORIES: MainCategory[] = ['Bar', 'Mutfak', 'Tezgah'];
export const AREAS: Area[] = ['Soğuk depo', 'Kuru depo', 'Bar', 'Dondurucu', 'Sarf malzeme'];

export type Subcategory = {
  id: string;
  name: string;
  mainCategory: MainCategory;
};

export type Ingredient = {
  id: string;
  name: string;
  unit: string;
  buyPrice: number;
  salePrice: number;
  area: Area;
  mainCategory: MainCategory;
  subcategoryId?: string;
  threshold: number;
  content: string;
  calories: number;
  allergens: string[];
  barcode?: string;
};

export type Batch = {
  id: string;
  ingredientId: string;
  quantity: number;
  expiryDate: string;
  receivedAt: string;
  area: Area;
  imageUri?: string;
};

export type RecipeIngredient = {
  ingredientId: string;
  quantity: number;
};

export type Recipe = {
  id: string;
  name: string;
  salePrice: number;
  ingredients: RecipeIngredient[];
};

export type Sale = {
  id: string;
  recipeId: string;
  quantity: number;
  date: string;
};

export type ReturnRecord = {
  id: string;
  ingredientId: string;
  quantity: number;
  date: string;
  reason: string;
};

type InventoryData = {
  ingredients: Ingredient[];
  batches: Batch[];
  recipes: Recipe[];
  sales: Sale[];
  returns: ReturnRecord[];
  subcategories: Subcategory[];
  schedules: {
    orderDays: number[];
    shipmentDays: number[];
  };
};

const STORAGE_KEY = '@mutfak-stok-takibi/v1';
const id = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const dateFromToday = (offset: number) => {
  const value = new Date();
  value.setHours(12, 0, 0, 0);
  value.setDate(value.getDate() + offset);
  return value.toISOString().slice(0, 10);
};

export const today = () => new Date().toISOString().slice(0, 10);

export const starterData: InventoryData = {
  ingredients: [
    { id: 'ingredient-tomato', name: 'Domates', unit: 'kg', buyPrice: 42, salePrice: 75, area: 'Soğuk depo', mainCategory: 'Mutfak', threshold: 8, content: 'Taze kırmızı domates', calories: 18, allergens: [] },
    { id: 'ingredient-mozzarella', name: 'Mozzarella', unit: 'kg', buyPrice: 180, salePrice: 320, area: 'Soğuk depo', mainCategory: 'Mutfak', threshold: 4, content: 'İnek sütü, peynir kültürü, tuz', calories: 280, allergens: ['Süt'] },
    { id: 'ingredient-pasta', name: 'Penne makarna', unit: 'kg', buyPrice: 58, salePrice: 96, area: 'Kuru depo', mainCategory: 'Mutfak', threshold: 10, content: 'Durum buğdayı irmiği, su', calories: 350, allergens: ['Gluten'] },
    { id: 'ingredient-basil', name: 'Taze fesleğen', unit: 'demet', buyPrice: 35, salePrice: 70, area: 'Soğuk depo', mainCategory: 'Mutfak', threshold: 5, content: 'Taze fesleğen yaprakları', calories: 23, allergens: [] },
    { id: 'ingredient-beans', name: 'Espresso çekirdeği', unit: 'kg', buyPrice: 480, salePrice: 720, area: 'Bar', mainCategory: 'Bar', threshold: 2, content: 'Arabica kahve çekirdeği', calories: 2, allergens: [], barcode: '8690000000011' },
    { id: 'ingredient-milk', name: 'Süt', unit: 'L', buyPrice: 38, salePrice: 65, area: 'Soğuk depo', mainCategory: 'Bar', threshold: 10, content: 'Pastörize inek sütü', calories: 61, allergens: ['Süt'], barcode: '8690000000028' },
  ],
  batches: [
    { id: 'batch-tomato', ingredientId: 'ingredient-tomato', quantity: 14, expiryDate: dateFromToday(2), receivedAt: today(), area: 'Soğuk depo' },
    { id: 'batch-mozzarella', ingredientId: 'ingredient-mozzarella', quantity: 5, expiryDate: dateFromToday(1), receivedAt: today(), area: 'Soğuk depo' },
    { id: 'batch-pasta', ingredientId: 'ingredient-pasta', quantity: 24, expiryDate: dateFromToday(65), receivedAt: today(), area: 'Kuru depo' },
    { id: 'batch-basil', ingredientId: 'ingredient-basil', quantity: 12, expiryDate: dateFromToday(4), receivedAt: today(), area: 'Soğuk depo' },
    { id: 'batch-beans', ingredientId: 'ingredient-beans', quantity: 6, expiryDate: dateFromToday(30), receivedAt: today(), area: 'Bar' },
    { id: 'batch-milk', ingredientId: 'ingredient-milk', quantity: 18, expiryDate: dateFromToday(2), receivedAt: today(), area: 'Soğuk depo' },
  ],
  recipes: [
    {
      id: 'recipe-pesto',
      name: 'Pestolu penne',
      salePrice: 280,
      ingredients: [
        { ingredientId: 'ingredient-pasta', quantity: 0.18 },
        { ingredientId: 'ingredient-tomato', quantity: 0.12 },
        { ingredientId: 'ingredient-mozzarella', quantity: 0.08 },
        { ingredientId: 'ingredient-basil', quantity: 0.1 },
      ],
    },
    {
      id: 'recipe-pasta',
      name: 'Domatesli makarna',
      salePrice: 240,
      ingredients: [
        { ingredientId: 'ingredient-pasta', quantity: 0.2 },
        { ingredientId: 'ingredient-tomato', quantity: 0.16 },
        { ingredientId: 'ingredient-mozzarella', quantity: 0.04 },
      ],
    },
    {
      id: 'recipe-flatwhite',
      name: 'Flat white',
      salePrice: 150,
      ingredients: [
        { ingredientId: 'ingredient-beans', quantity: 0.018 },
        { ingredientId: 'ingredient-milk', quantity: 0.2 },
      ],
    },
  ],
  sales: [
    { id: 'sale-1', recipeId: 'recipe-pesto', quantity: 11, date: today() },
    { id: 'sale-2', recipeId: 'recipe-flatwhite', quantity: 16, date: today() },
    { id: 'sale-3', recipeId: 'recipe-pasta', quantity: 6, date: today() },
  ],
  returns: [],
  subcategories: [],
  schedules: { orderDays: [2, 5], shipmentDays: [2, 4, 6] },
};

type InventoryContextValue = InventoryData & {
  hydrated: boolean;
  addIngredient: (input: Omit<Ingredient, 'id'>) => void;
  addShipment: (input: Omit<Batch, 'id' | 'receivedAt'>) => void;
  addRecipe: (input: Omit<Recipe, 'id'>) => void;
  addReturn: (input: Omit<ReturnRecord, 'id'>) => void;
  addSubcategory: (input: Omit<Subcategory, 'id'>) => void;
  updateSchedules: (schedules: InventoryData['schedules']) => void;
  recordSale: (recipeId: string, quantity: number) => boolean;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<InventoryData>(starterData);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as Partial<InventoryData>;
            setData({ ...starterData, ...parsed, subcategories: parsed.subcategories ?? [] });
          } catch {
            setData(starterData);
          }
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => undefined);
    }
  }, [data, hydrated]);

  const value = useMemo<InventoryContextValue>(() => ({
    ...data,
    hydrated,
    addIngredient: (input) =>
      setData((previous) => ({
        ...previous,
        ingredients: [...previous.ingredients, { ...input, id: id('ingredient') }],
      })),
    addShipment: (input) =>
      setData((previous) => ({
        ...previous,
        batches: [...previous.batches, { ...input, id: id('batch'), receivedAt: today() }],
      })),
    addRecipe: (input) =>
      setData((previous) => ({
        ...previous,
        recipes: [...previous.recipes, { ...input, id: id('recipe') }],
      })),
    addReturn: (input) =>
      setData((previous) => ({
        ...previous,
        returns: [...previous.returns, { ...input, id: id('return') }],
      })),
    addSubcategory: (input) =>
      setData((previous) => ({
        ...previous,
        subcategories: [...previous.subcategories, { ...input, id: id('subcategory') }],
      })),
    updateSchedules: (schedules) =>
      setData((previous) => ({ ...previous, schedules })),
    recordSale: (recipeId, quantity) => {
      const recipe = data.recipes.find((item) => item.id === recipeId);
      if (!recipe || quantity <= 0) return false;

      const requirements = recipe.ingredients.map((line) => ({
        ingredientId: line.ingredientId,
        quantity: line.quantity * quantity,
      }));
      const canFulfill = requirements.every((requirement) => {
        const available = data.batches
          .filter((batch) => batch.ingredientId === requirement.ingredientId)
          .reduce((sum, batch) => sum + batch.quantity, 0);
        return available >= requirement.quantity;
      });
      if (!canFulfill) return false;

      setData((previous) => {
        let nextBatches = [...previous.batches];
        requirements.forEach((requirement) => {
          let remaining = requirement.quantity;
          const ordered = nextBatches
            .map((batch, index) => ({ batch, index }))
            .filter(({ batch }) => batch.ingredientId === requirement.ingredientId && batch.quantity > 0)
            .sort((a, b) => a.batch.expiryDate.localeCompare(b.batch.expiryDate));
          ordered.forEach(({ index }) => {
            if (remaining <= 0) return;
            const taken = Math.min(remaining, nextBatches[index].quantity);
            nextBatches[index] = { ...nextBatches[index], quantity: nextBatches[index].quantity - taken };
            remaining -= taken;
          });
        });
        return {
          ...previous,
          batches: nextBatches,
          sales: [...previous.sales, { id: id('sale'), recipeId, quantity, date: today() }],
        };
      });
      return true;
    },
  }), [data, hydrated]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used inside InventoryProvider');
  return context;
}

export function stockFor(batches: Batch[], ingredientId: string) {
  return batches
    .filter((batch) => batch.ingredientId === ingredientId)
    .reduce((sum, batch) => sum + batch.quantity, 0);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`));
}

export function daysUntil(value: string) {
  const start = new Date(`${today()}T12:00:00`).getTime();
  const end = new Date(`${value}T12:00:00`).getTime();
  return Math.ceil((end - start) / 86400000);
}