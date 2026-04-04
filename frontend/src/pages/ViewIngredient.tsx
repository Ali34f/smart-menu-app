import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ingredientService } from '../services/ingredientService';
import { canEditIngredients } from '../utils/permissions';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

interface AllergenRef {
  _id: string;
  name: string;
  icon?: string;
}

interface Ingredient {
  _id: string;
  name: string;
  category: string;
  allergens: AllergenRef[] | string[];
  dishCount?: number;
  notes?: string;
}

const ViewIngredient: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toasts, removeToast } = useToast();
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchIngredient();
  }, [id]);

  const fetchIngredient = async () => {
    if (!id) return;
    try {
      const response = await ingredientService.getOne(id);
      setIngredient(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        navigate('/ingredients');
      }
    } finally {
      setLoading(false);
    }
  };

  const getIngredientName = (a: AllergenRef | string) => (typeof a === 'string' ? a : a.name);

  return (
    <>
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
      ))}

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-2xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/ingredients')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Ingredient Details</h1>
              {canEditIngredients() ? (
                <button
                  type="button"
                  onClick={() => (id ? navigate(`/ingredients/edit/${id}`) : undefined)}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium"
                >
                  Edit
                </button>
              ) : (
                <span className="w-[72px]" aria-hidden />
              )}
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
            </div>
          ) : !ingredient ? null : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{ingredient.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                {ingredient.category}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Contains Allergens</label>
              {ingredient.allergens && ingredient.allergens.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {ingredient.allergens.map((a, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 text-sm font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                    >
                      {getIngredientName(a)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">—</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Used In</label>
              <p className="text-gray-900 dark:text-white font-medium">{ingredient.dishCount ?? 0} dishes</p>
            </div>
            {ingredient.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                <p className="text-gray-700 dark:text-gray-300">{ingredient.notes}</p>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ViewIngredient;
