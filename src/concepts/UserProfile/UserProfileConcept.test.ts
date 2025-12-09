import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UserProfileConcept from "./UserProfileConcept.ts";

// Define some constant UIDs for testing
const testUserA_UID = "userA_uid_alice" as ID;
const testUserB_UID = "userB_uid_bob" as ID;
const testUserC_UID = "userC_uid_charlie" as ID;

/**
 * Helper function to retrieve a user profile and assert that it doesn't return an error.
 * @param concept The UserProfileConcept instance.
 * @param userId The ID of the user to retrieve.
 * @returns The profile object.
 */
async function getProfileOrThrow(
  concept: UserProfileConcept,
  userId: ID
): Promise<{
  name: string;
  email: string;
  profilePicture: string;
  reward: number;
  fieldOfInterests: string[];
}> {
  const result = await concept._getProfile({ user: userId });
  assertNotEquals(
    "error" in result,
    true,
    `_getProfile for user ${userId} should not return an error. Error: ${
      "error" in result ? result.error : "N/A"
    }`
  );
  // As per query specification, _getProfile returns an array of objects.
  return (result as [{ profile: any }])[0].profile;
}

Deno.test({
  name: "Principle: User customizes profile on signup, then edits it",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
    const [db, client] = await testDb();
    const userProfileConcept = new UserProfileConcept(db);

    try {
      console.log(
        "\n--- Principle Test: User customizes profile on signup, then edits it ---"
      );
      console.log(
        "Demonstrating the principle: (1) Users customize their profile when signing up, (2) Users can edit their own profile information."
      );

      // # trace: (1) User signs up and customizes their profile
      console.log(
        "\nTrace Step 1: User Alice signs up for BuyBye with initial profile details."
      );
      const initialInterests = ["Technology", "Gaming"];
      const createUserResult = await userProfileConcept.createUser({
        uid: testUserA_UID,
        name: "Alice Smith",
        email: "alice@example.com",
        profilePicture: "alice.jpg",
        fieldOfInterests: initialInterests,
      });

      assertNotEquals(
        "error" in createUserResult,
        true,
        "createUser should succeed for a new user."
      );
      const { user: aliceId } = createUserResult as { user: ID };
      assertExists(
        aliceId,
        "A user ID should be returned upon successful creation."
      );
      console.log(
        `  User Alice (ID: ${aliceId}) created with UID: '${testUserA_UID}'.`
      );

      // Verify initial profile state using _getProfile
      const aliceProfile = await getProfileOrThrow(
        userProfileConcept,
        testUserA_UID
      );

      assertEquals(
        aliceProfile.name,
        "Alice Smith",
        "Alice's name in profile should match initial input."
      );
      assertEquals(
        aliceProfile.email,
        "alice@example.com",
        "Alice's email in profile should match initial input."
      );
      assertEquals(
        aliceProfile.profilePicture,
        "alice.jpg",
        "Alice's profile picture in profile should match initial input."
      );
      assertEquals(
        aliceProfile.reward,
        0,
        "Alice's initial reward in profile should be 0."
      );
      assertEquals(
        aliceProfile.fieldOfInterests.sort(), // Sort for consistent comparison
        initialInterests.sort(),
        "Alice's initial interests in profile should match input."
      );
      console.log(
        "  Initial profile for Alice verified via _getProfile: `createUser` effects confirmed."
      );

      // # trace: (2) User Alice edits their profile information (name, picture, password, interests)
      console.log("\nTrace Step 2: User Alice updates her profile name.");
      const newName = "Alicia Smith-Jones";
      const updateNameResult = await userProfileConcept.updateProfileName({
        user: testUserA_UID, // Use uid, not document _id
        newName: newName,
      });
      assertEquals(
        "error" in updateNameResult,
        false,
        "updateProfileName should succeed for an existing user."
      );
      console.log(`  Alice's name successfully updated to '${newName}'.`);

      // Verify name update
      const aliceProfileAfterNameUpdate = await getProfileOrThrow(
        userProfileConcept,
        testUserA_UID
      );
      assertEquals(
        aliceProfileAfterNameUpdate.name,
        newName,
        "Alice's name should be updated in her profile."
      );
      console.log(
        "  Name update verified via _getProfile: `updateProfileName` effects confirmed."
      );

      console.log("\nTrace Step 3: User Alice updates her profile picture.");
      const newPicture = "alicia_new_avatar.png";
      const updatePictureResult = await userProfileConcept.updateProfilePicture(
        {
          user: testUserA_UID, // Use uid, not document _id
          newProfilePicture: newPicture,
        }
      );
      assertEquals(
        "error" in updatePictureResult,
        false,
        "updateProfilePicture should succeed for an existing user."
      );
      console.log(
        `  Alice's profile picture successfully updated to '${newPicture}'.`
      );

      // Verify picture update
      const aliceProfileAfterPictureUpdate = await getProfileOrThrow(
        userProfileConcept,
        testUserA_UID
      );
      assertEquals(
        aliceProfileAfterPictureUpdate.profilePicture,
        newPicture,
        "Alice's profile picture should be updated in her profile."
      );
      console.log(
        "  Profile picture update verified via _getProfile: `updateProfilePicture` effects confirmed."
      );

      console.log("\nTrace Step 4: User Alice updates her fields of interest.");
      const updatedInterests = ["Coding", "Fitness", "Gaming", "Reading"];
      const updateInterestsResult = await userProfileConcept.updateInterests({
        user: testUserA_UID, // Use uid, not document _id
        newFieldsOfInterests: updatedInterests,
      });
      assertEquals(
        "error" in updateInterestsResult,
        false,
        "updateInterests should succeed for an existing user."
      );
      console.log(
        `  Alice's interests successfully updated to: ${updatedInterests.join(
          ", "
        )}.`
      );

      // Verify interests update
      const aliceProfileAfterInterestsUpdate = await getProfileOrThrow(
        userProfileConcept,
        testUserA_UID
      );
      assertEquals(
        aliceProfileAfterInterestsUpdate.fieldOfInterests.sort(),
        updatedInterests.sort(),
        "Alice's interests should be updated in her profile."
      );
      console.log(
        "  Interests update verified via _getProfile: `updateInterests` effects confirmed."
      );

      console.log(
        "\nPrinciple Fulfilled: The series of actions demonstrate that a user can successfully customize their profile on signup and then modify various aspects of their profile, aligning with the UserProfile concept's principle."
      );
    } finally {
      await db.dropDatabase();
      await client.close();
    }
  }
);

Deno.test({
  name: "Action: createUser requires no existing user with matching UID",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
    const [db, client] = await testDb();
    const userProfileConcept = new UserProfileConcept(db);

    try {
      console.log(
        "\n--- Action Test: createUser requires no existing user with matching UID ---"
      );

      // Initial creation of user Bob (should succeed)
      console.log(
        `Testing requirement satisfaction: Initial creation of user '${testUserB_UID}'.`
      );
      const initialCreateResult = await userProfileConcept.createUser({
        uid: testUserB_UID,
        name: "Bob Johnson",
        email: "bob@example.com",
        profilePicture: "bob.jpg",
        fieldOfInterests: ["Sports"],
      });
      assertNotEquals(
        "error" in initialCreateResult,
        true,
        `Initial createUser for '${testUserB_UID}' should succeed.`
      );
      const { user: bobId } = initialCreateResult as { user: ID };
      console.log(`  User Bob (ID: ${bobId}) created.`);

      // Attempt to create another user with the same UID (should fail)
      console.log(
        `Testing requirement violation: Attempting to create another user with duplicate UID '${testUserB_UID}'.`
      );
      const duplicateCreateResult = await userProfileConcept.createUser({
        uid: testUserB_UID, // Duplicate UID
        name: "Bobby Tables",
        email: "bobby@example.com",
        profilePicture: "bobby.jpg",
        fieldOfInterests: ["Hacking"],
      });

      assertEquals(
        "error" in duplicateCreateResult,
        true,
        "createUser should fail when ID already exists, confirming `requires` condition."
      );
      assertEquals(
        (duplicateCreateResult as unknown as { error: string }).error,
        `User with ID '${testUserB_UID}' already exists.`,
        "Error message should clearly indicate duplicate ID."
      );
      console.log(
        "  Attempt to create user with duplicate UID correctly failed, requirement satisfied."
      );

      // Verify that the original Bob's profile is unchanged (no new user was created, pass uid)
      const bobProfile = await getProfileOrThrow(
        userProfileConcept,
        testUserB_UID
      );
      assertEquals(
        bobProfile.name,
        "Bob Johnson",
        "Original user's name should remain 'Bob Johnson', confirming no new user was implicitly created."
      );
      assertEquals(
        bobProfile.email,
        "bob@example.com",
        "Original user's email should remain 'bob@example.com'."
      );
      console.log(
        "  Original user's profile verified to be unchanged, confirming `effects` for failed action."
      );
    } finally {
      await db.dropDatabase();
      await client.close();
    }
  }
);

Deno.test({
  name: "Action: updateProfileName requires user exists",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    console.log(
      "\n--- Action Test: updateProfileName requires user exists ---"
    );

    // Setup: Create a user for successful update scenario
    const createResult = await userProfileConcept.createUser({
      uid: testUserC_UID,
      name: "Charlie",
      email: "charlie@example.com",
      profilePicture: "charlie.jpg",
      fieldOfInterests: [],
    });
    const { user: charlieId } = createResult as { user: ID };
    console.log(
      `  Existing user (ID: ${charlieId}) created for positive test case.`
    );

    // Test successful update for an existing user
    console.log("Testing: Successful update of an existing user's name.");
    const newName = "Charles Brown";
    const successResult = await userProfileConcept.updateProfileName({
      user: testUserC_UID, // Use uid, not document _id
      newName: newName,
    });
    assertEquals(
      "error" in successResult,
      false,
      "Updating existing user's name should succeed, confirming `effects`."
    );
    const profileAfterSuccess = await getProfileOrThrow(
      userProfileConcept,
      testUserC_UID
    );
    assertEquals(
      profileAfterSuccess.name,
      newName,
      "User's name should be updated after successful call."
    );
    console.log(`  Name successfully updated to '${newName}' and verified.`);

    // Test failure for a non-existent user
    console.log("Testing: Attempt to update name for a non-existent user.");
    const nonExistentUserId = "user:nonexistent_d" as ID;
    const failResult = await userProfileConcept.updateProfileName({
      user: nonExistentUserId,
      newName: "Non Existent Name",
    });
    assertEquals(
      "error" in failResult,
      true,
      "Updating name for a non-existent user should fail, confirming `requires` condition."
    );
    assertEquals(
      (failResult as unknown as { error: string }).error,
      `User with ID '${nonExistentUserId}' not found.`,
      "Error message should indicate user not found."
    );
    console.log(
      "  Updating name for non-existent user correctly failed, requirement satisfied."
    );
  } finally {
    await db.dropDatabase();
    await client.close();
  }
});

Deno.test({
  name: "Action: updateProfilePicture requires user exists",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    console.log(
      "\n--- Action Test: updateProfilePicture requires user exists ---"
    );

    // Setup: Create a user for successful update scenario
    const dianaUID = "user_d_uid" as ID;
    const createResult = await userProfileConcept.createUser({
      uid: dianaUID,
      name: "Diana Prince",
      email: "diana@example.com",
      profilePicture: "diana_old.jpg",
      fieldOfInterests: [],
    });
    const { user: dianaId } = createResult as { user: ID };
    console.log(
      `  Existing user (ID: ${dianaId}) created for positive test case.`
    );

    // Test successful update for an existing user
    console.log(
      "Testing: Successful update of an existing user's profile picture."
    );
    const newPicture = "diana_new.png";
    const successResult = await userProfileConcept.updateProfilePicture({
      user: dianaUID, // Use uid, not document _id
      newProfilePicture: newPicture,
    });
    assertEquals(
      "error" in successResult,
      false,
      "Updating existing user's profile picture should succeed, confirming `effects`."
    );
    const profileAfterSuccess = await getProfileOrThrow(
      userProfileConcept,
      dianaUID
    );
    assertEquals(
      profileAfterSuccess.profilePicture,
      newPicture,
      "User's profile picture should be updated after successful call."
    );
    console.log(
      `  Profile picture successfully updated to '${newPicture}' and verified.`
    );

    // Test failure for a non-existent user
    console.log(
      "Testing: Attempt to update profile picture for a non-existent user."
    );
    const nonExistentUserId = "user:nonexistent_e" as ID;
    const failResult = await userProfileConcept.updateProfilePicture({
      user: nonExistentUserId,
      newProfilePicture: "nonexistent.png",
    });
    assertEquals(
      "error" in failResult,
      true,
      "Updating profile picture for a non-existent user should fail, confirming `requires` condition."
    );
    assertEquals(
      (failResult as unknown as { error: string }).error,
      `User with ID '${nonExistentUserId}' not found.`,
      "Error message should indicate user not found."
    );
    console.log(
      "  Updating profile picture for non-existent user correctly failed, requirement satisfied."
    );
  } finally {
    await db.dropDatabase();
    await client.close();
  }
});

Deno.test("Action: updateInterests requires user exists", async () => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    console.log("\n--- Action Test: updateInterests requires user exists ---");

    // Setup: Create a user with some initial interests for successful update scenario
    const fionaUID = "user_f_uid" as ID;
    const initialInterests = ["Books", "Movies"];
    const createResult = await userProfileConcept.createUser({
      uid: fionaUID,
      name: "Fiona Gale",
      email: "fiona@example.com",
      profilePicture: "fiona.jpg",
      fieldOfInterests: initialInterests,
    });
    const { user: fionaId } = createResult as { user: ID };
    console.log(
      `  Existing user (ID: ${fionaId}) created with initial interests: ${initialInterests.join(
        ", "
      )}.`
    );

    // Test successful update for an existing user
    console.log("Testing: Successful update of an existing user's interests.");
    const newInterests = ["Music", "Travel", "Books", "Art"]; // Includes an existing and new interests
    const successResult = await userProfileConcept.updateInterests({
      user: fionaUID, // Use uid, not document _id
      newFieldsOfInterests: newInterests,
    });
    assertEquals(
      "error" in successResult,
      false,
      "Updating existing user's interests should succeed, confirming `effects`."
    );
    const profileAfterSuccess = await getProfileOrThrow(
      userProfileConcept,
      fionaUID
    );
    assertEquals(
      profileAfterSuccess.fieldOfInterests.sort(),
      newInterests.sort(),
      "User's interests should be updated after successful call."
    );
    console.log(
      `  Interests successfully updated to: ${newInterests.join(
        ", "
      )} and verified.`
    );

    // Test failure for a non-existent user
    console.log(
      "Testing: Attempt to update interests for a non-existent user."
    );
    const nonExistentUserId = "user:nonexistent_g" as ID;
    const failResult = await userProfileConcept.updateInterests({
      user: nonExistentUserId,
      newFieldsOfInterests: ["Fake Interest"],
    });
    assertEquals(
      "error" in failResult,
      true,
      "Updating interests for a non-existent user should fail, confirming `requires` condition."
    );
    assertEquals(
      (failResult as unknown as { error: string }).error,
      `User with ID '${nonExistentUserId}' not found.`,
      "Error message should indicate user not found."
    );
    console.log(
      "  Updating interests for non-existent user correctly failed, requirement satisfied."
    );
  } finally {
    await db.dropDatabase();
    await client.close();
  }
});

Deno.test({
  name: "Query: _getProfile requires user exists",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    console.log("\n--- Query Test: _getProfile requires user exists ---");

    // Setup: Create a user for successful retrieval scenario
    const georgeUID = "user_g_uid" as ID;
    const createResult = await userProfileConcept.createUser({
      uid: georgeUID,
      name: "George",
      email: "george@example.com",
      profilePicture: "george.jpg",
      fieldOfInterests: ["Science"],
    });
    const { user: georgeId } = createResult as { user: ID };
    console.log(
      `  Existing user (ID: ${georgeId}) created for positive test case.`
    );

    // Test successful retrieval for an existing user
    console.log("Testing: Successful retrieval of an existing user's profile.");
    const successResult = await userProfileConcept._getProfile({
      user: georgeUID, // Use uid, not document _id
    });
    assertNotEquals(
      "error" in successResult,
      true,
      "Retrieving existing user's profile should succeed."
    );
    assertExists(
      (successResult as [{ profile: any }])[0].profile,
      "Profile data should be returned for an existing user."
    );
    assertEquals(
      (successResult as [{ profile: any }])[0].profile.fieldOfInterests.sort(),
      ["Science"].sort(),
      "Retrieved profile interests should match the created user."
    );
    console.log(
      "  Existing user's profile successfully retrieved and verified, `effects` confirmed."
    );

    // Test failure for a non-existent user
    console.log(
      "Testing: Attempt to retrieve profile for a non-existent user."
    );
    const nonExistentUserId = "user:nonexistent_h" as ID;
    const failResult = await userProfileConcept._getProfile({
      user: nonExistentUserId,
    });
    assertEquals(
      "error" in failResult[0],
      true,
      "Retrieving profile for a non-existent user should fail, confirming `requires` condition."
    );
    assertEquals(
      (failResult[0] as { error: string }).error,
      `User with ID '${nonExistentUserId}' not found.`,
      "Error message should indicate user not found."
    );
    console.log(
      "  Retrieving profile for non-existent user correctly failed, requirement satisfied."
    );
  } finally {
    await db.dropDatabase();
    await client.close();
  }
});
