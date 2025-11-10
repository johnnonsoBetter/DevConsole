# Settings Guide

## Overview

The DevConsole Settings panel provides a centralized location for configuring all extension features. Access it by clicking the **Settings** tab in the DevConsole.

## Available Settings

### 1. GitHub Integration

Configure GitHub credentials to create issues directly from error logs.

#### Required Fields:
- **GitHub Username**: Your GitHub account username (e.g., `octocat`)
- **Repository**: Target repository in `owner/repo-name` format (e.g., `facebook/react`)
- **Personal Access Token**: GitHub PAT with `repo` scope

#### Setup Steps:
1. Visit [GitHub Settings → Tokens](https://github.com/settings/tokens/new?scopes=repo&description=DevConsole)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "DevConsole Extension")
4. Select the `repo` scope (full control of private repositories)
5. Click "Generate token" and copy it immediately
6. Paste the token in the settings panel
7. Click "Test Connection" to verify
8. Click "Save Settings" to store your configuration

#### Features:
- ✅ Test connection before saving
- ✅ Automatic URL normalization (URLs → `owner/repo` format)
- ✅ Secure token storage (browser local storage only)
- ✅ Create issues from error logs with one click
- ✅ Auto-populate issue title, description, and labels

#### Security Notes:
- Tokens are stored locally in your browser
- Never share your personal access token
- Revoke tokens you no longer use
- Use fine-grained tokens when possible

---

### 2. GraphQL Explorer

Configure the GraphQL endpoint for the interactive API explorer.

#### Required Fields:
- **GraphQL Endpoint URL**: Your GraphQL API endpoint

#### Supported Formats:
- **Absolute URL**: `https://api.example.com/graphql`
- **Relative Path**: `/graphql` (uses current domain)

#### Setup Steps:
1. Enter your GraphQL endpoint URL
2. Click "Test Connection" to verify accessibility
3. Click "Save Settings" to store your configuration
4. Navigate to the GraphQL tab to start exploring

#### Example Endpoints:
- **Public GitHub API**: `https://api.github.com/graphql`
- **Local Development**: `http://localhost:4000/graphql`
- **Relative Path**: `/api/graphql`

#### Features:
- ✅ Test endpoint connectivity
- ✅ Support for both absolute and relative URLs
- ✅ Auto-validation of URL format
- ✅ GraphiQL-based interactive explorer
- ✅ Syntax highlighting and autocomplete

---

### 3. General Settings

Additional extension preferences (Coming Soon).

#### Planned Features:
- 🔜 Theme customization
- 🔜 Keyboard shortcut configuration
- 🔜 Data export preferences
- 🔜 Notification settings
- 🔜 Performance tuning options

---

## UI Features

### Navigation Sidebar
- **Organized Sections**: Easy-to-navigate settings categories
- **Active Indicators**: Visual feedback for current section
- **Descriptions**: Helpful context for each setting category

### Form Validation
- **Real-time Validation**: Immediate feedback on input errors
- **Smart Normalization**: Auto-format repository URLs
- **Required Field Indicators**: Clear marking of mandatory fields

### Status Feedback
- **Success Messages**: Confirmation when settings are saved
- **Error Messages**: Clear error descriptions with solutions
- **Test Results**: Visual feedback from connection tests

### Help & Documentation
- **Inline Guidance**: Contextual help for each setting
- **Setup Instructions**: Step-by-step guides
- **Example Values**: Real-world configuration examples

---

## Troubleshooting

### GitHub Integration Issues

**Problem**: "Connection failed" error
- ✅ Verify your GitHub username is correct
- ✅ Ensure repository format is `owner/repo-name`
- ✅ Check that your token has the `repo` scope
- ✅ Confirm the repository exists and you have access
- ✅ Test with a public repository first

**Problem**: "Invalid token" error
- ✅ Generate a new token with correct scopes
- ✅ Ensure you copied the entire token (no spaces)
- ✅ Check token hasn't expired
- ✅ Verify token hasn't been revoked

### GraphQL Explorer Issues

**Problem**: "Connection failed" error
- ✅ Verify the endpoint URL is correct
- ✅ Check for CORS issues (see console for details)
- ✅ Ensure the GraphQL server is running
- ✅ Test endpoint in browser first
- ✅ Check authentication requirements

**Problem**: "Invalid URL format" error
- ✅ Use absolute URL: `https://api.example.com/graphql`
- ✅ Or relative path: `/graphql`
- ✅ Include protocol (`http://` or `https://`)
- ✅ Avoid trailing slashes

---

## Best Practices

### Security
1. **Use Fine-Grained Tokens**: When possible, use GitHub's fine-grained personal access tokens with minimal scopes
2. **Regular Token Rotation**: Rotate tokens periodically for security
3. **Environment Separation**: Use different tokens for dev/staging/production
4. **Token Storage**: Never commit tokens to version control

### Configuration
1. **Test Before Saving**: Always test connections before saving settings
2. **Backup Settings**: Export settings before major changes
3. **Document Changes**: Keep track of configuration updates
4. **Review Permissions**: Regularly audit repository access

### Performance
1. **Optimize GraphQL Queries**: Use specific fields instead of wildcards
2. **Rate Limiting**: Be aware of GitHub API rate limits
3. **Batch Operations**: Use bulk operations when possible
4. **Cache Results**: Enable caching for frequently accessed data

---

## Keyboard Shortcuts

- `Ctrl + ~`: Toggle DevConsole
- `Cmd/Ctrl + K`: Open command palette
- `ESC`: Close dialogs and panels

---

## Support & Feedback

For issues, feature requests, or questions:
1. Check the [GitHub Issues](https://github.com/johnnonsoBetter/DevConsole/issues)
2. Review the [Documentation](./ARCHITECTURE.md)
3. Submit a new issue with the "Settings" label

---

## Version History

### v1.0.0 (Current)
- ✨ Unified settings panel
- ✨ GitHub integration configuration
- ✨ GraphQL explorer settings
- ✨ Connection testing
- ✨ Auto-validation and normalization

### Coming Soon
- 🔜 Settings import/export
- 🔜 Multiple profile support
- 🔜 Advanced configuration options
- 🔜 Cloud sync capabilities
