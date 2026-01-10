import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { menuService } from '../services/menuService';
import api from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

interface Allergen {
  _id: string;
  name: string;
  icon?: string;
}

interface FormData {
  name: string;
  description: string;
  price: string;
  category: string;
  image: string;
  allergens: string[];
  dietaryInfo: string[];
  isAvailable: boolean;
}

const AddMenuItem: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, removeToast, success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [allergensLoading, setAllergensLoading] = useState(true);
  const [availableAllergens, setAvailableAllergens] = useState<Allergen[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    price: '',
    category: 'Mains',
    image: '',
    allergens: [],
    dietaryInfo: [],
    isAvailable: true
  });

  const categories = ['Mains', 'Starters', 'Sides', 'Desserts', 'Drinks'];
  const dietaryOptions = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Halal', 'Kosher'];

  useEffect(() => {
    fetchAllergens();
  }, []);

  const fetchAllergens = async () => {
    try {
      const response = await api.get('/public/allergens');
      setAvailableAllergens(response.data.data || []);
    } catch (error) {
      console.error('Error fetching allergens:', error);
    } finally {
      setAllergensLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (category: 'allergens' | 'dietaryInfo', value: string) => {
    setFormData(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(item => item !== value)
        : [...prev[category], value]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert dietary info array to object format
      const dietaryInfoObject = {
        vegetarian: formData.dietaryInfo.includes('Vegetarian'),
        vegan: formData.dietaryInfo.includes('Vegan'),
        glutenFree: formData.dietaryInfo.includes('Gluten-Free'),
        dairyFree: formData.dietaryInfo.includes('Dairy-Free'),
        halal: formData.dietaryInfo.includes('Halal'),
        kosher: formData.dietaryInfo.includes('Kosher')
      };

      const dataToSubmit = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        image: formData.image || undefined,
        allergens: formData.allergens, // These are already allergen IDs
        dietaryInfo: dietaryInfoObject,
        isAvailable: formData.isAvailable
      };

      await menuService.createItem(dataToSubmit);
      success(`${formData.name} added to menu`);

      // Navigate after a brief delay to show the toast
      setTimeout(() => {
        navigate('/menu-items');
      }, 1500);
    } catch (error: any) {
      console.error('Error creating menu item:', error);
      showError(error.response?.data?.message || 'Could not add item. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-emerald-50/40">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/menu-items')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to menu items"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Add Menu Item</h1>
                <p className="text-sm text-gray-500 mt-0.5">Fill in the details below to add a new item to your menu</p>
              </div>
            </div>

            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit}>
          <div className="space-y-8">
            {/* Basic Information Card */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Basic Information</h2>
                <p className="text-sm text-green-50 mt-0.5">Main details about your menu item</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Dish Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Dish Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Grilled Salmon with Lemon Butter"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    placeholder="Describe your dish..."
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow resize-none"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">Include key ingredients and cooking method</p>
                </div>

                {/* Price and Category Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Price */}
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Price <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <span className="text-gray-500">£</span>
                      </div>
                      <input
                        id="price"
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="w-full pl-8 pr-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Image URL <span className="text-gray-400 text-xs font-normal">(optional)</span>
                  </label>
                  <input
                    id="image"
                    type="url"
                    name="image"
                    value={formData.image}
                    onChange={handleInputChange}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                  />
                  {formData.image && (
                    <div className="mt-3">
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          e.currentTarget.src = '';
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Allergens Card */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Allergen Information</h2>
                <p className="text-sm text-orange-50 mt-0.5">Select all allergens present in this dish</p>
              </div>

              <div className="p-6">
                {allergensLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {availableAllergens.map((allergen) => (
                      <label
                        key={allergen._id}
                        className={`flex items-center space-x-2.5 px-3 py-2.5 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.allergens.includes(allergen._id)
                            ? 'border-orange-500 bg-orange-50 shadow-sm'
                            : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.allergens.includes(allergen._id)}
                          onChange={() => handleCheckboxChange('allergens', allergen._id)}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 border-gray-300"
                        />
                        <span className="text-sm text-gray-700 flex items-center gap-1.5 font-medium">
                          {allergen.icon && <span className="text-base">{allergen.icon}</span>}
                          <span>{allergen.name}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dietary Information Card */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Dietary Options</h2>
                <p className="text-sm text-purple-50 mt-0.5">Select dietary preferences this dish meets</p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {dietaryOptions.map(option => (
                    <label
                      key={option}
                      className={`flex items-center space-x-2.5 px-3 py-2.5 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.dietaryInfo.includes(option)
                          ? 'border-purple-500 bg-purple-50 shadow-sm'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.dietaryInfo.includes(option)}
                        onChange={() => handleCheckboxChange('dietaryInfo', option)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700 font-medium">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Availability Card */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Availability</h2>
                <p className="text-sm text-blue-50 mt-0.5">Control if this item appears on the menu</p>
              </div>

              <div className="p-6">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <div className="relative flex-shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={formData.isAvailable}
                      onChange={(e) => setFormData(prev => ({ ...prev, isAvailable: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      formData.isAvailable ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        formData.isAvailable ? 'transform translate-x-5' : ''
                      }`}></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {formData.isAvailable ? 'Available' : 'Unavailable'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formData.isAvailable
                        ? 'This item will be visible to customers'
                        : 'This item will be hidden from the menu'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 pb-4">
              <button
                type="button"
                onClick={() => navigate('/menu-items')}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 focus:ring-4 focus:ring-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/30 flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add Menu Item</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    </>
  );
};

export default AddMenuItem;
