const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();

// Security & Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Sample data (will be replaced with database later)
let menuItems = [
  {
    id: 1,
    name: "Chicken Tikka Masala",
    description: "Tender chicken pieces in a creamy tomato-based curry sauce",
    price: 13.95,
    category: "mains",
    spiceLevel: "mild",
    allergens: ["milk", "gluten"],
    ingredients: ["chicken", "tomatoes", "cream", "onions", "garlic", "ginger", "spices"],
    nutritionInfo: { calories: 450, protein: 35, carbs: 28, fat: 22 },
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400",
    active: true,
    rating: 4.8,
    reviews: 256,
    preparationTime: 25
  },
  {
    id: 2,
    name: "Vegetable Samosa",
    description: "Crispy pastry filled with spiced potatoes and peas",
    price: 5.95,
    category: "starters",
    spiceLevel: "medium",
    allergens: ["gluten"],
    ingredients: ["potatoes", "peas", "flour", "onions", "cumin", "coriander"],
    nutritionInfo: { calories: 280, protein: 6, carbs: 38, fat: 12 },
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400",
    active: true,
    rating: 4.5,
    reviews: 189,
    preparationTime: 15
  },
  {
    id: 3,
    name: "Lamb Biryani",
    description: "Fragrant basmati rice layered with tender lamb and aromatic spices",
    price: 14.95,
    category: "mains",
    spiceLevel: "hot",
    allergens: ["milk"],
    ingredients: ["lamb", "basmati rice", "yogurt", "onions", "garlic", "ginger", "saffron"],
    nutritionInfo: { calories: 620, protein: 42, carbs: 68, fat: 18 },
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400",
    active: true,
    rating: 4.9,
    reviews: 312,
    preparationTime: 35
  }
];

const allergens = [
  { id: 1, name: "Milk", emoji: "🥛", description: "Includes all dairy products" },
  { id: 2, name: "Eggs", emoji: "🥚", description: "All forms of eggs" },
  { id: 3, name: "Fish", emoji: "🐟", description: "All species of fish" },
  { id: 4, name: "Crustaceans", emoji: "🦐", description: "Prawns, crabs, lobster" },
  { id: 5, name: "Molluscs", emoji: "🦪", description: "Mussels, oysters, squid" },
  { id: 6, name: "Peanuts", emoji: "🥜", description: "Groundnuts and products" },
  { id: 7, name: "Tree Nuts", emoji: "🌰", description: "Almonds, hazelnuts, walnuts" },
  { id: 8, name: "Soy", emoji: "🫘", description: "Soybeans and soy products" },
  { id: 9, name: "Gluten", emoji: "🌾", description: "Wheat, rye, barley, oats" },
  { id: 10, name: "Celery", emoji: "🥬", description: "Celery stalks, leaves, seeds" },
  { id: 11, name: "Mustard", emoji: "🌶️", description: "Mustard seeds and products" },
  { id: 12, name: "Sesame", emoji: "🌻", description: "Sesame seeds and products" },
  { id: 13, name: "Sulphites", emoji: "🍇", description: "Sulphur dioxide >10mg/kg" },
  { id: 14, name: "Lupin", emoji: "🫘", description: "Lupin seeds and flour" }
];

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: `Welcome to ${process.env.RESTAURANT_NAME} API`,
    version: '1.0.0',
    restaurant: {
      name: process.env.RESTAURANT_NAME,
      cuisine: process.env.RESTAURANT_CUISINE
    },
    endpoints: {
      health: 'GET /api/health',
      menu: 'GET /api/menu',
      menuItem: 'GET /api/menu/:id',
      allergens: 'GET /api/allergens',
      filterMenu: 'POST /api/menu/filter',
      categories: 'GET /api/categories'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV
  });
});

app.get('/api/menu', (req, res) => {
  try {
    const { category, active, search, spiceLevel } = req.query;
    let filtered = [...menuItems];
    
    if (category) {
      filtered = filtered.filter(item => 
        item.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    if (active !== undefined) {
      const isActive = active === 'true';
      filtered = filtered.filter(item => item.active === isActive);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }
    
    if (spiceLevel) {
      filtered = filtered.filter(item => 
        item.spiceLevel.toLowerCase() === spiceLevel.toLowerCase()
      );
    }
    
    res.json({
      success: true,
      count: filtered.length,
      total: menuItems.length,
      data: filtered
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching menu items',
      error: error.message
    });
  }
});

app.get('/api/menu/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const item = menuItems.find(item => item.id === id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Menu item with ID ${id} not found`
      });
    }
    
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching menu item',
      error: error.message
    });
  }
});

app.get('/api/allergens', (req, res) => {
  res.json({
    success: true,
    count: allergens.length,
    data: allergens
  });
});

app.post('/api/menu/filter', (req, res) => {
  try {
    const { allergens: avoidAllergens } = req.body;
    
    if (!avoidAllergens || !Array.isArray(avoidAllergens)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of allergens to avoid'
      });
    }
    
    const avoidLower = avoidAllergens.map(a => a.toLowerCase());
    const safeItems = menuItems.filter(item => {
      return !item.allergens.some(allergen =>
        avoidLower.includes(allergen.toLowerCase())
      );
    });
    
    res.json({
      success: true,
      avoiding: avoidAllergens,
      safeItemsCount: safeItems.length,
      totalItems: menuItems.length,
      data: safeItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error filtering menu',
      error: error.message
    });
  }
});

app.post('/api/menu', (req, res) => {
  try {
    const { name, description, price, category, spiceLevel, allergens, image } = req.body;
    
    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, price, category'
      });
    }
    
    const newItem = {
      id: menuItems.length + 1,
      name,
      description: description || '',
      price: parseFloat(price),
      category,
      spiceLevel: spiceLevel || 'mild',
      allergens: allergens || [],
      ingredients: [],
      nutritionInfo: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
      active: true,
      rating: 0,
      reviews: 0,
      preparationTime: 0
    };
    
    menuItems.push(newItem);
    
    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: newItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating menu item',
      error: error.message
    });
  }
});

app.get('/api/categories', (req, res) => {
  const categories = [...new Set(menuItems.map(item => item.category))];
  const categoriesWithCount = categories.map(category => ({
    name: category,
    count: menuItems.filter(item => item.category === category).length
  }));
  
  res.json({
    success: true,
    count: categories.length,
    data: categoriesWithCount
  });
});

// Error handlers
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// Start server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`API URL: http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});