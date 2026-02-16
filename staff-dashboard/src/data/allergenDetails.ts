export interface AllergenDetail {
  name: string;
  description: string;
  commonSources: string[];
  hiddenSources: string[];
  crossContaminationRisks: string[];
  symptoms: string[];
  ukRegulation: string;
}

const UK_FIR_TEXT = 'Must be declared under UK Food Information Regulations 2014 (FIR 2014).';

export const ALLERGEN_DETAILS: Record<string, AllergenDetail> = {
  Gluten: {
    name: 'Gluten',
    description: 'Gluten is a protein found in wheat, barley, rye, and oats.',
    commonSources: ['Bread, pasta, cereals', 'Baked goods (cakes, biscuits)', 'Beer and malt beverages'],
    hiddenSources: ['Soy sauce', 'Soup bases and stocks', 'Processed meats', 'Salad dressings', 'Gravies and sauces'],
    crossContaminationRisks: ['Shared fryers for breaded items', 'Flour dust in kitchen', 'Shared cutting boards', 'Toasters and grills'],
    symptoms: ['Digestive issues', 'Bloating and gas', 'Fatigue', 'Headaches', 'Celiac disease reactions'],
    ukRegulation: UK_FIR_TEXT
  },
  Milk: {
    name: 'Milk',
    description: 'Milk allergy includes sensitivity to milk proteins and lactose-containing dairy products.',
    commonSources: ['Cheese, butter, cream, yoghurt', 'Milk powders and desserts', 'Milk-based sauces'],
    hiddenSources: ['Mashed potato mixes', 'Breaded coatings', 'Chocolate and sweets', 'Prepared soups'],
    crossContaminationRisks: ['Shared milk frothers and jugs', 'Butter spread contamination', 'Shared spoons in prep stations'],
    symptoms: ['Rashes', 'Stomach cramps', 'Breathing issues', 'Swelling', 'Anaphylaxis in severe cases'],
    ukRegulation: UK_FIR_TEXT
  },
  Eggs: {
    name: 'Eggs',
    description: 'Egg allergy is triggered by proteins in egg whites or yolks.',
    commonSources: ['Cakes and pastries', 'Mayonnaise and aioli', 'Fresh pasta and quiche'],
    hiddenSources: ['Glazes and batters', 'Some dressings', 'Processed meat binders', 'Meringue-based desserts'],
    crossContaminationRisks: ['Shared whisk and mixing bowls', 'Shared grill surfaces', 'Egg wash brushes used across dishes'],
    symptoms: ['Skin irritation', 'Nausea', 'Vomiting', 'Respiratory symptoms', 'Anaphylaxis in severe cases'],
    ukRegulation: UK_FIR_TEXT
  },
  Fish: {
    name: 'Fish',
    description: 'Fish allergy can be triggered by proteins from one or multiple fish species.',
    commonSources: ['Fish fillets and fish cakes', 'Fish sauces', 'Anchovy pastes'],
    hiddenSources: ['Worcestershire sauce', 'Asian curry pastes', 'Stocks and broths'],
    crossContaminationRisks: ['Shared fryers with fish products', 'Shared tongs and spatulas', 'Same grill for fish and non-fish items'],
    symptoms: ['Hives', 'Abdominal pain', 'Nasal congestion', 'Breathing difficulty', 'Anaphylaxis in severe cases'],
    ukRegulation: UK_FIR_TEXT
  },
  Crustaceans: {
    name: 'Crustaceans',
    description: 'Crustacean allergy includes prawns, crab, lobster, and similar shellfish.',
    commonSources: ['Prawns and shrimp dishes', 'Crab and lobster mains', 'Seafood platters'],
    hiddenSources: ['Shrimp paste', 'Seafood flavoring powders', 'Some curry bases'],
    crossContaminationRisks: ['Shared seafood prep boards', 'Shared oil in fryers', 'Steamer baskets used for mixed products'],
    symptoms: ['Itchy skin', 'Digestive upset', 'Swelling', 'Shortness of breath', 'Anaphylaxis in severe cases'],
    ukRegulation: UK_FIR_TEXT
  },
  Molluscs: {
    name: 'Molluscs',
    description: 'Mollusc allergy includes mussels, oysters, squid, clams, and snails.',
    commonSources: ['Mussels and oyster dishes', 'Calamari', 'Seafood stews'],
    hiddenSources: ['Oyster sauce', 'Shellfish stock', 'Some seafood seasonings'],
    crossContaminationRisks: ['Shared shellfish prep trays', 'Mixed seafood grills', 'Common serving utensils'],
    symptoms: ['Nausea', 'Stomach cramps', 'Skin rash', 'Throat tightness', 'Severe allergic reactions'],
    ukRegulation: UK_FIR_TEXT
  },
  Peanuts: {
    name: 'Peanuts',
    description: 'Peanut allergy can cause severe reactions even with trace exposure.',
    commonSources: ['Peanut sauces (satay)', 'Peanut butter', 'Groundnut oil and flour'],
    hiddenSources: ['Desserts and toppings', 'Asian marinades', 'Snack coatings', 'Some vegan substitutes'],
    crossContaminationRisks: ['Shared grinders/blenders', 'Shared oil for frying', 'Cross-contact from garnish stations'],
    symptoms: ['Hives', 'Swelling', 'Vomiting', 'Wheezing', 'Rapid anaphylactic reactions'],
    ukRegulation: UK_FIR_TEXT
  },
  'Tree Nuts': {
    name: 'Tree Nuts',
    description: 'Tree nut allergy includes almonds, walnuts, cashews, hazelnuts, and others.',
    commonSources: ['Nut-based desserts', 'Pesto and nut sauces', 'Nut oils'],
    hiddenSources: ['Ice cream and praline toppings', 'Granola and cereals', 'Baked goods'],
    crossContaminationRisks: ['Shared bakery tools', 'Nut dust in prep areas', 'Shared chopping boards'],
    symptoms: ['Tingling mouth', 'Swelling', 'Abdominal pain', 'Breathing problems', 'Anaphylaxis in severe cases'],
    ukRegulation: UK_FIR_TEXT
  },
  Soy: {
    name: 'Soy',
    description: 'Soy allergy is triggered by soy proteins in beans and soy-derived ingredients.',
    commonSources: ['Tofu and soy milk', 'Soy sauce', 'Edamame and miso'],
    hiddenSources: ['Processed meats', 'Vegetable protein blends', 'Baked products with soy flour'],
    crossContaminationRisks: ['Shared marinade containers', 'Shared grill tools', 'Mixed prep counters'],
    symptoms: ['Itchy skin', 'Digestive discomfort', 'Nasal symptoms', 'Swelling', 'Severe reactions in sensitive individuals'],
    ukRegulation: UK_FIR_TEXT
  },
  Celery: {
    name: 'Celery',
    description: 'Celery allergy includes celery stalks, leaves, seeds, and celeriac.',
    commonSources: ['Soups and stocks', 'Salads', 'Seasoning mixes'],
    hiddenSources: ['Celery salt', 'Pre-made sauces', 'Processed meats'],
    crossContaminationRisks: ['Shared chopping boards', 'Stock pots used across dishes', 'Batch prep containers'],
    symptoms: ['Itchy mouth', 'Rashes', 'Stomach discomfort', 'Swelling', 'Breathing issues in severe cases'],
    ukRegulation: UK_FIR_TEXT
  },
  Mustard: {
    name: 'Mustard',
    description: 'Mustard allergy includes mustard seeds, powder, and prepared mustard.',
    commonSources: ['Dressings and vinaigrettes', 'Marinades', 'Sandwich spreads'],
    hiddenSources: ['Spice blends', 'Curries', 'Processed meats', 'Sauce bases'],
    crossContaminationRisks: ['Shared squeeze bottles', 'Shared prep spoons', 'Drip contamination in condiment stations'],
    symptoms: ['Skin irritation', 'Digestive symptoms', 'Swelling', 'Respiratory symptoms', 'Anaphylaxis in severe cases'],
    ukRegulation: UK_FIR_TEXT
  },
  Sesame: {
    name: 'Sesame',
    description: 'Sesame allergy includes sesame seeds, oil, and tahini-based products.',
    commonSources: ['Burger buns and breads', 'Tahini and hummus', 'Sesame oil dishes'],
    hiddenSources: ['Crackers and breadsticks', 'Asian sauces', 'Seasoning mixes'],
    crossContaminationRisks: ['Shared bread boards', 'Loose seed spillover in prep areas', 'Shared scoops for toppings'],
    symptoms: ['Hives', 'Nausea', 'Swelling', 'Coughing or wheeze', 'Severe allergic reactions'],
    ukRegulation: UK_FIR_TEXT
  },
  Sulphites: {
    name: 'Sulphites',
    description: 'Sulphites are preservatives used in some drinks and processed foods.',
    commonSources: ['Wine and beer', 'Dried fruits', 'Pickled products'],
    hiddenSources: ['Prepared sauces', 'Soft drinks', 'Pre-cut potato products'],
    crossContaminationRisks: ['Shared containers for preserved ingredients', 'Inconsistent label checks for premade products'],
    symptoms: ['Headaches', 'Breathing irritation', 'Skin reactions', 'Digestive upset', 'Asthma flare-ups in sensitive people'],
    ukRegulation: UK_FIR_TEXT
  },
  Lupin: {
    name: 'Lupin',
    description: 'Lupin is a legume used as flour or protein ingredient in some baked foods.',
    commonSources: ['Specialty breads', 'Pastries', 'Pasta'],
    hiddenSources: ['Gluten-free flour blends', 'Protein-enriched bakery items', 'Imported snack products'],
    crossContaminationRisks: ['Shared flour bins', 'Bakery prep surfaces', 'Scoops used across flour types'],
    symptoms: ['Itching', 'Digestive symptoms', 'Swelling', 'Breathing issues', 'Severe reactions in peanut-sensitive individuals'],
    ukRegulation: UK_FIR_TEXT
  }
};

export const getAllergenDetail = (name: string, fallbackDescription?: string): AllergenDetail => {
  const detail = ALLERGEN_DETAILS[name];
  if (detail) return detail;

  return {
    name,
    description: fallbackDescription || `${name} can trigger allergic reactions in sensitive individuals.`,
    commonSources: ['Recipes containing this ingredient group', 'Prepared sauces and dressings', 'Processed or pre-made foods'],
    hiddenSources: ['Seasoning blends', 'Stock cubes', 'Marinades and glazes'],
    crossContaminationRisks: ['Shared preparation areas', 'Shared utensils', 'Shared storage containers'],
    symptoms: ['Skin reactions', 'Digestive discomfort', 'Breathing symptoms', 'Severe reactions in sensitive individuals'],
    ukRegulation: UK_FIR_TEXT
  };
};
