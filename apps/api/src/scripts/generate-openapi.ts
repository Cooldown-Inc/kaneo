import { writeFileSync } from "fs";
import { join } from "path";

/**
 * Generate OpenAPI spec by fetching it from the running API server
 * 
 * Make sure the API server is running before executing this script:
 * pnpm dev
 * 
 * Then run: pnpm openapi:generate
 */
async function generateOpenAPI() {
  const apiUrl = process.env.KANEO_API_URL || "http://localhost:1337";
  const openapiUrl = `${apiUrl}/api/openapi`;

  try {
    console.log(`Fetching OpenAPI spec from ${openapiUrl}...`);
    const response = await fetch(openapiUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`,
      );
    }

    const spec = await response.json();
    const outputPath = join(process.cwd(), "openapi.json");
    writeFileSync(outputPath, JSON.stringify(spec, null, 2));
    console.log(`✅ OpenAPI spec generated at ${outputPath}`);
    console.log(`\n📝 Note: Routes need describeRoute() middleware to appear in the spec.`);
    console.log(`   Add describeRoute() to routes incrementally as needed.`);
  } catch (error) {
    console.error("❌ Failed to generate OpenAPI spec:", error);
    console.error(
      "\nMake sure the API server is running. Start it with: pnpm dev",
    );
    process.exit(1);
  }
}

generateOpenAPI();
