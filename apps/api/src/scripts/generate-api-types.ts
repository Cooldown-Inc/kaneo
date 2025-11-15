import * as ts from "typescript";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateApiTypes() {
  const apiSrcPath = join(__dirname, "../index.ts");
  const outputPath = join(
    __dirname,
    "../../../../apps/web/src/lib/api-types.ts",
  );

  console.log(`📖 Reading API source: ${apiSrcPath}`);

  // Create a TypeScript program
  const program = ts.createProgram([apiSrcPath], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    skipLibCheck: true,
    esModuleInterop: true,
    resolveJsonModule: true,
    strict: true,
    // Add paths for workspace dependencies
    paths: {
      "@kaneo/*": ["../../packages/*/src"],
    },
    baseUrl: join(__dirname, "../../.."),
  });

  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(apiSrcPath);

  if (!sourceFile) {
    throw new Error(`Could not find source file: ${apiSrcPath}`);
  }

  // Find the AppType export
  let appTypeNode: ts.TypeAliasDeclaration | null = null;

  function visit(node: ts.Node) {
    if (
      ts.isTypeAliasDeclaration(node) &&
      node.name.text === "AppType" &&
      ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      appTypeNode = node;
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (!appTypeNode) {
    throw new Error("Could not find AppType export in source file");
  }

  // Get the type from the type checker
  // We need to get the type from the type node, not the declaration
  const typeNode = appTypeNode.type;
  const type = checker.getTypeAtLocation(typeNode);
  
  // Convert the type to a string
  // Use fullyQualifiedName: false to avoid fully qualified names
  // Use noTruncation: true to get the full type expansion
  const typeString = checker.typeToString(
    type,
    undefined,
    ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.InTypeAlias,
  );

  // Generate the output file
  const output = `// This file is auto-generated. Do not edit manually.
// Run: pnpm generate:api-types
// Generated from: apps/api/src/index.ts

import type { Hono, BlankSchema, MergeSchemaPath, Schema } from "hono";

/**
 * Type representing all API routes.
 * This is a union of all route types from the backend API.
 */
export type AppType = ${typeString};
`;

  writeFileSync(outputPath, output, "utf-8");
  console.log(`✅ Generated API types at: ${outputPath}`);
  console.log(`📝 Type length: ${typeString.length} characters`);
}

generateApiTypes().catch((error) => {
  console.error("❌ Failed to generate API types:", error);
  process.exit(1);
});

