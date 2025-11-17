# Notes Feature Architecture

## 📁 Folder Structure

```
src/features/notes/
├── index.ts                    # Barrel export (public API)
├── stores/
│   └── notes.ts               # Pure state management (Zustand)
├── services/
│   └── notesService.ts        # Business logic & persistence
└── components/
    └── (future: shared components specific to notes)
```

## 🏗️ Architecture Layers

### 1. **Store Layer** (`stores/notes.ts`)
- **Purpose:** Pure state management
- **Responsibilities:**
  - Define state shape
  - Provide synchronous state setters
  - NO async operations
  - NO side effects
- **Pattern:** Zustand with Immer's `produce`

```typescript
// ✅ DO: Pure state updates
setNotes: (notes) => set(produce(draft => { draft.notes = notes }))

// ❌ DON'T: Async operations in store
loadNotes: async () => { await fetch(...) } // Wrong!
```

### 2. **Service Layer** (`services/notesService.ts`)
- **Purpose:** Business logic & persistence
- **Responsibilities:**
  - Handle async operations
  - Interact with StorageService
  - Implement business rules
  - Orchestrate state updates
- **Pattern:** Static class methods

```typescript
// ✅ DO: Business logic in service
static async createNote(data) {
  const note = { ...data, id: generateId() };
  addNote(note);  // Update state
  await StorageService.set(KEY, notes);  // Persist
}
```

### 3. **Component Layer** (outside feature folder)
- **Purpose:** UI presentation
- **Responsibilities:**
  - Render UI
  - Handle user interactions
  - Call service methods
  - Select state from store
- **Pattern:** React functional components

```typescript
// ✅ DO: Use service for operations
const notes = useNotesStore(s => s.notes);
await NotesService.createNote(data);
```

## 📦 Public API (index.ts)

The barrel export provides a clean, centralized API:

```typescript
// Single import point
import { useNotesStore, NotesService, Note } from '@/features/notes';

// Instead of:
import { useNotesStore } from '@/features/notes/stores/notes';
import { NotesService } from '@/features/notes/services/notesService';
```

## 🎯 Design Principles

1. **Separation of Concerns**
   - State ≠ Logic
   - Store knows nothing about persistence
   - Service knows nothing about UI

2. **Single Responsibility**
   - Store: State shape & updates
   - Service: Operations & side effects
   - Component: User interface

3. **Testability**
   - Test state logic independently
   - Mock StorageService in service tests
   - Test components with mocked service

4. **Scalability**
   - Easy to add new operations (service methods)
   - Easy to add new state (store properties)
   - Components remain thin

## 📝 Usage Examples

### Creating a Note
```typescript
// In component
const handleCreate = async () => {
  const note = await NotesService.createNote({
    title: 'My Note',
    content: '',
    tags: [],
    pinned: false
  });
  // State automatically updated by service
};
```

### Reading State
```typescript
// Selective subscription (optimized)
const notes = useNotesStore(s => s.notes);
const filter = useNotesStore(s => s.filter);

// Or destructure for multiple values
const { notes, filter, selectNote } = useNotesStore();
```

### Updating State
```typescript
// Always go through service for persistence
await NotesService.updateNote(id, { title: 'Updated' });

// Direct state updates (no persistence) - rare
const { setFilter } = useNotesStore.getState();
setFilter({ search: 'query' });
```

## 🔄 Data Flow

```
User Action (Component)
    ↓
Service Method Call
    ↓
State Update (Store) ← Immediate (Optimistic)
    ↓
Storage Persistence ← Async (Background)
    ↓
UI Re-render (Component) ← Automatic (Zustand)
```

## 🚫 Anti-Patterns to Avoid

❌ **Mixing concerns in store:**
```typescript
// DON'T: Async in store
const useNotesStore = create((set) => ({
  loadNotes: async () => {
    const notes = await fetch(...);  // Wrong!
  }
}));
```

❌ **Direct storage calls in components:**
```typescript
// DON'T: Storage in component
const MyComponent = () => {
  await StorageService.set(KEY, data);  // Wrong!
};
```

❌ **Business logic in components:**
```typescript
// DON'T: Complex logic in component
const handleCreate = () => {
  const id = `note-${Date.now()}-${Math.random()}`;  // Wrong!
  const note = { id, ...data };
  // ... more logic
};
```

## ✅ Best Practices

1. **Keep stores pure** - No async, no side effects
2. **Service as single source of truth** for operations
3. **Use barrel exports** - Import from feature root
4. **Selective subscriptions** - `useStore(s => s.prop)`
5. **Optimistic updates** - Update state before persistence
6. **Centralized error handling** - In service layer

## 🧪 Testing Strategy

### Store Tests
```typescript
test('setNotes updates state', () => {
  const { setNotes, notes } = useNotesStore.getState();
  setNotes([mockNote]);
  expect(notes).toEqual([mockNote]);
});
```

### Service Tests
```typescript
test('createNote persists to storage', async () => {
  jest.spyOn(StorageService, 'set');
  await NotesService.createNote(data);
  expect(StorageService.set).toHaveBeenCalled();
});
```

### Component Tests
```typescript
test('renders notes from store', () => {
  useNotesStore.setState({ notes: [mockNote] });
  render(<NotesPanel />);
  expect(screen.getByText(mockNote.title)).toBeInTheDocument();
});
```

## 📚 References

- [Zustand Documentation](https://docs.pmnd.rs/zustand/)
- [Immer Documentation](https://immerjs.github.io/immer/)
- [Service Layer Pattern](https://martinfowler.com/eaaCatalog/serviceLayer.html)
- [Domain-Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design)

---

**Key Takeaway:** This architecture makes the codebase maintainable, testable, and scalable by clearly separating state management from business logic.
