/**
 * Relational Persona Generator
 * Generates internally consistent fake data where all fields relate to each other
 * 
 * Features:
 * - Age matches birthdate
 * - City matches zip/area code  
 * - Email domain matches company name
 * - Phone area code matches location
 * - All data is coherent within the same persona
 */

import type { Dataset } from './types';

// ============================================================================
// LOCATION DATA (Real US data for consistency)
// ============================================================================

interface LocationData {
  city: string;
  state: string;
  stateCode: string;
  zip: string;
  areaCode: string;
  timezone: string;
  country: string;
}

const US_LOCATIONS: LocationData[] = [
  { city: 'New York', state: 'New York', stateCode: 'NY', zip: '10001', areaCode: '212', timezone: 'America/New_York', country: 'United States' },
  { city: 'Los Angeles', state: 'California', stateCode: 'CA', zip: '90001', areaCode: '213', timezone: 'America/Los_Angeles', country: 'United States' },
  { city: 'Chicago', state: 'Illinois', stateCode: 'IL', zip: '60601', areaCode: '312', timezone: 'America/Chicago', country: 'United States' },
  { city: 'Houston', state: 'Texas', stateCode: 'TX', zip: '77001', areaCode: '713', timezone: 'America/Chicago', country: 'United States' },
  { city: 'Phoenix', state: 'Arizona', stateCode: 'AZ', zip: '85001', areaCode: '602', timezone: 'America/Phoenix', country: 'United States' },
  { city: 'Philadelphia', state: 'Pennsylvania', stateCode: 'PA', zip: '19101', areaCode: '215', timezone: 'America/New_York', country: 'United States' },
  { city: 'San Antonio', state: 'Texas', stateCode: 'TX', zip: '78201', areaCode: '210', timezone: 'America/Chicago', country: 'United States' },
  { city: 'San Diego', state: 'California', stateCode: 'CA', zip: '92101', areaCode: '619', timezone: 'America/Los_Angeles', country: 'United States' },
  { city: 'Dallas', state: 'Texas', stateCode: 'TX', zip: '75201', areaCode: '214', timezone: 'America/Chicago', country: 'United States' },
  { city: 'San Jose', state: 'California', stateCode: 'CA', zip: '95101', areaCode: '408', timezone: 'America/Los_Angeles', country: 'United States' },
  { city: 'Austin', state: 'Texas', stateCode: 'TX', zip: '78701', areaCode: '512', timezone: 'America/Chicago', country: 'United States' },
  { city: 'San Francisco', state: 'California', stateCode: 'CA', zip: '94102', areaCode: '415', timezone: 'America/Los_Angeles', country: 'United States' },
  { city: 'Seattle', state: 'Washington', stateCode: 'WA', zip: '98101', areaCode: '206', timezone: 'America/Los_Angeles', country: 'United States' },
  { city: 'Denver', state: 'Colorado', stateCode: 'CO', zip: '80201', areaCode: '303', timezone: 'America/Denver', country: 'United States' },
  { city: 'Boston', state: 'Massachusetts', stateCode: 'MA', zip: '02101', areaCode: '617', timezone: 'America/New_York', country: 'United States' },
  { city: 'Nashville', state: 'Tennessee', stateCode: 'TN', zip: '37201', areaCode: '615', timezone: 'America/Chicago', country: 'United States' },
  { city: 'Portland', state: 'Oregon', stateCode: 'OR', zip: '97201', areaCode: '503', timezone: 'America/Los_Angeles', country: 'United States' },
  { city: 'Miami', state: 'Florida', stateCode: 'FL', zip: '33101', areaCode: '305', timezone: 'America/New_York', country: 'United States' },
  { city: 'Atlanta', state: 'Georgia', stateCode: 'GA', zip: '30301', areaCode: '404', timezone: 'America/New_York', country: 'United States' },
  { city: 'Minneapolis', state: 'Minnesota', stateCode: 'MN', zip: '55401', areaCode: '612', timezone: 'America/Chicago', country: 'United States' },
];

// ============================================================================
// NAME DATA
// ============================================================================

const FIRST_NAMES_MALE = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan', 'Jacob'];
const FIRST_NAMES_FEMALE = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle', 'Dorothy', 'Carol', 'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];

// ============================================================================
// COMPANY DATA
// ============================================================================

interface CompanyData {
  name: string;
  domain: string;
  industry: string;
}

const COMPANIES: CompanyData[] = [
  { name: 'TechCorp Industries', domain: 'techcorp.com', industry: 'Technology' },
  { name: 'Innovate Solutions', domain: 'innovatesolutions.io', industry: 'Software' },
  { name: 'Digital Dynamics', domain: 'digitaldynamics.com', industry: 'Digital Marketing' },
  { name: 'CloudScale Systems', domain: 'cloudscale.io', industry: 'Cloud Computing' },
  { name: 'DataFlow Analytics', domain: 'dataflow.ai', industry: 'Data Science' },
  { name: 'Quantum Labs', domain: 'quantumlabs.tech', industry: 'Research' },
  { name: 'Nexus Enterprises', domain: 'nexusent.com', industry: 'Enterprise Software' },
  { name: 'Apex Technologies', domain: 'apextech.io', industry: 'Technology' },
  { name: 'Summit Digital', domain: 'summitdigital.com', industry: 'Digital Agency' },
  { name: 'Horizon Innovations', domain: 'horizoninnovations.co', industry: 'Innovation' },
  { name: 'Velocity Partners', domain: 'velocitypartners.com', industry: 'Consulting' },
  { name: 'Synergy Solutions', domain: 'synergysolutions.io', industry: 'Business Solutions' },
  { name: 'Prime Software', domain: 'primesoftware.dev', industry: 'Software Development' },
  { name: 'Atlas Global', domain: 'atlasglobal.com', industry: 'International Business' },
  { name: 'Elevate Media', domain: 'elevatemedia.co', industry: 'Media' },
];

// ============================================================================
// JOB TITLES
// ============================================================================

const JOB_TITLES = [
  'Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Principal Engineer',
  'Product Manager', 'Senior Product Manager', 'Director of Product',
  'UX Designer', 'Senior UX Designer', 'Design Lead',
  'Data Scientist', 'Senior Data Scientist', 'Machine Learning Engineer',
  'DevOps Engineer', 'Site Reliability Engineer', 'Platform Engineer',
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Engineering Manager', 'Technical Lead', 'VP of Engineering',
  'Marketing Manager', 'Digital Marketing Specialist', 'Growth Manager',
  'Sales Representative', 'Account Executive', 'Sales Manager',
  'Project Manager', 'Program Manager', 'Scrum Master',
];

// ============================================================================
// STREET DATA
// ============================================================================

const STREET_NAMES = ['Main', 'Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Washington', 'Park', 'Lake', 'Hill', 'River', 'Spring', 'Valley', 'Forest', 'Sunset', 'Highland', 'Meadow', 'Garden', 'Church', 'School'];
const STREET_TYPES = ['Street', 'Avenue', 'Boulevard', 'Drive', 'Lane', 'Road', 'Way', 'Court', 'Place', 'Circle'];

// ============================================================================
// MESSAGE TEMPLATES
// ============================================================================

const MESSAGE_TEMPLATES = [
  "Hi, I'm {firstName} from {company}. I'm reaching out regarding the opportunity. Looking forward to connecting!",
  "Hello! My name is {firstName} {lastName} and I'm very interested in this. Please feel free to contact me at {email}.",
  "Thank you for the opportunity. As a {title} at {company}, I believe I can bring valuable experience to your team.",
  "I'm excited about this position. With my background in {industry}, I'm confident I can make a meaningful contribution.",
  "Looking forward to discussing this further. You can reach me at {phone} or {email}. Best regards, {firstName}.",
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateStreetAddress(): string {
  const number = randomInt(100, 9999);
  const street = randomElement(STREET_NAMES);
  const type = randomElement(STREET_TYPES);
  return `${number} ${street} ${type}`;
}

function generateBirthdate(age: number): string {
  const now = new Date();
  const birthYear = now.getFullYear() - age;
  const month = randomInt(1, 12);
  const day = randomInt(1, 28); // Safe for all months
  return `${birthYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function generateUsername(firstName: string, lastName: string): string {
  const styles = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
    `${firstName[0].toLowerCase()}${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${randomInt(10, 99)}`,
  ];
  return randomElement(styles);
}

function formatPhone(areaCode: string): string {
  const exchange = randomInt(200, 999);
  const subscriber = randomInt(1000, 9999);
  return `+1 (${areaCode}) ${exchange}-${subscriber}`;
}

function generateCreditCard(): { number: string; expiry: string; cvv: string } {
  // Generate Stripe test card format
  const testCards = [
    '4242424242424242', // Visa
    '5555555555554444', // Mastercard
    '378282246310005',  // Amex
  ];
  
  const now = new Date();
  const expiryYear = now.getFullYear() + randomInt(1, 5);
  const expiryMonth = randomInt(1, 12);
  
  return {
    number: randomElement(testCards),
    expiry: `${String(expiryMonth).padStart(2, '0')}/${String(expiryYear).slice(-2)}`,
    cvv: String(randomInt(100, 999)),
  };
}

function generateSSN(): string {
  // Fake SSN format (never real)
  return `${randomInt(100, 999)}-${randomInt(10, 99)}-${randomInt(1000, 9999)}`;
}

// ============================================================================
// MAIN PERSONA GENERATOR
// ============================================================================

export interface GeneratedPersona extends Dataset {
  data: Dataset['data'] & {
    // Extended relational fields
    age?: string;
    birthdate?: string;
    username?: string;
    gender?: string;
    industry?: string;
    companyDomain?: string;
    areaCode?: string;
    timezone?: string;
    // Credit card (test)
    creditCardNumber?: string;
    creditCardExpiry?: string;
    creditCardCVV?: string;
    // Other
    ssn?: string;
    password?: string;
    bio?: string;
  };
}

export interface PersonaOptions {
  gender?: 'male' | 'female' | 'random';
  ageRange?: { min: number; max: number };
  location?: LocationData;
  company?: CompanyData;
}

/**
 * Generate a fully consistent persona where all data relates
 */
export function generateRelationalPersona(options: PersonaOptions = {}): GeneratedPersona {
  // Determine gender
  const gender = options.gender === 'random' || !options.gender
    ? (Math.random() > 0.5 ? 'male' : 'female')
    : options.gender;
  
  // Pick names based on gender
  const firstName = gender === 'male' 
    ? randomElement(FIRST_NAMES_MALE)
    : randomElement(FIRST_NAMES_FEMALE);
  const lastName = randomElement(LAST_NAMES);
  const fullName = `${firstName} ${lastName}`;
  
  // Generate consistent age
  const ageRange = options.ageRange || { min: 22, max: 55 };
  const age = randomInt(ageRange.min, ageRange.max);
  const birthdate = generateBirthdate(age);
  
  // Pick location (city, state, zip, area code all match)
  const location = options.location || randomElement(US_LOCATIONS);
  
  // Pick company
  const company = options.company || randomElement(COMPANIES);
  
  // Generate consistent contact info
  const username = generateUsername(firstName, lastName);
  const email = `${username}@${company.domain}`;
  const phone = formatPhone(location.areaCode);
  const address = generateStreetAddress();
  
  // Job title
  const title = randomElement(JOB_TITLES);
  
  // Website
  const website = `https://${firstName.toLowerCase()}${lastName.toLowerCase()}.com`;
  
  // Credit card (test data)
  const creditCard = generateCreditCard();
  
  // Generate personalized message
  const messageTemplate = randomElement(MESSAGE_TEMPLATES);
  const message = messageTemplate
    .replace(/{firstName}/g, firstName)
    .replace(/{lastName}/g, lastName)
    .replace(/{company}/g, company.name)
    .replace(/{title}/g, title)
    .replace(/{industry}/g, company.industry)
    .replace(/{email}/g, email)
    .replace(/{phone}/g, phone);
  
  // Bio
  const bio = `${title} at ${company.name} based in ${location.city}, ${location.stateCode}. ${age} years of experience in ${company.industry}.`;
  
  // Generate unique ID
  const id = `persona-${firstName.toLowerCase()}-${lastName.toLowerCase()}-${Date.now()}`;
  
  return {
    id,
    name: `${fullName} (${company.name})`,
    category: company.industry.toLowerCase(),
    data: {
      // Basic info
      name: fullName,
      firstName,
      lastName,
      email,
      phone,
      
      // Age/birth (consistent)
      age: String(age),
      birthdate,
      gender: gender === 'male' ? 'Male' : 'Female',
      
      // Location (all consistent)
      address,
      city: location.city,
      state: location.stateCode,
      zip: location.zip,
      country: location.country,
      timezone: location.timezone,
      areaCode: location.areaCode,
      
      // Work (consistent)
      company: company.name,
      companyDomain: company.domain,
      title,
      industry: company.industry,
      website,
      
      // Account
      username,
      password: `Test${firstName}${randomInt(100, 999)}!`,
      
      // Payment (test data)
      creditCardNumber: creditCard.number,
      creditCardExpiry: creditCard.expiry,
      creditCardCVV: creditCard.cvv,
      
      // Other
      ssn: generateSSN(),
      message,
      bio,
      number: String(randomInt(1, 100)),
    },
  };
}

/**
 * Generate multiple unique personas
 */
export function generateMultiplePersonas(count: number): GeneratedPersona[] {
  const personas: GeneratedPersona[] = [];
  const usedNames = new Set<string>();
  
  for (let i = 0; i < count; i++) {
    let persona: GeneratedPersona;
    let attempts = 0;
    
    // Ensure unique names
    do {
      persona = generateRelationalPersona({
        gender: i % 2 === 0 ? 'male' : 'female', // Alternate genders
      });
      attempts++;
    } while (usedNames.has(persona.data.name!) && attempts < 10);
    
    usedNames.add(persona.data.name!);
    personas.push(persona);
  }
  
  return personas;
}

// Export location/company data for UI
export { US_LOCATIONS, COMPANIES };
export type { LocationData, CompanyData };
