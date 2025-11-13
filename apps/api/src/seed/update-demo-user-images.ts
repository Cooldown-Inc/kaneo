import { eq } from "drizzle-orm";
import db from "../database";
import { userTable } from "../database/schema";
import { SEED_MEMBERS } from "./seed-data";

/**
 * Updates existing demo users' profile pictures to use local images instead of ui-avatars URLs.
 * Run this script once to migrate existing demo users to the new local profile pictures.
 */
export async function updateDemoUserImages() {
  console.log("🔄 Updating demo user profile pictures...");

  try {
    let updatedCount = 0;

    for (const member of SEED_MEMBERS) {
      const existingUser = await db.query.userTable.findFirst({
        where: eq(userTable.email, member.email),
      });

      if (existingUser && existingUser.image !== member.image) {
        await db
          .update(userTable)
          .set({ image: member.image })
          .where(eq(userTable.id, existingUser.id));
        updatedCount++;
        console.log(`✅ Updated ${member.name} (${member.email})`);
      } else if (existingUser) {
        console.log(`⏭️  ${member.name} already has correct image`);
      } else {
        console.log(`⚠️  User not found: ${member.email}`);
      }
    }

    console.log(`\n✅ Migration complete! Updated ${updatedCount} user(s).`);
  } catch (error) {
    console.error("❌ Error updating demo user images:", error);
    throw error;
  }
}

// Run if executed directly
if (process.argv[1]?.includes("update-demo-user-images")) {
  updateDemoUserImages()
    .then(() => {
      console.log("Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed:", error);
      process.exit(1);
    });
}

