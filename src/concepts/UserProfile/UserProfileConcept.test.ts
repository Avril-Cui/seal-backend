import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Assuming this utility is available
import { ID } from "@utils/types.ts"; // Assuming this type is available
import UserProfileConcept from "./UserProfileConcept.ts"; // The concept to be tested

// Helper type for profile object
type Profile = {
  user: ID;
  name: string;
  profilePicture: string;
  fieldsOfInterests: string[];
};

const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;
const nonExistentUser = "user:NonExistent" as ID;

Deno.test("Principle: User creates and updates their profile", async () => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    console.log("Trace: Demonstrating the UserProfile concept principle.");

    // 1. User A creates their profile
    console.log(
      "Step 1: User A attempts to create a profile with initial information.",
    );
    const createProfileResult = await userProfileConcept.createProfile({
      user: userA,
      name: "Alice Smith",
      profilePicture: "alice.jpg",
      fieldsOfInterests: ["coding", "reading"],
    });
    assertNotEquals(
      "error" in createProfileResult,
      true,
      "Profile creation for User A should succeed.",
    );
    const { profile: initialProfile } = createProfileResult as { profile: Profile };
    assertExists(initialProfile);
    assertEquals(initialProfile.user, userA);
    assertEquals(initialProfile.name, "Alice Smith");
    console.log(`Output: Profile created for ${userA}.`);

    // 2. User A views their profile
    console.log("Step 2: User A attempts to view their newly created profile.");
    const getProfileResult1 = await userProfileConcept.getProfile({
      user: userA,
    });
    assertNotEquals(
      "error" in getProfileResult1,
      true,
      "Fetching profile for User A should succeed.",
    );
    const { profile: retrievedProfile1 } = getProfileResult1 as { profile: Profile };
    assertEquals(
      retrievedProfile1.name,
      "Alice Smith",
      "Retrieved name should match the initial name.",
    );
    assertEquals(
      retrievedProfile1.profilePicture,
      "alice.jpg",
      "Retrieved picture should match the initial picture.",
    );
    assertEquals(
      retrievedProfile1.fieldsOfInterests,
      ["coding", "reading"],
      "Retrieved interests should match the initial interests.",
    );
    console.log(
      `Output: Profile for ${userA} viewed, matching initial data.`,
    );

    // 3. User A updates their name
    console.log("Step 3: User A attempts to update their name.");
    const updateNameResult = await userProfileConcept.updateName({
      user: userA,
      newName: "Alicia Smith",
    });
    assertNotEquals(
      "error" in updateNameResult,
      true,
      "Name update for User A should succeed.",
    );
    console.log(`Output: Name updated for ${userA} to 'Alicia Smith'.`);

    // 4. User A views their profile to confirm name update
    console.log(
      "Step 4: User A views profile again to confirm name change.",
    );
    const getProfileResult2 = await userProfileConcept.getProfile({
      user: userA,
    });
    assertNotEquals(
      "error" in getProfileResult2,
      true,
      "Fetching profile after name update should succeed.",
    );
    const { profile: retrievedProfile2 } = getProfileResult2 as { profile: Profile };
    assertEquals(
      retrievedProfile2.name,
      "Alicia Smith",
      "Retrieved name should be updated to 'Alicia Smith'.",
    );
    assertEquals(
      retrievedProfile2.profilePicture,
      "alice.jpg",
      "Picture should remain unchanged.",
    );
    console.log(
      `Output: Confirmed name update for ${userA}. Name is now 'Alicia Smith'.`,
    );

    // 5. User A updates their picture
    console.log("Step 5: User A attempts to update their profile picture.");
    const updatePictureResult = await userProfileConcept.updatePicture({
      user: userA,
      newProfilePicture: "alicia_new.png",
    });
    assertNotEquals(
      "error" in updatePictureResult,
      true,
      "Picture update for User A should succeed.",
    );
    console.log(
      `Output: Profile picture updated for ${userA} to 'alicia_new.png'.`,
    );

    // 6. User A views their profile to confirm picture update
    console.log(
      "Step 6: User A views profile again to confirm picture change.",
    );
    const getProfileResult3 = await userProfileConcept.getProfile({
      user: userA,
    });
    assertNotEquals(
      "error" in getProfileResult3,
      true,
      "Fetching profile after picture update should succeed.",
    );
    const { profile: retrievedProfile3 } = getProfileResult3 as { profile: Profile };
    assertEquals(
      retrievedProfile3.name,
      "Alicia Smith",
      "Name should remain unchanged.",
    );
    assertEquals(
      retrievedProfile3.profilePicture,
      "alicia_new.png",
      "Retrieved picture should be updated to 'alicia_new.png'.",
    );
    console.log(
      `Output: Confirmed picture update for ${userA}. Picture is now 'alicia_new.png'.`,
    );

    // 7. User A updates their interests
    console.log("Step 7: User A attempts to update their fields of interests.");
    const updateInterestsResult = await userProfileConcept.updateInterests({
      user: userA,
      newFieldsOfInterests: ["photography", "hiking"],
    });
    assertNotEquals(
      "error" in updateInterestsResult,
      true,
      "Interests update for User A should succeed.",
    );
    console.log(
      `Output: Interests updated for ${userA} to ['photography', 'hiking'].`,
    );

    // 8. User A views their profile to confirm interests update
    console.log(
      "Step 8: User A views profile again to confirm interests change.",
    );
    const getProfileResult4 = await userProfileConcept.getProfile({
      user: userA,
    });
    assertNotEquals(
      "error" in getProfileResult4,
      true,
      "Fetching profile after interests update should succeed.",
    );
    const { profile: retrievedProfile4 } = getProfileResult4 as { profile: Profile };
    assertEquals(
      retrievedProfile4.name,
      "Alicia Smith",
      "Name should remain unchanged.",
    );
    assertEquals(
      retrievedProfile4.profilePicture,
      "alicia_new.png",
      "Picture should remain unchanged.",
    );
    assertEquals(
      retrievedProfile4.fieldsOfInterests,
      ["photography", "hiking"],
      "Retrieved interests should be updated to ['photography', 'hiking'].",
    );
    console.log(
      `Output: Confirmed interests update for ${userA}. Interests are now ['photography', 'hiking'].`,
    );

    console.log(
      "Trace complete: User A successfully created, viewed, and updated their profile information.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: createProfile requires no profile exists for user", async () => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    // Confirming initial effect: create a profile successfully
    console.log(
      "Requirement setup: Create a profile for User B to test subsequent failure.",
    );
    const initialCreateResult = await userProfileConcept.createProfile({
      user: userB,
      name: "Bob Johnson",
      profilePicture: "bob.png",
      fieldsOfInterests: ["gaming"],
    });
    assertNotEquals(
      "error" in initialCreateResult,
      true,
      "Initial profile creation for User B should succeed.",
    );
    console.log(`Output: Profile successfully created for ${userB}.`);

    // Requirement test: Attempt to create a profile for an existing user
    console.log(
      "Testing requirement: Attempt to create a profile for User B again.",
    );
    const duplicateCreateResult = await userProfileConcept.createProfile({
      user: userB,
      name: "Bob Johnson Duplicate",
      profilePicture: "bob_duplicate.png",
      fieldsOfInterests: ["coding"],
    });
    assertEquals(
      "error" in duplicateCreateResult,
      true,
      "Creating a profile for an existing user should return an error.",
    );
    assertEquals(
      (duplicateCreateResult as { error: string }).error,
      "Profile already exists for this user.",
      "Error message should indicate profile already exists.",
    );
    console.log(
      `Output: Attempt to create duplicate profile for ${userB} failed as expected.`,
    );

    // Confirming effect (no change to existing profile)
    console.log(
      "Effect confirmation: Verify the existing profile was not overwritten.",
    );
    const getProfileResult = await userProfileConcept.getProfile({
      user: userB,
    });
    assertNotEquals(
      "error" in getProfileResult,
      true,
      "Fetching profile for User B should still succeed.",
    );
    const { profile } = getProfileResult as { profile: Profile };
    assertEquals(
      profile.name,
      "Bob Johnson",
      "Name should remain 'Bob Johnson', not the duplicate attempt.",
    );
    assertEquals(
      profile.fieldsOfInterests,
      ["gaming"],
      "Interests should remain ['gaming'], not the duplicate attempt.",
    );
    console.log(
      "Output: Existing profile for User B remains unchanged, confirming no overwrite.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: updateName requires profile exists for user and effects are correct", async () => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    // Requirement test: Update name for a non-existent user
    console.log(
      "Testing requirement: Attempt to update name for a non-existent user.",
    );
    const nonExistentUpdateResult = await userProfileConcept.updateName({
      user: nonExistentUser,
      newName: "Ghost User",
    });
    assertEquals(
      "error" in nonExistentUpdateResult,
      true,
      "Updating name for a non-existent user should fail.",
    );
    assertEquals(
      (nonExistentUpdateResult as { error: string }).error,
      "Profile does not exist for this user.",
      "Error message should indicate profile does not exist.",
    );
    console.log(
      `Output: Attempt to update name for ${nonExistentUser} failed as expected.`,
    );

    // Effect test: Update name for an existing user and verify
    console.log(
      "Requirement setup: Create a profile for User A to test a successful update.",
    );
    await userProfileConcept.createProfile({
      user: userA,
      name: "Alice Original",
      profilePicture: "alice.png",
      fieldsOfInterests: ["art"],
    });
    console.log(`Output: Profile created for ${userA}.`);

    console.log("Testing effect: Update name for User A.");
    const successfulUpdateResult = await userProfileConcept.updateName({
      user: userA,
      newName: "Alice Updated",
    });
    assertNotEquals(
      "error" in successfulUpdateResult,
      true,
      "Updating name for an existing user should succeed.",
    );
    console.log(`Output: Name for ${userA} updated successfully.`);

    // Effect confirmation: Verify the name change
    console.log("Effect confirmation: Retrieve profile to verify name change.");
    const getProfileResult = await userProfileConcept.getProfile({
      user: userA,
    });
    assertNotEquals(
      "error" in getProfileResult,
      true,
      "Fetching profile after update should succeed.",
    );
    const { profile } = getProfileResult as { profile: Profile };
    assertEquals(
      profile.name,
      "Alice Updated",
      "Profile name should be updated to 'Alice Updated'.",
    );
    assertEquals(
      profile.profilePicture,
      "alice.png",
      "Profile picture should remain unchanged.",
    );
    assertEquals(
      profile.fieldsOfInterests,
      ["art"],
      "Fields of interests should remain unchanged.",
    );
    console.log(
      `Output: Name for ${userA} confirmed as 'Alice Updated', other fields unchanged.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: updatePicture requires profile exists for user and effects are correct", async () => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    // Requirement test: Update picture for a non-existent user
    console.log(
      "Testing requirement: Attempt to update picture for a non-existent user.",
    );
    const nonExistentUpdateResult = await userProfileConcept.updatePicture({
      user: nonExistentUser,
      newProfilePicture: "ghost.png",
    });
    assertEquals(
      "error" in nonExistentUpdateResult,
      true,
      "Updating picture for a non-existent user should fail.",
    );
    assertEquals(
      (nonExistentUpdateResult as { error: string }).error,
      "Profile does not exist for this user.",
      "Error message should indicate profile does not exist.",
    );
    console.log(
      `Output: Attempt to update picture for ${nonExistentUser} failed as expected.`,
    );

    // Effect test: Update picture for an existing user and verify
    console.log(
      "Requirement setup: Create a profile for User A to test a successful update.",
    );
    await userProfileConcept.createProfile({
      user: userA,
      name: "Alice Still",
      profilePicture: "alice_old.png",
      fieldsOfInterests: ["music"],
    });
    console.log(`Output: Profile created for ${userA}.`);

    console.log("Testing effect: Update picture for User A.");
    const successfulUpdateResult = await userProfileConcept.updatePicture({
      user: userA,
      newProfilePicture: "alice_new_pic.png",
    });
    assertNotEquals(
      "error" in successfulUpdateResult,
      true,
      "Updating picture for an existing user should succeed.",
    );
    console.log(`Output: Picture for ${userA} updated successfully.`);

    // Effect confirmation: Verify the picture change
    console.log(
      "Effect confirmation: Retrieve profile to verify picture change.",
    );
    const getProfileResult = await userProfileConcept.getProfile({
      user: userA,
    });
    assertNotEquals(
      "error" in getProfileResult,
      true,
      "Fetching profile after update should succeed.",
    );
    const { profile } = getProfileResult as { profile: Profile };
    assertEquals(
      profile.name,
      "Alice Still",
      "Profile name should remain unchanged.",
    );
    assertEquals(
      profile.profilePicture,
      "alice_new_pic.png",
      "Profile picture should be updated to 'alice_new_pic.png'.",
    );
    assertEquals(
      profile.fieldsOfInterests,
      ["music"],
      "Fields of interests should remain unchanged.",
    );
    console.log(
      `Output: Picture for ${userA} confirmed as 'alice_new_pic.png', other fields unchanged.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: updateInterests requires profile exists for user and effects are correct", async () => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    // Requirement test: Update interests for a non-existent user
    console.log(
      "Testing requirement: Attempt to update interests for a non-existent user.",
    );
    const nonExistentUpdateResult = await userProfileConcept.updateInterests({
      user: nonExistentUser,
      newFieldsOfInterests: ["nothing"],
    });
    assertEquals(
      "error" in nonExistentUpdateResult,
      true,
      "Updating interests for a non-existent user should fail.",
    );
    assertEquals(
      (nonExistentUpdateResult as { error: string }).error,
      "Profile does not exist for this user.",
      "Error message should indicate profile does not exist.",
    );
    console.log(
      `Output: Attempt to update interests for ${nonExistentUser} failed as expected.`,
    );

    // Effect test: Update interests for an existing user and verify
    console.log(
      "Requirement setup: Create a profile for User A to test a successful update.",
    );
    await userProfileConcept.createProfile({
      user: userA,
      name: "Alice Loves",
      profilePicture: "alice_loves.png",
      fieldsOfInterests: ["old_interests"],
    });
    console.log(`Output: Profile created for ${userA}.`);

    console.log("Testing effect: Update interests for User A.");
    const successfulUpdateResult = await userProfileConcept.updateInterests({
      user: userA,
      newFieldsOfInterests: ["new_interests", "more_interests"],
    });
    assertNotEquals(
      "error" in successfulUpdateResult,
      true,
      "Updating interests for an existing user should succeed.",
    );
    console.log(`Output: Interests for ${userA} updated successfully.`);

    // Effect confirmation: Verify the interests change
    console.log(
      "Effect confirmation: Retrieve profile to verify interests change.",
    );
    const getProfileResult = await userProfileConcept.getProfile({
      user: userA,
    });
    assertNotEquals(
      "error" in getProfileResult,
      true,
      "Fetching profile after update should succeed.",
    );
    const { profile } = getProfileResult as { profile: Profile };
    assertEquals(
      profile.name,
      "Alice Loves",
      "Profile name should remain unchanged.",
    );
    assertEquals(
      profile.profilePicture,
      "alice_loves.png",
      "Profile picture should remain unchanged.",
    );
    assertEquals(
      profile.fieldsOfInterests,
      ["new_interests", "more_interests"],
      "Fields of interests should be updated.",
    );
    console.log(
      `Output: Interests for ${userA} confirmed as ['new_interests', 'more_interests'], other fields unchanged.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: getProfile requires profile exists for user and returns correct data", async () => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    // Requirement test: Get profile for a non-existent user
    console.log(
      "Testing requirement: Attempt to get profile for a non-existent user.",
    );
    const nonExistentGetResult = await userProfileConcept.getProfile({
      user: nonExistentUser,
    });
    assertEquals(
      "error" in nonExistentGetResult,
      true,
      "Getting profile for a non-existent user should fail.",
    );
    assertEquals(
      (nonExistentGetResult as { error: string }).error,
      "Profile does not exist for this user.",
      "Error message should indicate profile does not exist.",
    );
    console.log(
      `Output: Attempt to get profile for ${nonExistentUser} failed as expected.`,
    );

    // Effect test: Get profile for an existing user and verify data
    console.log(
      "Requirement setup: Create a profile for User A to test successful retrieval.",
    );
    const initialProfileData = {
      user: userA,
      name: "Alice Get",
      profilePicture: "alice_get.png",
      fieldsOfInterests: ["hiking", "travel"],
    };
    await userProfileConcept.createProfile(initialProfileData);
    console.log(`Output: Profile created for ${userA}.`);

    console.log("Testing effect: Get profile for User A.");
    const successfulGetResult = await userProfileConcept.getProfile({
      user: userA,
    });
    assertNotEquals(
      "error" in successfulGetResult,
      true,
      "Getting profile for an existing user should succeed.",
    );
    console.log(`Output: Profile for ${userA} retrieved successfully.`);

    // Effect confirmation: Verify the returned data matches the creation data
    const { profile } = successfulGetResult as { profile: Profile };
    assertEquals(
      profile.user,
      initialProfileData.user,
      "Retrieved user ID should match.",
    );
    assertEquals(
      profile.name,
      initialProfileData.name,
      "Retrieved name should match the created name.",
    );
    assertEquals(
      profile.profilePicture,
      initialProfileData.profilePicture,
      "Retrieved picture should match the created picture.",
    );
    assertEquals(
      profile.fieldsOfInterests,
      initialProfileData.fieldsOfInterests,
      "Retrieved interests should match the created interests.",
    );
    console.log(
      `Output: Retrieved profile for ${userA} fully matches the initial creation data.`,
    );
  } finally {
    await client.close();
  }
});