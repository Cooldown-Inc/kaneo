# Tutorial System

A simple, reusable tutorial system for guiding users through features with sequential popovers.

## How It Works

1. **Define tutorials** with ordered steps in `apps/web/src/lib/tutorials/index.ts`
2. **Place TutorialPopover components** wherever you want tutorial content to appear
3. **Start a tutorial** from anywhere in your app
4. The system shows **one step at a time** in order, persisting progress to localStorage

## Usage

### 1. Define a Tutorial

In `apps/web/src/lib/tutorials/index.ts`:

```typescript
import { defineTutorial } from "@/lib/tutorial-system";

defineTutorial("onboarding", [
  "welcome",
  "create-project",
  "add-task",
  "done",
]);
```

### 2. Add Tutorial Popovers to Your UI

Place `TutorialPopover` components where you want tutorial content to appear:

```tsx
import { TutorialPopover } from "@/components/ui/tutorial-popover";

function MyComponent() {
  return (
    <div className="relative">
      {/* Your regular content */}
      <Button>Create Project</Button>
      
      {/* Tutorial popover - only shows when this step is active */}
      <TutorialPopover 
        tutorial="onboarding" 
        step="create-project"
        title="Create Your First Project"
        side="right"
      >
        <p>Click this button to create your first project and get started!</p>
      </TutorialPopover>
    </div>
  );
}
```

### 3. Start the Tutorial

```tsx
import { startTutorial } from "@/lib/tutorials";

function WelcomeScreen() {
  const handleStart = () => {
    startTutorial("onboarding");
  };

  return <Button onClick={handleStart}>Start Tutorial</Button>;
}
```

## Key Features

- **Sequential**: Only one step shows at a time
- **Persistent**: Progress saved to localStorage
- **Automatic**: Clicking "Got it" advances to the next step
- **Conditional**: Popovers only render when their step is active
- **Simple**: Just place components where you want tutorial content

## API Reference

### `defineTutorial(name: string, steps: string[])`
Define a tutorial with ordered steps.

### `startTutorial(name: string)`
Start a tutorial from the beginning.

### `<TutorialPopover>`
Component that conditionally renders tutorial content.

**Props:**
- `tutorial: string` - Tutorial name
- `step: string` - Step identifier
- `children: ReactNode` - Tutorial content to display
- `title?: string` - Optional title
- `side?: "top" | "right" | "bottom" | "left"` - Popover position
- `align?: "start" | "center" | "end"` - Popover alignment
- `buttonText?: string` - Custom button text (default: "Got it")
- `onComplete?: () => void` - Callback when step completes

## Example: Multi-Step Tutorial

```tsx
// Define tutorial
defineTutorial("quick-start", ["step1", "step2", "step3"]);

// Screen 1
<TutorialPopover tutorial="quick-start" step="step1" title="Welcome">
  <p>Welcome to the app!</p>
</TutorialPopover>

// Screen 1 (same screen, different element)
<TutorialPopover tutorial="quick-start" step="step2" title="Next Feature">
  <p>Here's another feature on this screen.</p>
</TutorialPopover>

// Screen 2 (different screen)
<TutorialPopover tutorial="quick-start" step="step3" title="Final Step">
  <p>This shows on a different screen!</p>
</TutorialPopover>
```

## Utility Functions

```typescript
import { 
  isTutorialCompleted,
  resetTutorial,
  cancelTutorial,
  getActiveTutorial,
} from "@/lib/tutorials";

// Check if completed
if (isTutorialCompleted("onboarding")) {
  // Show different UI
}

// Reset for testing
resetTutorial("onboarding");

// Cancel current tutorial
cancelTutorial();

// Get current state
const active = getActiveTutorial();
// { name: "onboarding", currentStep: "welcome", stepIndex: 0, totalSteps: 4 }
```

