/**
 * Tutorial Definitions
 * 
 * Define all tutorials here by importing and calling defineTutorial
 */

import { defineTutorial } from "@/lib/tutorial-system";

// Welcome tutorial - shows users how to use Else mods
defineTutorial("welcome", [
  "intro",
  // Add more steps here as the tutorial grows
]);

// Add more tutorials as needed
// defineTutorial("your-tutorial-name", ["step1", "step2", "step3"]);

export * from "@/lib/tutorial-system";

