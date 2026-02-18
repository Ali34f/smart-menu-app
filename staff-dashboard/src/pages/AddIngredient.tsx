import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ingredientService } from '../services/ingredientService';
import api from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

interface Allergen {
  _id: string;
  name: string;
  icon?: string;
}

const INGREDIENT_CATEGORIES = ['Protein', 'Dairy', 'Grains', 'Vegetables', 'Fruits', 'Spices', 'Oils', 'Other'];

const AddIngredient: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, removeToast, success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
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
  }, []);

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
    setLoading(true);
    try {
      await ingredientService.create({
        name: formData.name,
        category: formData.category,
        allergens: formData.allergens,
        notes: formData.notes || undefined
      });
      success(`${formData.name} added`);
      setTimeout(() => navigate('/ingredients'), 1000);
    } catch (error: any) {
      console.error('Error creating ingredient:', error);
      showError(error.response?.data?.message || 'Could not add ingredient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
      ))}

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/ingredients')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Add Ingredient</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Create a new ingredient for your inventory</p>
                </div>
              </div>
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-base font-medium text-gray-900 dark:text-white mb-4">Basic Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ingredient Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g. Chicken Breast"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    {INGREDIENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-base font-medium text-gray-900 dark:text-white mb-1">Allergen Information</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Select all allergens present in this ingredient</p>

              {allergensLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {availableAllergens.map((a) => (
                    <label
                      key={a._id}
                      className={`flex items-center space-x-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                        formData.allergens.includes(a._id)
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.allergens.includes(a._id)}
                        onChange={() => handleCheckboxChange(a._id)}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{a.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-base font-medium text-gray-900 dark:text-white mb-1">Notes</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Optional internal notes for staff</p>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Storage notes, prep tips, supplier notes..."
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/ingredients')}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Adding...' : 'Add Ingredient'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddIngredient;
