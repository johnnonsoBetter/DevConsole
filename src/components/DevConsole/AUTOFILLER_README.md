# 🪄 Auto-Filler - DevConsole Feature

Automatically fill form inputs with realistic test data for rapid development and testing.

---

## ✨ Features

- **🔍 Auto-Scan**: Automatically detects all forms on page load and navigation
- **🎯 Smart Detection**: Intelligently identifies input types from labels, names, placeholders, and attributes
- **⚡ Instant Fill**: Fill individual inputs or entire forms with one click
- **🎨 Rich Dataset**: Diverse, realistic mock data for common field types
- **♻️ Auto-Rescan**: Automatically rescans when you navigate to different pages
- **🎭 Visual Feedback**: Clear indicators for fillable vs. readonly/disabled inputs

---

## 🚀 Usage

### Opening Auto-Filler

1. Open DevConsole: `Ctrl + ~`
2. Click the **"Auto-Filler"** tab (✨ icon)

### Filling Forms

**Option 1: Fill Entire Form**

- Click the **"Fill All"** button on any form card
- All fillable inputs will be populated instantly

**Option 2: Fill Individual Inputs**

- Expand a form by clicking the chevron (▼)
- Click the ⚡ (Zap) icon next to any input to fill it

**Option 3: Clear Form**

- Click the 🗑️ (Trash) icon to clear all inputs in a form

### Rescanning

- **Automatic**: Forms are rescanned when you navigate to a new page
- **Manual**: Click **"Rescan Forms"** button to force a new scan

---

## 📊 Supported Field Types

Auto-Filler intelligently detects and fills these field types:

### Personal Information

- ✅ First Name
- ✅ Last Name
- ✅ Full Name
- ✅ Email
- ✅ Phone/Mobile
- ✅ Age
- ✅ Date of Birth

### Address

- ✅ Street Address
- ✅ Apartment/Unit
- ✅ City
- ✅ State/Province
- ✅ ZIP/Postal Code
- ✅ Country

### Business

- ✅ Company Name
- ✅ Job Title

### Web/Tech

- ✅ Username
- ✅ Password
- ✅ URL/Website

### Payment (Test Data)

- ✅ Credit Card (test numbers)
- ✅ CVV

### Other

- ✅ Description/Message
- ✅ Numbers/Quantities
- ✅ Dates
- ✅ Colors
- ✅ Sizes

---

## 🎯 Smart Field Detection

Auto-Filler uses multiple signals to identify field types:

1. **Input Type**: `<input type="email">` → Email field
2. **Name Attribute**: `name="firstName"` → First name
3. **Label Text**: `<label>Phone Number</label>` → Phone field
4. **Placeholder**: `placeholder="Enter your city"` → City field
5. **Pattern Matching**: Fuzzy matching on combined text

---

## 🔧 Technical Details

### How It Works

1. **DOM Scanning**: Queries all `<form>` elements on the page
2. **Input Analysis**: Examines each `<input>` and `<textarea>` element
3. **Type Inference**: Uses heuristics to determine field purpose
4. **Data Generation**: Selects appropriate mock data from dataset
5. **Event Triggering**: Fires `input`, `change`, and `blur` events for framework compatibility

### Skipped Inputs

The following inputs are **not** filled (marked with 🔒):

- `disabled` inputs
- `readonly` inputs
- `type="submit"` buttons
- `type="button"` buttons
- `type="file"` inputs
- `type="hidden"` inputs

### Framework Compatibility

Auto-Filler triggers all necessary DOM events to ensure compatibility with:

- ✅ **React** (controlled components)
- ✅ **RedwoodJS** (form hooks)
- ✅ **Vue**
- ✅ **Angular**
- ✅ **Vanilla JS**

---

## 📦 File Structure

```
web/src/
├── components/DevConsole/
│   └── AutoFillerPanel.tsx          # Main UI component
└── lib/devConsole/
    ├── formScanner.ts                # DOM scanning logic
    ├── formFiller.ts                 # Input filling logic
    └── mockDataset.ts                # Mock data generation
```

---

## 🎨 UI Components

### Form Card

Displays each detected form with:

- Form name (from `name`, `id`, or nearby heading)
- Fillable input count
- Form action (if present)
- Expand/collapse toggle
- "Fill All" button
- "Clear" button

### Input Row

Shows each input with:

- Status icon (🔒 locked, ✓ filled, ○ empty)
- Label or name
- Detected field type (color-coded)
- Input type
- Placeholder text
- Current value (if any)
- Individual fill button (⚡)

---

## 🔮 Future Enhancements

Planned improvements:

- [ ] **AI-Powered Generation**: Use LLM to generate contextual data
- [ ] **Custom Datasets**: Allow users to define their own mock data
- [ ] **Data Profiles**: Save/load different data scenarios
- [ ] **Select/Checkbox Support**: Fill dropdown and checkbox inputs
- [ ] **Validation Testing**: Automatically test form validation
- [ ] **Form Snapshots**: Save/restore form state
- [ ] **CSV Import**: Import data from CSV files
- [ ] **Multi-Language Support**: Generate data in different languages
- [ ] **Regex Matching**: Advanced pattern detection for field types

---

## 🐛 Troubleshooting

**Forms not detected?**

- Ensure forms are rendered in the DOM
- Click "Rescan Forms" after page loads completely
- Check browser console for errors

**Inputs not filling?**

- Verify inputs are not `disabled` or `readonly`
- Check if form uses custom validation that blocks programmatic input
- Try filling individual inputs to isolate issues

**Auto-rescan not working?**

- Auto-rescan works for SPA navigation (React Router, etc.)
- Full page reloads will trigger on mount
- Check browser console for MutationObserver errors

---

## 💡 Tips & Tricks

1. **Rapid Testing**: Use Auto-Filler to quickly test form submissions without manual typing
2. **Validation Testing**: Fill forms with valid data, then modify specific fields to test validation
3. **Edge Cases**: After auto-fill, manually modify fields to test edge cases
4. **Performance**: Auto-Filler is optimized for forms with 100+ inputs
5. **Custom Forms**: Works with any framework's form components

---

**Built with ❤️ for the LinkVybe team**

_"Stop typing, start testing."_
