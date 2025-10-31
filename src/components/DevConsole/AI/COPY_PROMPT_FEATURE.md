# Copy AI Prompt Feature

## 📋 Example Output

When you click the "Copy AI Prompt" button on a log, it copies a professionally formatted prompt ready to paste into ChatGPT, Claude, or any AI assistant:

```markdown
# Debug Assistance Request

## Error Overview

**Severity:** ERROR
**Timestamp:** 10/31/2025, 3:45:23 PM
**Occurrence Count:** 1

## Error Message
```

TypeError: Cannot read property 'map' of undefined

```

## Stack Trace
```

at CampaignList.render (CampaignList.tsx:42:18)
at renderWithHooks (react-dom.development.js:14985:18)
at mountIndeterminateComponent (react-dom.development.js:17811:13)
at beginWork (react-dom.development.js:19049:16)
at HTMLUnknownElement.callCallback (react-dom.development.js:3945:14)

````

## Additional Context
```json
[
  {
    "componentStack": "...",
    "errorInfo": "..."
  }
]
````

## Source Location

```
CampaignList.tsx:42
```

## What I Need Help With

Please analyze this error and provide:

1. **Root Cause Analysis**
   - What is causing this error?
   - Why is it happening?

2. **Impact Assessment**
   - How critical is this issue?
   - What functionality is affected?

3. **Solution**
   - Step-by-step fix instructions
   - Code examples if applicable
   - Best practices to prevent this in the future

4. **Testing**
   - How to verify the fix works
   - Edge cases to consider

## Additional Information

- Framework: RedwoodJS (React frontend + GraphQL API)
- Environment: development
- Browser: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...

```

## ✨ Features

### 1. Professional Formatting
- Clean markdown structure
- Code blocks for error messages and stack traces
- Organized sections for easy reading

### 2. Complete Context
- Error severity and timestamp
- Full stack trace
- Additional arguments/context
- Source location
- Browser/environment info

### 3. Structured Request
- Pre-written analysis framework
- Specific asks (root cause, solution, testing)
- Best practices guidance

### 4. One-Click Copy
- Instant clipboard copy
- Visual confirmation (✓ Copied!)
- Fallback for older browsers

## 🎨 UI Design

**Button Appearance:**
- Purple/pink gradient background
- Sparkles + Copy icons
- "Copy AI Prompt" label
- Smooth hover and click animations
- Changes to "Copied!" with checkmark on success

**Placement:**
- Top of log details panel
- Next to "AI Analyze" button
- Before "Create Issue" button

## 🔧 Usage

1. Select any log entry
2. Click "Copy AI Prompt" button
3. Open ChatGPT/Claude/etc.
4. Paste (Cmd+V / Ctrl+V)
5. Get detailed debugging help!

## 💡 Why This Is Useful

**Instead of manually typing:**
> "I'm getting an error that says Cannot read property map of undefined..."

**You get a professionally formatted prompt with:**
- ✅ Full error context
- ✅ Stack trace included
- ✅ Environment details
- ✅ Structured request for help
- ✅ Ready to paste instantly

**Result:** Better AI responses, faster debugging! 🚀
```
