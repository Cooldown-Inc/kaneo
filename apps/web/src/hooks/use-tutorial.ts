import { useEffect, useState } from "react";
import {
  completeStep,
  getActiveTutorial,
  shouldShowStep,
  startTutorial,
} from "@/lib/tutorial-system";

/**
 * Hook to use tutorial system with React state updates
 */
export function useTutorial() {
  const [activeTutorial, setActiveTutorial] = useState(getActiveTutorial());

  // Listen for tutorial state changes via custom events
  useEffect(() => {
    const handleTutorialChange = () => {
      setActiveTutorial(getActiveTutorial());
    };

    window.addEventListener("tutorial-state-changed", handleTutorialChange);
    return () => {
      window.removeEventListener("tutorial-state-changed", handleTutorialChange);
    };
  }, []);

  return {
    activeTutorial,
    startTutorial: (name: string) => {
      startTutorial(name);
      window.dispatchEvent(new CustomEvent("tutorial-state-changed"));
    },
    completeStep: (tutorialName: string, stepName: string) => {
      completeStep(tutorialName, stepName);
      window.dispatchEvent(new CustomEvent("tutorial-state-changed"));
    },
    shouldShowStep,
  };
}

/**
 * Hook specifically for checking if a tutorial step should show
 */
export function useTutorialStep(tutorialName: string, stepName: string): {
  shouldShow: boolean;
  complete: () => void;
} {
  const [shouldShow, setShouldShow] = useState(
    shouldShowStep(tutorialName, stepName)
  );

  useEffect(() => {
    const handleTutorialChange = () => {
      setShouldShow(shouldShowStep(tutorialName, stepName));
    };

    window.addEventListener("tutorial-state-changed", handleTutorialChange);
    return () => {
      window.removeEventListener("tutorial-state-changed", handleTutorialChange);
    };
  }, [tutorialName, stepName]);

  const complete = () => {
    completeStep(tutorialName, stepName);
    window.dispatchEvent(new CustomEvent("tutorial-state-changed"));
  };

  return { shouldShow, complete };
}

