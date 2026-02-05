import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

// Cuisine options matching the design
const CUISINE_TYPES = [
  'Indian',
  'Italian',
  'Chinese',
  'Japanese',
  'Thai',
  'Mexican',
  'British',
  'Mediterranean',
  'French',
  'Spanish',
  'American',
  'Korean',
  'Vietnamese',
  'Greek',
  'Turkish',
  'Other'
];

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1 = Restaurant Info, 2 = Admin Account

  // Form data matching backend API structure
  const [formData, setFormData] = useState({
    // Restaurant Information
    restaurantName: '',
    cuisineType: '',
    restaurantEmail: '',
    restaurantPhone: '',
    street: '',
    city: '',
    postcode: '',
    country: 'United Kingdom',
    logo: null as File | null,
    
    // Admin Account
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    confirmPassword: '',
    agreeToTerms: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        logo: e.target.files![0]
      }));
    }
  };

  const validateStep1 = () => {
    if (!formData.restaurantName.trim()) {
      setError('Please enter restaurant name');
      return false;
    }
    if (!formData.cuisineType) {
      setError('Please select cuisine type');
      return false;
    }
    if (!formData.restaurantEmail.trim()) {
      setError('Please enter restaurant email');
      return false;
    }
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.restaurantEmail)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.restaurantPhone.trim()) {
      setError('Please enter phone number');
      return false;
    }
    if (!formData.street.trim() || !formData.city.trim() || !formData.postcode.trim()) {
      setError('Please fill in complete address');
      return false;
    }
    // UK Postcode validation (basic)
    const postcodeRegex = /^[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}$/i;
    if (!postcodeRegex.test(formData.postcode.trim())) {
      setError('Please enter a valid UK postcode (e.g., TQ3 3AA)');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.ownerName.trim()) {
      setError('Please enter your full name');
      return false;
    }
    if (!formData.ownerEmail.trim()) {
      setError('Please enter admin email');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.ownerEmail)) {
      setError('Please enter a valid admin email');
      return false;
    }
    if (!formData.ownerPassword) {
      setError('Please enter password');
      return false;
    }
    if (formData.ownerPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.ownerPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!formData.agreeToTerms) {
      setError('Please agree to Terms of Service and Privacy Policy');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (validateStep1()) {
      setStep(2);
      // Scroll the right panel to top
      const rightPanel = document.getElementById('right-panel');
      if (rightPanel) {
        rightPanel.scrollTop = 0;
      }
    }
  };

  const handleBack = () => {
    setStep(1);
    setError('');
    // Scroll the right panel to top
    const rightPanel = document.getElementById('right-panel');
    if (rightPanel) {
      rightPanel.scrollTop = 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateStep2()) {
      return;
    }

    setLoading(true);

    try {
      // 🆕 PREPARE DATA FOR BACKEND API
      const requestData = {
        restaurantName: formData.restaurantName,
        restaurantEmail: formData.restaurantEmail,
        restaurantPhone: formData.restaurantPhone,
        cuisineType: formData.cuisineType,
        street: formData.street,
        city: formData.city,
        postcode: formData.postcode,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        ownerPassword: formData.ownerPassword
      };

      console.log('Registering with data:', requestData);

      // 🆕 REAL API CALL TO BACKEND
      const response = await authService.register(requestData);

      console.log('Registration successful:', response);

      // Navigate to dashboard (token already saved by authService)
      navigate('/dashboard');

    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Handle different error types
      if (err.response?.status === 400) {
        // Validation error
        setError(err.response.data.message || 'Invalid registration data');
      } else if (err.response?.status === 409) {
        // Duplicate email
        setError('Email already exists. Please use a different email or login.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Registration failed. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Fixed Restaurant Image (NO SCROLL) */}
      <div className="hidden lg:flex lg:w-2/5 fixed inset-y-0 left-0 bg-gray-900">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200)',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-900/90 to-gray-900/90"></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-white">
          {/* Logo - matches your design exactly */}
          <div className="mb-6">
            <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center shadow-2xl">
              <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
              </svg>
            </div>
          </div>

          {/* Branding Text */}
          <h1 className="text-5xl font-bold mb-3">Smart Menu</h1>
          <p className="text-xl mb-2 text-gray-200">Multi-Restaurant Management Platform</p>
          <p className="text-green-300 text-center max-w-md">
            Manage your restaurant with confidence
          </p>
        </div>
      </div>

      {/* Right Side - Scrollable Form (offset by left panel width) */}
      <div className="w-full lg:w-3/5 lg:ml-[40%] min-h-screen bg-gray-50 dark:bg-gray-900">
        <div
          id="right-panel"
          className="w-full h-screen overflow-y-auto"
        >
          <div className="flex items-start justify-center p-6 lg:p-8">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 lg:p-12 my-8">

              {/* Mobile Logo */}
              <div className="lg:hidden text-center mb-6">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Smart Menu</h2>
              </div>

              {/* Header - matches your design */}
              <div className="text-center mb-8">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white mb-2">
                  Create Restaurant Account
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Join Smart Menu and start managing your restaurant
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start">
                  <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* STEP 1: Restaurant Information */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Restaurant Information</h3>
                    </div>

                    {/* Restaurant Name */}
                    <div>
                      <label htmlFor="restaurantName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Restaurant Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <input
                          id="restaurantName"
                          name="restaurantName"
                          type="text"
                          required
                          value={formData.restaurantName}
                          onChange={handleInputChange}
                          placeholder="e.g. Tandoori Nights"
                          className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                        />
                      </div>
                    </div>

                    {/* Restaurant Type / Cuisine */}
                    <div>
                      <label htmlFor="cuisineType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Restaurant Type / Cuisine
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                          </svg>
                        </div>
                        <select
                          id="cuisineType"
                          name="cuisineType"
                          required
                          value={formData.cuisineType}
                          onChange={handleInputChange}
                          className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition appearance-none"
                        >
                          <option value="">Select cuisine type</option>
                          {CUISINE_TYPES.map(cuisine => (
                            <option key={cuisine} value={cuisine}>{cuisine}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Restaurant Email */}
                    <div>
                      <label htmlFor="restaurantEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Restaurant Email
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <input
                          id="restaurantEmail"
                          name="restaurantEmail"
                          type="email"
                          required
                          value={formData.restaurantEmail}
                          onChange={handleInputChange}
                          placeholder="contact@restaurant.com"
                          className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label htmlFor="restaurantPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <input
                          id="restaurantPhone"
                          name="restaurantPhone"
                          type="tel"
                          required
                          value={formData.restaurantPhone}
                          onChange={handleInputChange}
                          placeholder="+44 1234 567890"
                          className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                        />
                      </div>
                    </div>

                    {/* Restaurant Address Section */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Restaurant Address</h4>

                      {/* Street Address */}
                      <div className="mb-4">
                        <label htmlFor="street" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Street Address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <input
                            id="street"
                            name="street"
                            type="text"
                            required
                            value={formData.street}
                            onChange={handleInputChange}
                            placeholder="123 High Street"
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                          />
                        </div>
                      </div>

                      {/* City and Postcode (2 columns) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            City / Town
                          </label>
                          <input
                            id="city"
                            name="city"
                            type="text"
                            required
                            value={formData.city}
                            onChange={handleInputChange}
                            placeholder="e.g. London"
                            className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                          />
                        </div>

                        <div>
                          <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Postcode
                          </label>
                          <input
                            id="postcode"
                            name="postcode"
                            type="text"
                            required
                            value={formData.postcode}
                            onChange={handleInputChange}
                            placeholder="e.g. TQ3 3AA"
                            className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                          />
                        </div>
                      </div>

                      {/* Country (disabled) */}
                      <div>
                        <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Country
                        </label>
                        <input
                          id="country"
                          name="country"
                          type="text"
                          value={formData.country}
                          disabled
                          className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Restaurant Logo (Optional) */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Restaurant Logo (Optional)
                      </label>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG or JPEG (MAX. 5MB)</p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/png,image/jpeg,image/jpg"
                            onChange={handleLogoUpload}
                          />
                        </label>
                      </div>
                      {formData.logo && (
                        <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                          ✓ Logo uploaded: {formData.logo.name}
                        </p>
                      )}
                    </div>

                    {/* Next Button */}
                    <div className="pt-6">
                      <button
                        type="button"
                        onClick={handleNext}
                        className="w-full py-4 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition"
                      >
                        Next: Create Admin Account →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Create Admin Account */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="flex items-center text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium mb-3 transition"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Restaurant Information
                      </button>
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Create Admin Account</h3>
                    </div>

                    {/* Admin Name */}
                    <div>
                      <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Admin Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <input
                          id="ownerName"
                          name="ownerName"
                          type="text"
                          required
                          value={formData.ownerName}
                          onChange={handleInputChange}
                          placeholder="Your full name"
                          className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                        />
                      </div>
                    </div>

                    {/* Admin Email */}
                    <div>
                      <label htmlFor="ownerEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Admin Email
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <input
                          id="ownerEmail"
                          name="ownerEmail"
                          type="email"
                          required
                          value={formData.ownerEmail}
                          onChange={handleInputChange}
                          placeholder="admin@restaurant.com"
                          className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label htmlFor="ownerPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input
                          id="ownerPassword"
                          name="ownerPassword"
                          type="password"
                          required
                          value={formData.ownerPassword}
                          onChange={handleInputChange}
                          placeholder="••••••••"
                          className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                        />
                      </div>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Must be at least 8 characters</p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          required
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          placeholder="••••••••"
                          className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                        />
                      </div>
                    </div>

                    {/* Terms Agreement */}
                    <div className="flex items-start">
                      <input
                        id="agreeToTerms"
                        name="agreeToTerms"
                        type="checkbox"
                        checked={formData.agreeToTerms}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded mt-1 cursor-pointer"
                      />
                      <label htmlFor="agreeToTerms" className="ml-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        I agree to the{' '}
                        <button type="button" className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 font-medium">
                          Terms of Service
                        </button>
                        {' '}and{' '}
                        <button type="button" className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 font-medium">
                          Privacy Policy
                        </button>
                      </label>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-6">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center">
                            <svg className="animate-spin h-5 w-5 text-white mr-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating Account...
                          </div>
                        ) : (
                          'Create Restaurant Account'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </form>

              {/* Sign In Link */}
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="font-medium text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 transition"
                  >
                    Sign In
                  </button>
                </p>
              </div>

              {/* Footer */}
              <div className="mt-8 text-center border-t border-gray-200 dark:border-gray-700 pt-6">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Smart Menu © 2025
                </p>
                <div className="mt-2 space-x-4">
                  <button type="button" className="text-xs text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300">
                    Privacy Policy
                  </button>
                  <button type="button" className="text-xs text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300">
                    Terms
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;