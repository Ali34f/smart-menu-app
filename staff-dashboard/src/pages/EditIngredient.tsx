import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ingredientService } from '../services/ingredientService';
import api from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

interface Allergen {
  _id: string;
  name: string;
  icon?: string;
}

interface AllergenRef {
  _id: string;
  name: string;
}

const INGREDIENT_CATEGORIES = ['Protein', 'Dairy', 'Grains', 'Vegetables', 'Fruits', 'Spices', 'Oils', 'Other'];

const EditIngredient: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toasts, removeToast, success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [allergensLoading, setAllergensLoading] = useState(true);
  const [availableAllergens, setAvailableAllergens] = useState<Allergen[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Other',
    allergens: [] as string[],
    notes: ''
  });

  useEffect(() => {
    fetchAllergens();
    if (id) fetchIngredient();
  }, [id]);

  const fetchAllergens = async () => {
    try {
      const response = await api.get('/public/allergens');
      const allergens = response.data.data || [];
      const unique = allergens.filter((a: Allergen, i: number, self: Allergen[]) =>
        i === self.findIndex((x) => x.name.toLowerCase() === a.name.toLowerCase())
      );
      setAvailableAllergens(unique);
    } catch (error) {
      console.error('Error fetching allergens:', error);
    } finally {
      setAllergensLoading(false);
    }
  };

  const fetchIngredient = async () => {
    if (!id) return;
    try {
      const response = await ingredientService.getOne(id);
      const ing = response.data;
      setFormData({
        name: ing.name,
        category: ing.category || 'Other',
        allergens: (ing.allergens || []).map((a: AllergenRef | string) => (typeof a === 'string' ? a : a._id)),
        notes: ing.notes || ''
      });
    } catch (error: any) {
      if (error.response?.status === 404) navigate('/ingredients');
    } finally {
      setPageLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (allergenId: string) => {
    setFormData((prev) => ({
      ...prev,
      allergens: prev.allergens.includes(allergenId)
        ? prev.allergens.filter((id) => id !== allergenId)
        : [...prev.allergens, allergenId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setLoading(true);
    try {
      await ingredientService.update(id, {
        name: formData.name,
        category: formData.category,
        allergens: formData.allergens,
        notes: formData.notes || undefined
      });
      success(`${formData.name} updated`);
      setTimeout(() => navigate('/ingredients'), 1000);
    } catch (error: any) {
      console.error('Error updating ingredient:', error);
      showError(error.response?.data?.message || 'Could not update ingredient');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600"></div>
      </div>
    );
  }

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
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Edit Ingredient</h1>
              <div className="w-9" />
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-8">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ingredient Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500"
              >
                {INGREDIENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contains Allergens</label>
              {allergensLoading ? (
                <p className="text-sm text-gray-500">Loading allergens...</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableAllergens.map((a) => (
                    <label key={a._id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allergens.includes(a._id)}
                        onChange={() => handleCheckboxChange(a._id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{a.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes (optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/ingredients')}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default EditIngredient;
