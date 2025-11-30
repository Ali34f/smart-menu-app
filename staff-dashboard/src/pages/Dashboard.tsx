// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5002/api';

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  allergens: string[];
  image: string;
  active: boolean;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await fetch(`${API_URL}/menu`);
      const data = await response.json();
      setMenuItems(data.data || []);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  const userEmail = localStorage.getItem('userEmail') || 'staff@restaurant.com';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Smart Menu Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{userEmail}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Menu Items ({menuItems.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map(item => (
              <div key={item.id} className="border rounded-lg p-4">
                <img src={item.image} alt={item.name} className="w-full h-32 object-cover rounded mb-2" />
                <h3 className="font-bold">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.description.substring(0, 60)}...</p>
                <p className="text-green-600 font-bold mt-2">£{item.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;