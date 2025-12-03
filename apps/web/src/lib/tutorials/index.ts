/**
 * Tutorial Definitions
 * 
 * Define all tutorials here by importing and calling defineTutorial
 */

import { defineTutorial, defineTutorialStepContent } from "@/lib/tutorial-system";

// ============================================================
// Tutorial: Welcome (shows users how to use Else mods)
// ============================================================
defineTutorial("welcome", [
  "intro",
  // Add more steps here as the tutorial grows
]);

defineTutorialStepContent("welcome", "intro", {
  title: "This is a sample app integrated with Else",
  content: "Use the dropdown for examples of what you can build with Else, and to try it yourself.",
});

// ============================================================
// Tutorial: Else Welcome (Else development environment)
// ============================================================
defineTutorial("else-welcome", [
  "intro",
  "vibe-coding",
]);

defineTutorialStepContent("else-welcome", "intro", {
  title: "Welcome to your Else workspace",
  content: "Your existing product is the starting point. Sign in to the account you just created.",
});

defineTutorialStepContent("else-welcome", "vibe-coding", {
  title: "Vibe coding with Else",
  content: "Start with asking Else to do something simple, like changing styling. Then you can move on to adding a whole new feature.",
});

// Add more tutorials as needed
// defineTutorial("your-tutorial-name", ["step1", "step2", "step3"]);

export * from "@/lib/tutorial-system";

