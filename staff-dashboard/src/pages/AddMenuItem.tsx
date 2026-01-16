import React, { useState, useEffect, useRef } from 'react';
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [allergensLoading, setAllergensLoading] = useState(true);
  const [availableAllergens, setAvailableAllergens] = useState<Allergen[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      const allergens = response.data.data || [];
      // Remove duplicates by name
      const uniqueAllergens = allergens.filter((allergen: Allergen, index: number, self: Allergen[]) =>
        index === self.findIndex((a) => a.name.toLowerCase() === allergen.name.toLowerCase())
      );
      setAvailableAllergens(uniqueAllergens);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showError('Please select an image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const response = await menuService.uploadImage(file);
      if (response.success) {
        setFormData(prev => ({ ...prev, image: response.data.url }));
        success('Image uploaded');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      showError('Could not upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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
        allergens: formData.allergens,
        dietaryInfo: dietaryInfoObject,
        isAvailable: formData.isAvailable
      };

      await menuService.createItem(dataToSubmit);
      success(`${formData.name} added to menu`);

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
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/menu-items')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Add Menu Item</h1>
                  <p className="text-sm text-gray-500">Create a new item for your menu</p>
                </div>
              </div>

              {/* Logo */}
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-4xl mx-auto px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Basic Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-base font-medium text-gray-900 mb-4">Basic Information</h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Dish Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Grilled Salmon"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                      Price <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
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
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image <span className="text-gray-400 text-xs font-normal">(optional)</span>
                  </label>

                  {/* Image Preview */}
                  {formData.image ? (
                    <div className="mb-3">
                      <div className="relative inline-block">
                        <img
                          src={formData.image}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            e.currentTarget.src = '';
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Upload Area */
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50/50 transition-colors mb-3"
                    >
                      {uploadingImage ? (
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-2"></div>
                          <p className="text-sm text-gray-500">Uploading...</p>
                        </div>
                      ) : (
                        <>
                          <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm text-gray-600 mb-1">Click to upload an image</p>
                          <p className="text-xs text-gray-400">JPEG, PNG, GIF or WebP (max 5MB)</p>
                        </>
                      )}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {/* URL Input */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span>or enter URL</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>

                  <input
                    id="image"
                    type="url"
                    name="image"
                    value={formData.image}
                    onChange={handleInputChange}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Allergens */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-base font-medium text-gray-900 mb-1">Allergen Information</h2>
              <p className="text-sm text-gray-500 mb-4">Select all allergens present in this dish</p>

              {allergensLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {availableAllergens.map((allergen) => (
                    <label
                      key={allergen._id}
                      className={`flex items-center space-x-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                        formData.allergens.includes(allergen._id)
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.allergens.includes(allergen._id)}
                        onChange={() => handleCheckboxChange('allergens', allergen._id)}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{allergen.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Dietary Options */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-base font-medium text-gray-900 mb-1">Dietary Options</h2>
              <p className="text-sm text-gray-500 mb-4">Select dietary preferences this dish meets</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {dietaryOptions.map(option => (
                  <label
                    key={option}
                    className={`flex items-center space-x-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                      formData.dietaryInfo.includes(option)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.dietaryInfo.includes(option)}
                      onChange={() => handleCheckboxChange('dietaryInfo', option)}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-medium text-gray-900">Availability</h2>
                  <p className="text-sm text-gray-500">
                    {formData.isAvailable ? 'Item will be visible to customers' : 'Item will be hidden from menu'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isAvailable: !prev.isAvailable }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    formData.isAvailable ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    formData.isAvailable ? 'translate-x-5' : ''
                  }`} />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/menu-items')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Adding...</span>
                  </>
                ) : (
                  <span>Add Item</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddMenuItem;
