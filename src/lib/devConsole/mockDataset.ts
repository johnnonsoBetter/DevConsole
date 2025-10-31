/**
 * Mock Dataset for Auto-Filler
 * Diverse, realistic test data for form filling
 */

export const MOCK_DATASET = {
  // Personal Information
  firstNames: [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
    'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
    'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
    'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
    'Aiden', 'Sophia', 'Ethan', 'Emma', 'Noah', 'Olivia', 'Liam', 'Ava',
  ],

  lastNames: [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
    'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  ],

  // Email domains
  emailDomains: [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
    'protonmail.com', 'mail.com', 'aol.com', 'example.com', 'test.com',
  ],

  // Phone numbers (formatted)
  phonePrefixes: ['555', '444', '333', '222', '777', '888', '999'],

  // Addresses
  streetNames: [
    'Main', 'Oak', 'Maple', 'Cedar', 'Elm', 'Washington', 'Lake', 'Hill',
    'Park', 'Pine', 'View', 'First', 'Second', 'Third', 'Sunset', 'Broadway',
  ],

  streetTypes: ['St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Rd', 'Way', 'Ct', 'Pl'],

  cities: [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
    'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
    'San Francisco', 'Seattle', 'Denver', 'Boston', 'Portland', 'Miami',
  ],

  states: [
    'CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI',
    'NJ', 'VA', 'WA', 'AZ', 'MA', 'TN', 'IN', 'MO', 'MD', 'WI',
  ],

  countries: [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
    'France', 'Spain', 'Italy', 'Japan', 'Mexico',
  ],

  // Company/Business
  companyNames: [
    'Acme Corp', 'Global Industries', 'Tech Solutions', 'Innovation Labs',
    'Digital Ventures', 'Smart Systems', 'Creative Studios', 'Future Tech',
    'Prime Enterprises', 'Elite Services', 'Alpha Group', 'Beta Technologies',
  ],

  jobTitles: [
    'Software Engineer', 'Product Manager', 'Marketing Director', 'Sales Representative',
    'UX Designer', 'Data Analyst', 'Project Manager', 'Business Analyst',
    'DevOps Engineer', 'Content Writer', 'Customer Success Manager', 'VP of Operations',
  ],

  // Web/Tech
  usernames: [
    'cooluser123', 'techguru', 'developer99', 'designer_pro', 'coder_elite',
    'digitalwizard', 'webmaster', 'pixelperfect', 'dataninja', 'cloudknight',
  ],

  passwords: [
    'TestPass123!', 'SecureP@ss456', 'Demo#2024', 'TempPass789!', 'Sample@123',
  ],

  urls: [
    'https://example.com', 'https://test-site.com', 'https://demo.io',
    'https://sample-app.com', 'https://mywebsite.net',
  ],

  // Dates (relative)
  birthYears: Array.from({ length: 50 }, (_, i) => 1960 + i), // 1960-2010

  // Numbers
  ages: Array.from({ length: 70 }, (_, i) => 18 + i), // 18-88

  // Text content
  shortDescriptions: [
    'This is a test description',
    'Sample content for testing',
    'Demo text placeholder',
    'Example input value',
    'Test data entry',
  ],

  longDescriptions: [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    'This is a longer sample text that can be used to fill textarea elements or larger input fields with more content.',
    'Comprehensive test data that provides realistic content for form validation and testing purposes in development.',
  ],

  // Credit Card (test numbers only)
  creditCards: [
    '4111111111111111', // Visa test
    '5555555555554444', // Mastercard test
    '378282246310005',  // Amex test
  ],

  cvv: ['123', '456', '789', '321', '654'],

  // Other
  colors: ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Brown'],

  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],

  quantities: [1, 2, 3, 5, 10, 20, 50, 100],
};

/**
 * Helper to get random item from array
 */
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate random number within range
 */
function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random data based on field type
 */
export function generateMockData(fieldType: string): string {
  switch (fieldType.toLowerCase()) {
    case 'firstname':
    case 'first_name':
    case 'fname':
      return randomItem(MOCK_DATASET.firstNames);

    case 'lastname':
    case 'last_name':
    case 'lname':
      return randomItem(MOCK_DATASET.lastNames);

    case 'fullname':
    case 'full_name':
    case 'name':
      return `${randomItem(MOCK_DATASET.firstNames)} ${randomItem(MOCK_DATASET.lastNames)}`;

    case 'email':
      const firstName = randomItem(MOCK_DATASET.firstNames).toLowerCase();
      const lastName = randomItem(MOCK_DATASET.lastNames).toLowerCase();
      const domain = randomItem(MOCK_DATASET.emailDomains);
      return `${firstName}.${lastName}@${domain}`;

    case 'phone':
    case 'telephone':
    case 'mobile':
      const prefix = randomItem(MOCK_DATASET.phonePrefixes);
      const mid = randomNumber(100, 999);
      const end = randomNumber(1000, 9999);
      return `(${prefix}) ${mid}-${end}`;

    case 'address':
    case 'street':
    case 'address1':
      const num = randomNumber(100, 9999);
      const street = randomItem(MOCK_DATASET.streetNames);
      const type = randomItem(MOCK_DATASET.streetTypes);
      return `${num} ${street} ${type}`;

    case 'address2':
    case 'apartment':
    case 'unit':
      return Math.random() > 0.5 ? `Apt ${randomNumber(1, 500)}` : `Unit ${randomNumber(1, 100)}`;

    case 'city':
      return randomItem(MOCK_DATASET.cities);

    case 'state':
    case 'province':
      return randomItem(MOCK_DATASET.states);

    case 'zip':
    case 'zipcode':
    case 'postal':
    case 'postalcode':
      return randomNumber(10000, 99999).toString();

    case 'country':
      return randomItem(MOCK_DATASET.countries);

    case 'company':
    case 'organization':
      return randomItem(MOCK_DATASET.companyNames);

    case 'jobtitle':
    case 'job_title':
    case 'position':
      return randomItem(MOCK_DATASET.jobTitles);

    case 'username':
    case 'user':
      return randomItem(MOCK_DATASET.usernames);

    case 'password':
      return randomItem(MOCK_DATASET.passwords);

    case 'url':
    case 'website':
      return randomItem(MOCK_DATASET.urls);

    case 'date':
    case 'birthday':
    case 'birthdate':
    case 'dob':
      const year = randomItem(MOCK_DATASET.birthYears);
      const month = String(randomNumber(1, 12)).padStart(2, '0');
      const day = String(randomNumber(1, 28)).padStart(2, '0');
      return `${year}-${month}-${day}`;

    case 'age':
      return randomItem(MOCK_DATASET.ages).toString();

    case 'number':
    case 'quantity':
      return randomItem(MOCK_DATASET.quantities).toString();

    case 'color':
      return randomItem(MOCK_DATASET.colors);

    case 'size':
      return randomItem(MOCK_DATASET.sizes);

    case 'description':
    case 'message':
    case 'comment':
      return randomItem(MOCK_DATASET.shortDescriptions);

    case 'bio':
    case 'about':
    case 'notes':
      return randomItem(MOCK_DATASET.longDescriptions);

    case 'creditcard':
    case 'credit_card':
    case 'cardnumber':
      return randomItem(MOCK_DATASET.creditCards);

    case 'cvv':
    case 'cvc':
    case 'securitycode':
      return randomItem(MOCK_DATASET.cvv);

    default:
      // Generic fallback
      return `Test ${randomNumber(1, 1000)}`;
  }
}
