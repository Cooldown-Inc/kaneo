/**
 * Tutorial System
 * 
 * Manages sequential tutorial flows with localStorage persistence.
 * Only one tutorial can be active at a time, showing one step at a time.
 */

const STORAGE_KEY = "kaneo_tutorials";

export interface Tutorial {
  name: string;
  steps: string[];
}

interface TutorialState {
  activeTutorial: string | null;
  currentStepIndex: number;
  completedTutorials: string[];
}

// In-memory tutorial definitions
const tutorials = new Map<string, Tutorial>();

// Get current state from localStorage
function getState(): TutorialState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load tutorial state:", error);
  }

  return {
    activeTutorial: null,
    currentStepIndex: 0,
    completedTutorials: [],
  };
}

// Save state to localStorage
function setState(state: TutorialState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save tutorial state:", error);
  }
}

/**
 * Define a tutorial with its steps
 */
export function defineTutorial(name: string, steps: string[]): void {
  tutorials.set(name, { name, steps });
}

/**
 * Start a tutorial (activates it and resets to first step)
 */
export function startTutorial(name: string): void {
  const tutorial = tutorials.get(name);
  if (!tutorial) {
    console.warn(`Tutorial "${name}" is not defined`);
    return;
  }

  const state = getState();
  
  // Check if already completed
  if (state.completedTutorials.includes(name)) {
    console.log(`Tutorial "${name}" already completed`);
    return;
  }

  setState({
    ...state,
    activeTutorial: name,
    currentStepIndex: 0,
  });
}

/**
 * Check if a specific tutorial step should be shown
 */
export function shouldShowStep(tutorialName: string, stepName: string): boolean {
  const state = getState();
  const tutorial = tutorials.get(tutorialName);

  if (!tutorial) {
    return false;
  }

  // Tutorial must be active
  if (state.activeTutorial !== tutorialName) {
    return false;
  }

  // Step must be the current step
  const currentStep = tutorial.steps[state.currentStepIndex];
  return currentStep === stepName;
}

/**
 * Complete the current step and advance to the next
 */
export function completeStep(tutorialName: string, stepName: string): void {
  const state = getState();
  const tutorial = tutorials.get(tutorialName);

  if (!tutorial) {
    console.warn(`Tutorial "${tutorialName}" is not defined`);
    return;
  }

  // Verify this is the active tutorial and current step
  if (state.activeTutorial !== tutorialName) {
    return;
  }

  const currentStep = tutorial.steps[state.currentStepIndex];
  if (currentStep !== stepName) {
    return;
  }

  const nextStepIndex = state.currentStepIndex + 1;

  // Check if tutorial is complete
  if (nextStepIndex >= tutorial.steps.length) {
    setState({
      ...state,
      activeTutorial: null,
      currentStepIndex: 0,
      completedTutorials: [...state.completedTutorials, tutorialName],
    });
  } else {
    // Move to next step
    setState({
      ...state,
      currentStepIndex: nextStepIndex,
    });
  }
}

/**
 * Get the currently active tutorial and step
 */
export function getActiveTutorial(): {
  name: string;
  currentStep: string;
  stepIndex: number;
  totalSteps: number;
} | null {
  const state = getState();

  if (!state.activeTutorial) {
    return null;
  }

  const tutorial = tutorials.get(state.activeTutorial);
  if (!tutorial) {
    return null;
  }

  return {
    name: state.activeTutorial,
    currentStep: tutorial.steps[state.currentStepIndex],
    stepIndex: state.currentStepIndex,
    totalSteps: tutorial.steps.length,
  };
}

/**
 * Cancel/stop the current tutorial without completing it
 */
export function cancelTutorial(): void {
  const state = getState();
  setState({
    ...state,
    activeTutorial: null,
    currentStepIndex: 0,
  });
}

/**
 * Reset a completed tutorial (allows it to be started again)
 */
export function resetTutorial(name: string): void {
  const state = getState();
  setState({
    ...state,
    completedTutorials: state.completedTutorials.filter((t) => t !== name),
  });
}

/**
 * Check if a tutorial has been completed
 */
export function isTutorialCompleted(name: string): boolean {
  const state = getState();
  return state.completedTutorials.includes(name);
}

/**
 * Clear all tutorial state (useful for testing)
 */
export function clearAllTutorials(): void {
  localStorage.removeItem(STORAGE_KEY);
}

