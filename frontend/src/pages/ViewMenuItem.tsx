import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { menuService } from '../services/menuService';
import { canEditMenuItems } from '../utils/permissions';

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  allergens: Array<{ _id: string; name: string; icon?: string }>;
  dietaryInfo: {
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
    dairyFree?: boolean;
    halal?: boolean;
    kosher?: boolean;
  };
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

const ViewMenuItem: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [menuItem, setMenuItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchMenuItem();
    }
  }, [id]);

  const fetchMenuItem = async () => {
    try {
      const response = await menuService.getItem(id!);
      setMenuItem(response.data);
    } catch (error) {
      console.error('Error fetching menu item:', error);
      navigate('/menu-items');
    } finally {
      setLoading(false);
    }
  };

  const dietaryLabels = menuItem ? (() => {
    if (!menuItem.dietaryInfo) return [];
    const labels = [];
    if (menuItem.dietaryInfo.vegetarian) labels.push('Vegetarian');
    if (menuItem.dietaryInfo.vegan) labels.push('Vegan');
    if (menuItem.dietaryInfo.glutenFree) labels.push('Gluten-Free');
    if (menuItem.dietaryInfo.dairyFree) labels.push('Dairy-Free');
    if (menuItem.dietaryInfo.halal) labels.push('Halal');
    if (menuItem.dietaryInfo.kosher) labels.push('Kosher');
    return labels;
  })() : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-emerald-50/40">
      {/* Header - always visible */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-5">
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
                <h1 className="text-2xl font-bold text-gray-900">Menu Item Details</h1>
                <p className="text-sm text-gray-500 mt-0.5">View complete information about this item</p>
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

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
          </div>
        ) : !menuItem ? null : (
        <div className="space-y-6">
          {/* Image and Basic Info */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Overview</h2>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Image */}
                <div className="md:col-span-1">
                  {menuItem.image ? (
                    <img
                      src={menuItem.image}
                      alt={menuItem.name}
                      className="w-full h-48 md:h-full object-cover rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div className="w-full h-48 md:h-full bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900">{menuItem.name}</h3>
                    <div className="flex items-center space-x-3 mt-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                        {menuItem.category}
                      </span>
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                        menuItem.isAvailable
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {menuItem.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-700 leading-relaxed">{menuItem.description}</p>
                  </div>

                  <div>
                    <div className="text-4xl font-bold text-green-600">£{menuItem.price.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Allergens */}
          {menuItem.allergens && menuItem.allergens.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Allergen Information</h2>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {menuItem.allergens.map((allergen) => (
                    <div
                      key={allergen._id}
                      className="flex items-center space-x-2.5 px-4 py-3 bg-orange-50 border-2 border-orange-200 rounded-lg"
                    >
                      {allergen.icon && <span className="text-xl">{allergen.icon}</span>}
                      <span className="text-sm font-medium text-gray-800">{allergen.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Dietary Options */}
          {dietaryLabels.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Dietary Options</h2>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {dietaryLabels.map((label) => (
                    <div
                      key={label}
                      className="flex items-center space-x-2.5 px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-lg"
                    >
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-800">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => navigate('/menu-items')}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white rounded-lg border border-gray-300 transition-colors"
            >
              Back to Menu
            </button>
            {canEditMenuItems() && (
              <button
                type="button"
                onClick={() => navigate(`/menu-items/edit/${menuItem._id}`)}
                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg shadow-green-500/30 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit Item</span>
              </button>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default ViewMenuItem;
