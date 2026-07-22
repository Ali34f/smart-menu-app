/**
 * Hospitality / restaurant job roles for staff profiles (workplace title, not dashboard permission).
 * Value and label are the same string for easy matching with existing free-text values.
 */
export const JOB_ROLE_OTHER = '__other__';

export const RESTAURANT_JOB_ROLE_GROUPS: { group: string; roles: string[] }[] = [
  {
    group: 'Kitchen — leadership & senior',
    roles: [
      'Executive Chef',
      'Head Chef',
      'Sous Chef',
      'Kitchen Manager',
      'Chef de Cuisine',
      'Pastry Chef',
      'Head Baker',
      'Banquet Chef',
      'Relief Chef'
    ]
  },
  {
    group: 'Kitchen — production',
    roles: [
      'Chef de Partie',
      'Senior Chef de Partie',
      'Commis Chef',
      'Line Cook',
      'Grill Cook',
      'Fry Cook',
      'Prep Cook',
      'Sandwich / Deli Chef',
      'Pizza Chef',
      'Tandoor Chef',
      'Curry Chef',
      'Sushi Chef',
      'Dim Sum Chef',
      'Butcher (in-house)',
      'Garde Manger / Cold section',
      'Kitchen Porter',
      'Dishwasher',
      'Steward / Pot wash'
    ]
  },
  {
    group: 'Front of house — service',
    roles: [
      "Maitre d'",
      'Head Waiter',
      'Head Waitress',
      'Senior Waiter',
      'Senior Waitress',
      'Waiter',
      'Waitress',
      'Server',
      'Food Runner',
      'Busser / Clearing',
      'Room Service Server',
      'Sommelier',
      'Beverage Server'
    ]
  },
  {
    group: 'Front of house — guest & floor',
    roles: [
      'Host',
      'Hostess',
      'Receptionist',
      'Cashier',
      'Floor Supervisor',
      'Shift Supervisor',
      'Floor Manager',
      'Restaurant Manager',
      'Assistant Restaurant Manager',
      'General Manager',
      'Events Host',
      'Reservation Agent',
      'Concierge (restaurant)'
    ]
  },
  {
    group: 'Bar',
    roles: [
      'Bar Manager',
      'Assistant Bar Manager',
      'Head Bartender',
      'Bartender',
      'Barista',
      'Bar Back',
      'Mixologist',
      'Cellar Person'
    ]
  },
  {
    group: 'Café, quick service & takeaway',
    roles: [
      'Café Manager',
      'Counter Staff',
      'Drive-thru Crew',
      'Takeaway Packager',
      'Delivery Coordinator (in-house)'
    ]
  },
  {
    group: 'Catering, events & outside',
    roles: [
      'Catering Manager',
      'Event Chef',
      'Event Server',
      'Banquet Captain',
      'Delivery Driver (food)',
      'Van Driver'
    ]
  },
  {
    group: 'Support & operations',
    roles: [
      'Stock Controller',
      'Storekeeper',
      'Purchasing Assistant',
      'Receiving Clerk',
      'Cleaner',
      'Night Cleaner',
      'Security',
      'Maintenance / Handyperson',
      'Health & Safety Officer',
      'Food Safety / HACCP Lead',
      'Trainer (F&B)',
      'HR Administrator',
      'Rota / Scheduling Coordinator',
      'Payroll Administrator'
    ]
  },
  {
    group: 'Entry & development',
    roles: ['Trainee Chef', 'Trainee Server', 'Apprentice', 'Intern', 'Work Experience']
  }
];

const ALL_ROLE_SET = new Set(
  RESTAURANT_JOB_ROLE_GROUPS.flatMap((g) => g.roles)
);

const ALL_ROLE_VALUES = RESTAURANT_JOB_ROLE_GROUPS.flatMap((g) => g.roles);

export function isPresetRestaurantJobRole(value: string | null | undefined): boolean {
  if (!value) return false;
  return ALL_ROLE_SET.has(String(value).trim());
}

/** Map stored job title to dropdown + optional custom text for "Other". */
export function parseJobTitleForForm(stored: string | null | undefined): {
  selectValue: string;
  customTitle: string;
} {
  const raw = String(stored || '').trim();
  if (!raw) return { selectValue: '', customTitle: '' };
  if (ALL_ROLE_SET.has(raw)) return { selectValue: raw, customTitle: '' };
  const lower = raw.toLowerCase();
  const caseMatch = ALL_ROLE_VALUES.find((r) => r.toLowerCase() === lower);
  if (caseMatch) return { selectValue: caseMatch, customTitle: '' };
  return { selectValue: JOB_ROLE_OTHER, customTitle: raw };
}

export function resolvedJobTitleForApi(selectValue: string, customTitle: string): string {
  if (selectValue === JOB_ROLE_OTHER) return customTitle.trim();
  return selectValue.trim();
}
