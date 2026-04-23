// Comprehensive translation utility
export const translations: Record<string, Record<string, string>> = {
  en: {
    // Navigation
    'dashboard': 'Dashboard',
    'menuItems': 'Menu Items',
    'allergens': 'Allergens',
    'ingredients': 'Ingredients',
    'staffManagement': 'Staff Management',
    'qrCodes': 'QR Codes',
    'reports': 'Reports',
    'settings': 'Settings',

    // Common Actions
    'save': 'Save',
    'cancel': 'Cancel',
    'delete': 'Delete',
    'edit': 'Edit',
    'view': 'View',
    'add': 'Add',
    'search': 'Search',
    'filter': 'Filter',
    'clearFilters': 'Clear Filters',
    'logout': 'Logout',
    'back': 'Back',

    // Status
    'active': 'Active',
    'inactive': 'Inactive',
    'available': 'Available',
    'unavailable': 'Unavailable',

    // Dashboard
    'welcomeBack': 'Welcome back',
    'dashboardOverview': 'Dashboard Overview',
    'totalMenuItems': 'Total Menu Items',
    'activeItems': 'Active Items',
    'queriesToday': 'Queries Today',
    'mostViewed': 'Most Viewed',
    'recentActivity': 'Recent Activity',
    'viewAll': 'View All',
    'popularThisWeek': 'Popular This Week',
    'quickActions': 'Quick Actions',
    'addNewDish': 'Add New Dish',
    'updateAllergens': 'Update Allergens',
    'viewReports': 'View Reports',
    'manageStaff': 'Manage Staff',
    'mostFilteredAllergens': 'Most Filtered Allergens',
    'mostFilteredAllergensHelp':
      'When guests exclude allergens on your public menu, each allergen is counted here (all time).',
    'allergenDistributionTitle': 'Allergen mix (your menu)',
    'allergenDistributionHelp':
      'How tagged allergens on your dishes group into gluten, dairy, nuts, and other categories.',
    'noAllergenFilterUsageYet':
      'No guest filter data yet. When visitors use the allergen filter on your public menu, counts appear here.',
    'noTaggedAllergensOnMenu':
      'No allergens tagged on menu items yet. Tag allergens on dishes to see this breakdown.',
    'todaysOverview': "Today's Overview",
    'total': 'Total',
    'queries': 'Queries',
    'needHelp': 'Need Help?',
    'viewGuide': 'View Guide',

    // Preferences
    'preferences': 'Preferences',
    'darkMode': 'Dark Mode',
    'language': 'Language',
    'notifications': 'Notifications',
    'emailNotifications': 'Email Notifications',
    'savePreferences': 'Save Preferences',
    'regional': 'Regional',
    'timezone': 'Timezone',
    'display': 'Display',
    'compactView': 'Compact View',

    // Profile
    'profile': 'Profile',
    'accountSettings': 'Account Settings',
    'manageProfile': 'Manage your profile and preferences',
    'personalInformation': 'Personal Information',
    'displayName': 'Display Name',
    'emailAddress': 'Email Address',
    'changePassword': 'Change Password',
    'currentPassword': 'Current Password',
    'newPassword': 'New Password',
    'confirmPassword': 'Confirm Password',
    'saveChanges': 'Save Changes',

    // Search
    'searchMenuItems': 'Search menu items...',
    'searchIngredients': 'Search ingredients...',
    'noResultsFound': 'No results found',

    // Table Headers
    'name': 'Name',
    'category': 'Category',
    'price': 'Price',
    'status': 'Status',
    'actions': 'Actions',
    'usedIn': 'Used In',
    'containsAllergens': 'Contains Allergens',

    // Messages
    'loading': 'Loading...',
    'saving': 'Saving...',
    'adding': 'Adding...',

    // Staff
    'staff': 'Staff',
    'addStaff': 'Add Staff',
    'role': 'Role',
    'owner': 'Owner',
    'manager': 'Manager',

    // Ingredients
    'ingredientName': 'Ingredient Name',
    'addNewIngredient': 'Add New Ingredient',
    'noIngredientsFound': 'No ingredients found',
    'dishes': 'dishes',
    'allergenFree': 'Allergen-Free',
    'withAllergens': 'With Allergens',
    'quickStats': 'Quick Stats',
    'totalIngredients': 'Total Ingredients',
    'mostUsed': 'Most Used',
    'allergenDistribution': 'Allergen Distribution',
    'recentlyAdded': 'Recently Added',
    'notes': 'Notes',
    'ingredientsManagement': 'Ingredients Management',
    'allCategories': 'All Categories',
    'all': 'All',

    // Smart Menu
    'smartMenu': 'Smart Menu',
  },

  es: {
    // Navigation
    'dashboard': 'Panel',
    'menuItems': 'Elementos del Menú',
    'allergens': 'Alérgenos',
    'ingredients': 'Ingredientes',
    'staffManagement': 'Gestión de Personal',
    'qrCodes': 'Códigos QR',
    'reports': 'Informes',
    'settings': 'Configuración',

    // Common Actions
    'save': 'Guardar',
    'cancel': 'Cancelar',
    'delete': 'Eliminar',
    'edit': 'Editar',
    'view': 'Ver',
    'add': 'Agregar',
    'search': 'Buscar',
    'filter': 'Filtrar',
    'clearFilters': 'Limpiar Filtros',
    'logout': 'Cerrar Sesión',
    'back': 'Atrás',

    // Status
    'active': 'Activo',
    'inactive': 'Inactivo',
    'available': 'Disponible',
    'unavailable': 'No Disponible',

    // Dashboard
    'welcomeBack': 'Bienvenido de nuevo',
    'dashboardOverview': 'Resumen del Panel',
    'totalMenuItems': 'Total de Elementos',
    'activeItems': 'Elementos Activos',
    'queriesToday': 'Consultas Hoy',
    'mostViewed': 'Más Visto',
    'recentActivity': 'Actividad Reciente',
    'viewAll': 'Ver Todo',
    'popularThisWeek': 'Popular Esta Semana',
    'quickActions': 'Acciones Rápidas',
    'addNewDish': 'Agregar Nuevo Plato',
    'updateAllergens': 'Actualizar Alérgenos',
    'viewReports': 'Ver Informes',
    'manageStaff': 'Gestionar Personal',
    'mostFilteredAllergens': 'Alérgenos Más Filtrados',
    'todaysOverview': 'Resumen de Hoy',
    'total': 'Total',
    'queries': 'Consultas',
    'needHelp': '¿Necesitas Ayuda?',
    'viewGuide': 'Ver Guía',

    // Preferences
    'preferences': 'Preferencias',
    'darkMode': 'Modo Oscuro',
    'language': 'Idioma',
    'notifications': 'Notificaciones',
    'emailNotifications': 'Notificaciones por Email',
    'savePreferences': 'Guardar Preferencias',
    'regional': 'Regional',
    'timezone': 'Zona Horaria',
    'display': 'Pantalla',
    'compactView': 'Vista Compacta',

    // Profile
    'profile': 'Perfil',
    'accountSettings': 'Configuración de Cuenta',
    'manageProfile': 'Gestiona tu perfil y preferencias',
    'personalInformation': 'Información Personal',
    'displayName': 'Nombre a Mostrar',
    'emailAddress': 'Correo Electrónico',
    'changePassword': 'Cambiar Contraseña',
    'currentPassword': 'Contraseña Actual',
    'newPassword': 'Nueva Contraseña',
    'confirmPassword': 'Confirmar Contraseña',
    'saveChanges': 'Guardar Cambios',

    // Search
    'searchMenuItems': 'Buscar elementos del menú...',
    'searchIngredients': 'Buscar ingredientes...',
    'noResultsFound': 'No se encontraron resultados',

    // Table Headers
    'name': 'Nombre',
    'category': 'Categoría',
    'price': 'Precio',
    'status': 'Estado',
    'actions': 'Acciones',
    'usedIn': 'Usado En',
    'containsAllergens': 'Contiene Alérgenos',

    // Messages
    'loading': 'Cargando...',
    'saving': 'Guardando...',
    'adding': 'Agregando...',

    // Staff
    'staff': 'Personal',
    'addStaff': 'Agregar Personal',
    'role': 'Rol',
    'owner': 'Propietario',
    'manager': 'Gerente',

    // Ingredients
    'ingredientName': 'Nombre del Ingrediente',
    'addNewIngredient': 'Agregar Nuevo Ingrediente',
    'noIngredientsFound': 'No se encontraron ingredientes',
    'dishes': 'platos',
    'allergenFree': 'Sin Alérgenos',
    'withAllergens': 'Con Alérgenos',
    'quickStats': 'Estadísticas Rápidas',
    'totalIngredients': 'Total de Ingredientes',
    'mostUsed': 'Más Usado',
    'allergenDistribution': 'Distribución de Alérgenos',
    'recentlyAdded': 'Agregado Recientemente',
    'notes': 'Notas',
    'ingredientsManagement': 'Gestión de Ingredientes',
    'allCategories': 'Todas las Categorías',
    'all': 'Todo',

    // Smart Menu
    'smartMenu': 'Smart Menu',
  },

  fr: {
    // Navigation
    'dashboard': 'Tableau de bord',
    'menuItems': 'Éléments du menu',
    'allergens': 'Allergènes',
    'ingredients': 'Ingrédients',
    'staffManagement': 'Gestion du personnel',
    'qrCodes': 'Codes QR',
    'reports': 'Rapports',
    'settings': 'Paramètres',

    // Common Actions
    'save': 'Enregistrer',
    'cancel': 'Annuler',
    'delete': 'Supprimer',
    'edit': 'Modifier',
    'view': 'Voir',
    'add': 'Ajouter',
    'search': 'Rechercher',
    'filter': 'Filtrer',
    'clearFilters': 'Effacer les filtres',
    'logout': 'Déconnexion',
    'back': 'Retour',

    // Status
    'active': 'Actif',
    'inactive': 'Inactif',
    'available': 'Disponible',
    'unavailable': 'Indisponible',

    // Dashboard
    'welcomeBack': 'Bon retour',
    'dashboardOverview': 'Aperçu du tableau de bord',
    'totalMenuItems': 'Total des éléments',
    'activeItems': 'Éléments actifs',
    'queriesToday': "Requêtes aujourd'hui",
    'mostViewed': 'Plus consulté',
    'recentActivity': 'Activité récente',
    'viewAll': 'Voir tout',
    'popularThisWeek': 'Populaire cette semaine',
    'quickActions': 'Actions rapides',
    'addNewDish': 'Ajouter un nouveau plat',
    'updateAllergens': 'Mettre à jour les allergènes',
    'viewReports': 'Voir les rapports',
    'manageStaff': 'Gérer le personnel',
    'mostFilteredAllergens': 'Allergènes les plus filtrés',
    'todaysOverview': "Aperçu d'aujourd'hui",
    'total': 'Total',
    'queries': 'Requêtes',
    'needHelp': "Besoin d'aide?",
    'viewGuide': 'Voir le guide',

    // Preferences
    'preferences': 'Préférences',
    'darkMode': 'Mode sombre',
    'language': 'Langue',
    'notifications': 'Notifications',
    'emailNotifications': 'Notifications par email',
    'savePreferences': 'Enregistrer les préférences',
    'regional': 'Régional',
    'timezone': 'Fuseau horaire',
    'display': 'Affichage',
    'compactView': 'Vue compacte',

    // Profile
    'profile': 'Profil',
    'accountSettings': 'Paramètres du compte',
    'manageProfile': 'Gérez votre profil et vos préférences',
    'personalInformation': 'Informations personnelles',
    'displayName': "Nom d'affichage",
    'emailAddress': 'Adresse email',
    'changePassword': 'Changer le mot de passe',
    'currentPassword': 'Mot de passe actuel',
    'newPassword': 'Nouveau mot de passe',
    'confirmPassword': 'Confirmer le mot de passe',
    'saveChanges': 'Enregistrer les modifications',

    // Search
    'searchMenuItems': 'Rechercher des éléments du menu...',
    'searchIngredients': 'Rechercher des ingrédients...',
    'noResultsFound': 'Aucun résultat trouvé',

    // Table Headers
    'name': 'Nom',
    'category': 'Catégorie',
    'price': 'Prix',
    'status': 'Statut',
    'actions': 'Actions',
    'usedIn': 'Utilisé dans',
    'containsAllergens': 'Contient des allergènes',

    // Messages
    'loading': 'Chargement...',
    'saving': 'Enregistrement...',
    'adding': 'Ajout...',

    // Staff
    'staff': 'Personnel',
    'addStaff': 'Ajouter du personnel',
    'role': 'Rôle',
    'owner': 'Propriétaire',
    'manager': 'Gestionnaire',

    // Ingredients
    'ingredientName': "Nom de l'ingrédient",
    'addNewIngredient': 'Ajouter un nouvel ingrédient',
    'noIngredientsFound': 'Aucun ingrédient trouvé',
    'dishes': 'plats',
    'allergenFree': 'Sans allergènes',
    'withAllergens': 'Avec allergènes',
    'quickStats': 'Statistiques rapides',
    'totalIngredients': 'Total des ingrédients',
    'mostUsed': 'Le plus utilisé',
    'allergenDistribution': 'Distribution des allergènes',
    'recentlyAdded': 'Ajouté récemment',
    'notes': 'Notes',
    'ingredientsManagement': 'Gestion des ingrédients',
    'allCategories': 'Toutes les catégories',
    'all': 'Tout',

    // Smart Menu
    'smartMenu': 'Smart Menu',
  },

  de: {
    // Navigation
    'dashboard': 'Dashboard',
    'menuItems': 'Menüpunkte',
    'allergens': 'Allergene',
    'ingredients': 'Zutaten',
    'staffManagement': 'Personalverwaltung',
    'qrCodes': 'QR-Codes',
    'reports': 'Berichte',
    'settings': 'Einstellungen',

    // Common Actions
    'save': 'Speichern',
    'cancel': 'Abbrechen',
    'delete': 'Löschen',
    'edit': 'Bearbeiten',
    'view': 'Anzeigen',
    'add': 'Hinzufügen',
    'search': 'Suchen',
    'filter': 'Filtern',
    'clearFilters': 'Filter löschen',
    'logout': 'Abmelden',
    'back': 'Zurück',

    // Status
    'active': 'Aktiv',
    'inactive': 'Inaktiv',
    'available': 'Verfügbar',
    'unavailable': 'Nicht verfügbar',

    // Dashboard
    'welcomeBack': 'Willkommen zurück',
    'dashboardOverview': 'Dashboard-Übersicht',
    'totalMenuItems': 'Gesamte Menüpunkte',
    'activeItems': 'Aktive Artikel',
    'queriesToday': 'Anfragen heute',
    'mostViewed': 'Am meisten angesehen',
    'recentActivity': 'Letzte Aktivitäten',
    'viewAll': 'Alle anzeigen',
    'popularThisWeek': 'Beliebt diese Woche',
    'quickActions': 'Schnellaktionen',
    'addNewDish': 'Neues Gericht hinzufügen',
    'updateAllergens': 'Allergene aktualisieren',
    'viewReports': 'Berichte anzeigen',
    'manageStaff': 'Personal verwalten',
    'mostFilteredAllergens': 'Am häufigsten gefilterte Allergene',
    'todaysOverview': 'Heutige Übersicht',
    'total': 'Gesamt',
    'queries': 'Anfragen',
    'needHelp': 'Brauchen Sie Hilfe?',
    'viewGuide': 'Anleitung anzeigen',

    // Preferences
    'preferences': 'Einstellungen',
    'darkMode': 'Dunkler Modus',
    'language': 'Sprache',
    'notifications': 'Benachrichtigungen',
    'emailNotifications': 'E-Mail-Benachrichtigungen',
    'savePreferences': 'Einstellungen speichern',
    'regional': 'Regional',
    'timezone': 'Zeitzone',
    'display': 'Anzeige',
    'compactView': 'Kompakte Ansicht',

    // Profile
    'profile': 'Profil',
    'accountSettings': 'Kontoeinstellungen',
    'manageProfile': 'Verwalten Sie Ihr Profil und Ihre Einstellungen',
    'personalInformation': 'Persönliche Informationen',
    'displayName': 'Anzeigename',
    'emailAddress': 'E-Mail-Adresse',
    'changePassword': 'Passwort ändern',
    'currentPassword': 'Aktuelles Passwort',
    'newPassword': 'Neues Passwort',
    'confirmPassword': 'Passwort bestätigen',
    'saveChanges': 'Änderungen speichern',

    // Search
    'searchMenuItems': 'Menüpunkte suchen...',
    'searchIngredients': 'Zutaten suchen...',
    'noResultsFound': 'Keine Ergebnisse gefunden',

    // Table Headers
    'name': 'Name',
    'category': 'Kategorie',
    'price': 'Preis',
    'status': 'Status',
    'actions': 'Aktionen',
    'usedIn': 'Verwendet in',
    'containsAllergens': 'Enthält Allergene',

    // Messages
    'loading': 'Wird geladen...',
    'saving': 'Wird gespeichert...',
    'adding': 'Wird hinzugefügt...',

    // Staff
    'staff': 'Personal',
    'addStaff': 'Personal hinzufügen',
    'role': 'Rolle',
    'owner': 'Inhaber',
    'manager': 'Manager',

    // Ingredients
    'ingredientName': 'Zutatenname',
    'addNewIngredient': 'Neue Zutat hinzufügen',
    'noIngredientsFound': 'Keine Zutaten gefunden',
    'dishes': 'Gerichte',
    'allergenFree': 'Allergenfrei',
    'withAllergens': 'Mit Allergenen',
    'quickStats': 'Schnellstatistiken',
    'totalIngredients': 'Gesamte Zutaten',
    'mostUsed': 'Am meisten verwendet',
    'allergenDistribution': 'Allergenverteilung',
    'recentlyAdded': 'Kürzlich hinzugefügt',
    'notes': 'Notizen',
    'ingredientsManagement': 'Zutatenverwaltung',
    'allCategories': 'Alle Kategorien',
    'all': 'Alle',

    // Smart Menu
    'smartMenu': 'Smart Menu',
  },

  ur: {
    // Navigation
    'dashboard': 'ڈیش بورڈ',
    'menuItems': 'مینو آئٹمز',
    'allergens': 'الرجی',
    'ingredients': 'اجزاء',
    'staffManagement': 'عملے کا انتظام',
    'qrCodes': 'QR کوڈز',
    'reports': 'رپورٹس',
    'settings': 'ترتیبات',

    // Common Actions
    'save': 'محفوظ کریں',
    'cancel': 'منسوخ کریں',
    'delete': 'حذف کریں',
    'edit': 'ترمیم',
    'view': 'دیکھیں',
    'add': 'شامل کریں',
    'search': 'تلاش',
    'filter': 'فلٹر',
    'clearFilters': 'فلٹر صاف کریں',
    'logout': 'لاگ آؤٹ',
    'back': 'واپس',

    // Status
    'active': 'فعال',
    'inactive': 'غیر فعال',
    'available': 'دستیاب',
    'unavailable': 'غیر دستیاب',

    // Dashboard
    'welcomeBack': 'خوش آمدید',
    'dashboardOverview': 'ڈیش بورڈ کا جائزہ',
    'totalMenuItems': 'کل مینو آئٹمز',
    'activeItems': 'فعال آئٹمز',
    'queriesToday': 'آج کی پوچھ گچھ',
    'mostViewed': 'سب سے زیادہ دیکھا گیا',
    'recentActivity': 'حالیہ سرگرمی',
    'viewAll': 'سب دیکھیں',
    'popularThisWeek': 'اس ہفتے مقبول',
    'quickActions': 'فوری کارروائیاں',
    'addNewDish': 'نیا پکوان شامل کریں',
    'updateAllergens': 'الرجی اپ ڈیٹ کریں',
    'viewReports': 'رپورٹس دیکھیں',
    'manageStaff': 'عملے کا انتظام',
    'mostFilteredAllergens': 'سب سے زیادہ فلٹر شدہ الرجی',
    'todaysOverview': 'آج کا جائزہ',
    'total': 'کل',
    'queries': 'پوچھ گچھ',
    'needHelp': 'مدد چاہیے؟',
    'viewGuide': 'گائیڈ دیکھیں',

    // Preferences
    'preferences': 'ترجیحات',
    'darkMode': 'ڈارک موڈ',
    'language': 'زبان',
    'notifications': 'اطلاعات',
    'emailNotifications': 'ای میل اطلاعات',
    'savePreferences': 'ترجیحات محفوظ کریں',
    'regional': 'علاقائی',
    'timezone': 'ٹائم زون',
    'display': 'ڈسپلے',
    'compactView': 'مختصر نظارہ',

    // Profile
    'profile': 'پروفائل',
    'accountSettings': 'اکاؤنٹ کی ترتیبات',
    'manageProfile': 'اپنے پروفائل اور ترجیحات کا انتظام کریں',
    'personalInformation': 'ذاتی معلومات',
    'displayName': 'ظاہری نام',
    'emailAddress': 'ای میل پتہ',
    'changePassword': 'پاس ورڈ تبدیل کریں',
    'currentPassword': 'موجودہ پاس ورڈ',
    'newPassword': 'نیا پاس ورڈ',
    'confirmPassword': 'پاس ورڈ کی تصدیق',
    'saveChanges': 'تبدیلیاں محفوظ کریں',

    // Search
    'searchMenuItems': 'مینو آئٹمز تلاش کریں...',
    'searchIngredients': 'اجزاء تلاش کریں...',
    'noResultsFound': 'کوئی نتائج نہیں ملے',

    // Table Headers
    'name': 'نام',
    'category': 'زمرہ',
    'price': 'قیمت',
    'status': 'حیثیت',
    'actions': 'کارروائیاں',
    'usedIn': 'استعمال میں',
    'containsAllergens': 'الرجی شامل ہے',

    // Messages
    'loading': 'لوڈ ہو رہا ہے...',
    'saving': 'محفوظ ہو رہا ہے...',
    'adding': 'شامل ہو رہا ہے...',

    // Staff
    'staff': 'عملہ',
    'addStaff': 'عملہ شامل کریں',
    'role': 'کردار',
    'owner': 'مالک',
    'manager': 'مینیجر',

    // Ingredients
    'ingredientName': 'جزو کا نام',
    'addNewIngredient': 'نیا جزو شامل کریں',
    'noIngredientsFound': 'کوئی اجزاء نہیں ملے',
    'dishes': 'پکوان',
    'allergenFree': 'الرجی سے پاک',
    'withAllergens': 'الرجی کے ساتھ',
    'quickStats': 'فوری اعدادوشمار',
    'totalIngredients': 'کل اجزاء',
    'mostUsed': 'سب سے زیادہ استعمال',
    'allergenDistribution': 'الرجی کی تقسیم',
    'recentlyAdded': 'حال ہی میں شامل',
    'notes': 'نوٹس',
    'ingredientsManagement': 'اجزاء کا انتظام',
    'allCategories': 'تمام زمرے',
    'all': 'سب',

    // Smart Menu
    'smartMenu': 'سمارٹ مینو',
  },

  ar: {
    // Navigation
    'dashboard': 'لوحة التحكم',
    'menuItems': 'عناصر القائمة',
    'allergens': 'مسببات الحساسية',
    'ingredients': 'المكونات',
    'staffManagement': 'إدارة الموظفين',
    'qrCodes': 'رموز QR',
    'reports': 'التقارير',
    'settings': 'الإعدادات',

    // Common Actions
    'save': 'حفظ',
    'cancel': 'إلغاء',
    'delete': 'حذف',
    'edit': 'تعديل',
    'view': 'عرض',
    'add': 'إضافة',
    'search': 'بحث',
    'filter': 'تصفية',
    'clearFilters': 'مسح الفلاتر',
    'logout': 'تسجيل الخروج',
    'back': 'رجوع',

    // Status
    'active': 'نشط',
    'inactive': 'غير نشط',
    'available': 'متاح',
    'unavailable': 'غير متاح',

    // Dashboard
    'welcomeBack': 'مرحباً بعودتك',
    'dashboardOverview': 'نظرة عامة على لوحة التحكم',
    'totalMenuItems': 'إجمالي العناصر',
    'activeItems': 'العناصر النشطة',
    'queriesToday': 'استفسارات اليوم',
    'mostViewed': 'الأكثر مشاهدة',
    'recentActivity': 'النشاط الأخير',
    'viewAll': 'عرض الكل',
    'popularThisWeek': 'الشائع هذا الأسبوع',
    'quickActions': 'إجراءات سريعة',
    'addNewDish': 'إضافة طبق جديد',
    'updateAllergens': 'تحديث مسببات الحساسية',
    'viewReports': 'عرض التقارير',
    'manageStaff': 'إدارة الموظفين',
    'mostFilteredAllergens': 'مسببات الحساسية الأكثر تصفية',
    'todaysOverview': 'نظرة عامة على اليوم',
    'total': 'الإجمالي',
    'queries': 'الاستفسارات',
    'needHelp': 'تحتاج مساعدة؟',
    'viewGuide': 'عرض الدليل',

    // Preferences
    'preferences': 'التفضيلات',
    'darkMode': 'الوضع الداكن',
    'language': 'اللغة',
    'notifications': 'الإشعارات',
    'emailNotifications': 'إشعارات البريد الإلكتروني',
    'savePreferences': 'حفظ التفضيلات',
    'regional': 'إقليمي',
    'timezone': 'المنطقة الزمنية',
    'display': 'العرض',
    'compactView': 'عرض مضغوط',

    // Profile
    'profile': 'الملف الشخصي',
    'accountSettings': 'إعدادات الحساب',
    'manageProfile': 'إدارة ملفك الشخصي وتفضيلاتك',
    'personalInformation': 'المعلومات الشخصية',
    'displayName': 'اسم العرض',
    'emailAddress': 'عنوان البريد الإلكتروني',
    'changePassword': 'تغيير كلمة المرور',
    'currentPassword': 'كلمة المرور الحالية',
    'newPassword': 'كلمة المرور الجديدة',
    'confirmPassword': 'تأكيد كلمة المرور',
    'saveChanges': 'حفظ التغييرات',

    // Search
    'searchMenuItems': 'البحث في عناصر القائمة...',
    'searchIngredients': 'البحث في المكونات...',
    'noResultsFound': 'لا توجد نتائج',

    // Table Headers
    'name': 'الاسم',
    'category': 'الفئة',
    'price': 'السعر',
    'status': 'الحالة',
    'actions': 'الإجراءات',
    'usedIn': 'مستخدم في',
    'containsAllergens': 'يحتوي على مسببات الحساسية',

    // Messages
    'loading': 'جاري التحميل...',
    'saving': 'جاري الحفظ...',
    'adding': 'جاري الإضافة...',

    // Staff
    'staff': 'الموظفون',
    'addStaff': 'إضافة موظف',
    'role': 'الدور',
    'owner': 'المالك',
    'manager': 'المدير',

    // Ingredients
    'ingredientName': 'اسم المكون',
    'addNewIngredient': 'إضافة مكون جديد',
    'noIngredientsFound': 'لا توجد مكونات',
    'dishes': 'أطباق',
    'allergenFree': 'خالي من مسببات الحساسية',
    'withAllergens': 'مع مسببات الحساسية',
    'quickStats': 'إحصائيات سريعة',
    'totalIngredients': 'إجمالي المكونات',
    'mostUsed': 'الأكثر استخداماً',
    'allergenDistribution': 'توزيع مسببات الحساسية',
    'recentlyAdded': 'أضيف مؤخراً',
    'notes': 'ملاحظات',
    'ingredientsManagement': 'إدارة المكونات',
    'allCategories': 'جميع الفئات',
    'all': 'الكل',

    // Smart Menu
    'smartMenu': 'سمارت مينو',
  },
};

export const getTranslation = (key: string, lang: string = 'en'): string => {
  return translations[lang]?.[key] || translations.en[key] || key;
};
