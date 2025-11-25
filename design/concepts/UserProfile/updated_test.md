[@testing-concepts](../../background/testing-concepts.md)


[@LikertSurvey-concept-tests](/src/concepts/LikertSurvey/LikertSurveyConcept.test.ts)


# prompt: Observe how tests were structured for the sample LikertSurvey concept here ([@testing](design/concepts/LikertSurvey/testing.md) and [@LikertSurveyConcept.test](/src/concepts/LikertSurvey/LikertSurveyConcept.test.ts)) and create a test suite for test-first programming that works with the Deno testing framework and covers a full trace that demonstrates how the principle of the concept is fulfilled by a sequence of actions. Ensure that no tests use or depend on ANY other concepts besides <concept name> itself. Do not test any behavior that requires cross-concept interaction. Minimize imports to what is needed. When performing await testDb() (do NOT use getDb()); declare the results as const variables db and client on the first line of the test case, and set const <concept instance name> = new <concept class name>(db);. Refer to previously written test cases for a similar concept as a very rough guideline.


# concept: UserProfile
This is how I implemented my UserProfile concept:
```
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, using the concept name
const PREFIX = "UserProfile" + ".";

// Define the User entity structure based on the new state
/**
 * a set of Users with
 *   a uid String  // this is an unique id
 *   a name String
 *   an email String
 *   a password String
 *   a profilePicture String
 *   a reward Number
 *   a fieldOfInterests set of FieldsOfInterests (stored as IDs)
 */
interface UserDocument {
  _id: ID; // The MongoDB document ID for the User entity
  uid: string; // The user's unique identifier (as specified in the concept)
  name: string;
  email: string;
  password: string; // Note: In a real application, passwords should be hashed and never stored in plain text.
  profilePicture: string;
  reward: number;
  fieldOfInterests: ID[]; // Stores IDs of FieldsOfInterestsDocument
}

// Define the FieldsOfInterests entity structure
/**
 * a set of FieldsOfInterests
 *   a field String
 */
interface FieldsOfInterestsDocument {
  _id: ID;
  field: string; // The actual string name of the interest
}

/**
 * concept: UserProfile
 *
 * purpose:
 *     Manages user profiles that are registered under BuyBye.
 *
 * principle:
 *     (1) Users customize their profile when they are signing up for BuyBye.
 *     (2) Users can edit their own profile information.
 */
export default class UserProfileConcept {
  users: Collection<UserDocument>;
  fieldsOfInterests: Collection<FieldsOfInterestsDocument>;

  constructor(private readonly db: Db) {
    // Initialize the MongoDB collections for users and their interests
    this.users = this.db.collection(PREFIX + "users");
    this.fieldsOfInterests = this.db.collection(PREFIX + "fieldsOfInterests");
  }

  /**
   * Helper method to ensure that FieldsOfInterests entities exist for a given
   * list of interest names (strings). If an interest name doesn't have a
   * corresponding entity, a new one is created. Returns the IDs of all
   * resolved or created interest entities.
   */
  private async ensureFieldsOfInterestsExist(
    interestNames: string[],
  ): Promise<ID[]> {
    const interestIDs: ID[] = [];
    for (const name of interestNames) {
      // Find an existing FieldsOfInterestsDocument by its 'field' name
      let fieldDoc = await this.fieldsOfInterests.findOne({ field: name });
      if (!fieldDoc) {
        // If no document exists, create a new one
        fieldDoc = { _id: freshID(), field: name };
        await this.fieldsOfInterests.insertOne(fieldDoc);
      }
      interestIDs.push(fieldDoc._id);
    }
    return interestIDs;
  }

  /**
   * createUser (uid: String, name: String, email: String, password: String,
   *             profilePicture: String, fieldOfInterests: set of FieldsOfInterests): (user: User)
   *
   * **requires**
   *     no user exists with matching uid;
   *
   * **effects**
   *     create a new user with (uid, name, email, password, profilePicture, reward = 0, fieldOfInterests);
   *     return user;
   */
  async createUser(
    { uid, name, email, password, profilePicture, fieldOfInterests }: {
      uid: string;
      name: string;
      email: string;
      password: string;
      profilePicture: string;
      fieldOfInterests: string[]; // Expecting an array of interest NAMES (strings)
    },
  ): Promise<{ user: ID } | { error: string }> {
    // Check 'requires' condition: ensure no user with the given uid already exists
    const existingUser = await this.users.findOne({ uid: uid });
    if (existingUser) {
      return { error: `User with UID '${uid}' already exists.` };
    }

    // Resolve or create FieldsOfInterests entities and get their IDs
    const interestIDs = await this.ensureFieldsOfInterestsExist(
      fieldOfInterests,
    );

    // 'effects': Create and insert a new UserDocument
    const newUser: UserDocument = {
      _id: freshID(), // Generate a unique ID for the user document
      uid: uid,
      name: name,
      email: email,
      password: password,
      profilePicture: profilePicture,
      reward: 0, // Default value as per specification
      fieldOfInterests: interestIDs,
    };
    await this.users.insertOne(newUser);

    return { user: newUser._id }; // Return the ID of the newly created User entity
  }

  /**
   * updateProfileName (user: User, newName: String): Empty | {error: String}
   *
   * **requires**
   *     user exists;
   *
   * **effects**
   *     update the name attribute of this user
   */
  async updateProfileName(
    { user, newName }: { user: ID; newName: string },
  ): Promise<Empty | { error: string }> {
    // Check 'requires' condition implicitly by checking if update was successful
    const result = await this.users.updateOne(
      { _id: user },
      { $set: { name: newName } },
    );

    if (result.matchedCount === 0) {
      return { error: `User with ID '${user}' not found.` };
    }
    return {};
  }

  /**
   * updateProfilePicture (user: User, newProfilePicture: String): Empty | {error: String}
   *
   * **requires**
   *     user exists;
   *
   * **effects**
   *     update the profilePicture attribute of this user
   */
  async updateProfilePicture(
    { user, newProfilePicture }: { user: ID; newProfilePicture: string },
  ): Promise<Empty | { error: string }> {
    // Check 'requires' condition implicitly
    const result = await this.users.updateOne(
      { _id: user },
      { $set: { profilePicture: newProfilePicture } },
    );

    if (result.matchedCount === 0) {
      return { error: `User with ID '${user}' not found.` };
    }
    return {};
  }

  /**
   * updatePassword (user: User, newPassword: String): Empty | {error: String}
   *
   * **requires**
   *     user exists;
   *
   * **effects**
   *     update the password attribute of this user
   */
  async updatePassword(
    { user, newPassword }: { user: ID; newPassword: string },
  ): Promise<Empty | { error: string }> {
    // Check 'requires' condition implicitly
    const result = await this.users.updateOne(
      { _id: user },
      { $set: { password: newPassword } }, // Reminder: Hash passwords in a real application!
    );

    if (result.matchedCount === 0) {
      return { error: `User with ID '${user}' not found.` };
    }
    return {};
  }

  /**
   * updateInterests (user: User, newFieldsOfInterests: set of FieldsOfInterests): Empty | {error: String}
   *
   * **requires**
   *     user exists;
   *
   * **effects**
   *     update this user's set of FieldsOfInterests to newFieldsOfInterests;
   */
  async updateInterests(
    { user, newFieldsOfInterests }: {
      user: ID;
      newFieldsOfInterests: string[];
    }, // Expecting array of interest NAMES
  ): Promise<Empty | { error: string }> {
    // Check 'requires' condition: ensure user exists
    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) {
      return { error: `User with ID '${user}' not found.` };
    }

    // Resolve or create FieldsOfInterests entities and get their IDs
    const interestIDs = await this.ensureFieldsOfInterestsExist(
      newFieldsOfInterests,
    );

    // 'effects': Update the 'fieldOfInterests' array for the specified user
    await this.users.updateOne(
      { _id: user },
      { $set: { fieldOfInterests: interestIDs } },
    );
    return {};
  }

  /**
   * _getProfile (user: User): (profile: {uid: String, name: String, email: String,
   *             profilePicture: String, reward: Number, fieldOfInterests: set of String})[] | {error: String}
   *
   * **requires**
   *     user exists;
   *
   * **effects**
   *     returns the profile information for the user, with interest names resolved.
   */
  async _getProfile(
    { user }: { user: ID },
  ): Promise<
    {
      profile: {
        uid: string;
        name: string;
        email: string;
        profilePicture: string;
        reward: number;
        fieldOfInterests: string[]; // Returns actual interest names for display
      };
    }[] | { error: string }
  > {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return { error: `User with ID '${user}' not found.` };
    }

    // Fetch the actual names for the fieldOfInterests IDs
    const interestDocs = await this.fieldsOfInterests.find({
      _id: { $in: userDoc.fieldOfInterests },
    }).toArray();
    const interestNames = interestDocs.map((doc) => doc.field);

    // Return an array of dictionaries, as per query specification guidelines
    return [{
      profile: {
        uid: userDoc.uid,
        name: userDoc.name,
        email: userDoc.email,
        profilePicture: userDoc.profilePicture,
        reward: userDoc.reward,
        fieldOfInterests: interestNames,
      },
    }];
  }
}

```
# response:

```typescript
// file: src/concepts/UserProfile/UserProfileConcept.test.ts

import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UserProfileConcept from "./UserProfileConcept.ts";

// Define some constant UIDs for testing
const testUserA_UID = "userA_uid_alice";
const testUserB_UID = "userB_uid_bob";
const testUserC_UID = "userC_uid_charlie";

/**
 * Helper function to retrieve a user profile and assert that it doesn't return an error.
 * @param concept The UserProfileConcept instance.
 * @param userId The ID of the user to retrieve.
 * @returns The profile object.
 */
async function getProfileOrThrow(
  concept: UserProfileConcept,
  userId: ID,
): Promise<{
  uid: string;
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
    }`,
  );
  // As per query specification, _getProfile returns an array of objects.
  return (result as [{ profile: any }])[0].profile;
}

Deno.test("Principle: User customizes profile on signup, then edits it", async () => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    console.log(
      "\n--- Principle Test: User customizes profile on signup, then edits it ---",
    );
    console.log(
      "Demonstrating the principle: (1) Users customize their profile when signing up, (2) Users can edit their own profile information.",
    );

    // # trace: (1) User signs up and customizes their profile
    console.log("\nTrace Step 1: User Alice signs up for BuyBye with initial profile details.");
    const initialInterests = ["Technology", "Gaming"];
    const createUserResult = await userProfileConcept.createUser({
      uid: testUserA_UID,
      name: "Alice Smith",
      email: "alice@example.com",
      password: "securepassword123",
      profilePicture: "alice.jpg",
      fieldOfInterests: initialInterests,
    });

    assertNotEquals(
      "error" in createUserResult,
      true,
      "createUser should succeed for a new user.",
    );
    const { user: aliceId } = createUserResult as { user: ID };
    assertExists(aliceId, "A user ID should be returned upon successful creation.");
    console.log(`  User Alice (ID: ${aliceId}) created with UID: '${testUserA_UID}'.`);

    // Verify initial profile state using _getProfile
    const aliceProfile = await getProfileOrThrow(userProfileConcept, aliceId);

    assertEquals(
      aliceProfile.uid,
      testUserA_UID,
      "Alice's UID in profile should match initial input.",
    );
    assertEquals(
      aliceProfile.name,
      "Alice Smith",
      "Alice's name in profile should match initial input.",
    );
    assertEquals(
      aliceProfile.email,
      "alice@example.com",
      "Alice's email in profile should match initial input.",
    );
    assertEquals(
      aliceProfile.profilePicture,
      "alice.jpg",
      "Alice's profile picture in profile should match initial input.",
    );
    assertEquals(
      aliceProfile.reward,
      0,
      "Alice's initial reward in profile should be 0.",
    );
    assertEquals(
      aliceProfile.fieldOfInterests.sort(), // Sort for consistent comparison
      initialInterests.sort(),
      "Alice's initial interests in profile should match input.",
    );
    console.log("  Initial profile for Alice verified via _getProfile: `createUser` effects confirmed.");

    // # trace: (2) User Alice edits their profile information (name, picture, password, interests)
    console.log("\nTrace Step 2: User Alice updates her profile name.");
    const newName = "Alicia Smith-Jones";
    const updateNameResult = await userProfileConcept.updateProfileName({
      user: aliceId,
      newName: newName,
    });
    assertEquals(
      "error" in updateNameResult,
      false,
      "updateProfileName should succeed for an existing user.",
    );
    console.log(`  Alice's name successfully updated to '${newName}'.`);

    // Verify name update
    const aliceProfileAfterNameUpdate = await getProfileOrThrow(
      userProfileConcept,
      aliceId,
    );
    assertEquals(
      aliceProfileAfterNameUpdate.name,
      newName,
      "Alice's name should be updated in her profile.",
    );
    console.log("  Name update verified via _getProfile: `updateProfileName` effects confirmed.");

    console.log("\nTrace Step 3: User Alice updates her profile picture.");
    const newPicture = "alicia_new_avatar.png";
    const updatePictureResult = await userProfileConcept.updateProfilePicture({
      user: aliceId,
      newProfilePicture: newPicture,
    });
    assertEquals(
      "error" in updatePictureResult,
      false,
      "updateProfilePicture should succeed for an existing user.",
    );
    console.log(`  Alice's profile picture successfully updated to '${newPicture}'.`);

    // Verify picture update
    const aliceProfileAfterPictureUpdate = await getProfileOrThrow(
      userProfileConcept,
      aliceId,
    );
    assertEquals(
      aliceProfileAfterPictureUpdate.profilePicture,
      newPicture,
      "Alice's profile picture should be updated in her profile.",
    );
    console.log("  Profile picture update verified via _getProfile: `updateProfilePicture` effects confirmed.");

    console.log("\nTrace Step 4: User Alice updates her password.");
    const newPassword = "superstrongpassword789";
    const updatePasswordResult = await userProfileConcept.updatePassword({
      user: aliceId,
      newPassword: newPassword,
    });
    assertEquals(
      "error" in updatePasswordResult,
      false,
      "updatePassword should succeed for an existing user.",
    );
    // Password is not returned by _getProfile due to security, so we confirm action success.
    console.log(
      "  Alice's password successfully updated (effect confirmed by action returning no error).",
    );

    console.log("\nTrace Step 5: User Alice updates her fields of interest.");
    const updatedInterests = ["Coding", "Fitness", "Gaming", "Reading"];
    const updateInterestsResult = await userProfileConcept.updateInterests({
      user: aliceId,
      newFieldsOfInterests: updatedInterests,
    });
    assertEquals(
      "error" in updateInterestsResult,
      false,
      "updateInterests should succeed for an existing user.",
    );
    console.log(`  Alice's interests successfully updated to: ${updatedInterests.join(", ")}.`);

    // Verify interests update
    const aliceProfileAfterInterestsUpdate = await getProfileOrThrow(
      userProfileConcept,
      aliceId,
    );
    assertEquals(
      aliceProfileAfterInterestsUpdate.fieldOfInterests.sort(),
      updatedInterests.sort(),
      "Alice's interests should be updated in her profile.",
    );
    console.log("  Interests update verified via _getProfile: `updateInterests` effects confirmed.");

    console.log(
      "\nPrinciple Fulfilled: The series of actions demonstrate that a user can successfully customize their profile on signup and then modify various aspects of their profile, aligning with the UserProfile concept's principle.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: createUser requires no existing user with matching UID", async () => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    console.log(
      "\n--- Action Test: createUser requires no existing user with matching UID ---",
    );

    // Initial creation of user Bob (should succeed)
    console.log(`Testing requirement satisfaction: Initial creation of user '${testUserB_UID}'.`);
    const initialCreateResult = await userProfileConcept.createUser({
      uid: testUserB_UID,
      name: "Bob Johnson",
      email: "bob@example.com",
      password: "pass",
      profilePicture: "bob.jpg",
      fieldOfInterests: ["Sports"],
    });
    assertNotEquals(
      "error" in initialCreateResult,
      true,
      `Initial createUser for '${testUserB_UID}' should succeed.`,
    );
    const { user: bobId } = initialCreateResult as { user: ID };
    console.log(`  User Bob (ID: ${bobId}) created.`);

    // Attempt to create another user with the same UID (should fail)
    console.log(
      `Testing requirement violation: Attempting to create another user with duplicate UID '${testUserB_UID}'.`,
    );
    const duplicateCreateResult = await userProfileConcept.createUser({
      uid: testUserB_UID, // Duplicate UID
      name: "Bobby Tables",
      email: "bobby@example.com",
      password: "pass",
      profilePicture: "bobby.jpg",
      fieldOfInterests: ["Hacking"],
    });

    assertEquals(
      "error" in duplicateCreateResult,
      true,
      "createUser should fail when UID already exists, confirming `requires` condition.",
    );
    assertEquals(
      (duplicateCreateResult as { error: string }).error,
      `User with UID '${testUserB_UID}' already exists.`,
      "Error message should clearly indicate duplicate UID.",
    );
    console.log("  Attempt to create user with duplicate UID correctly failed, requirement satisfied.");

    // Verify that the original Bob's profile is unchanged (no new user was created)
    const bobProfile = await getProfileOrThrow(userProfileConcept, bobId);
    assertEquals(
      bobProfile.name,
      "Bob Johnson",
      "Original user's name should remain 'Bob Johnson', confirming no new user was implicitly created.",
    );
    assertEquals(
      bobProfile.email,
      "bob@example.com",
      "Original user's email should remain 'bob@example.com'.",
    );
    console.log("  Original user's profile verified to be unchanged, confirming `effects` for failed action.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: updateProfileName requires user exists", async () => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    console.log("\n--- Action Test: updateProfileName requires user exists ---");

    // Setup: Create a user for successful update scenario
    const createResult = await userProfileConcept.createUser({
      uid: testUserC_UID,
      name: "Charlie",
      email: "charlie@example.com",
      password: "pass",
      profilePicture: "charlie.jpg",
      fieldOfInterests: [],
    });
    const { user: charlieId } = createResult as { user: ID };
    console.log(`  Existing user (ID: ${charlieId}) created for positive test case.`);

    // Test successful update for an existing user
    console.log("Testing: Successful update of an existing user's name.");
    const newName = "Charles Brown";
    const successResult = await userProfileConcept.updateProfileName({
      user: charlieId,
      newName: newName,
    });
    assertEquals(
      "error" in successResult,
      false,
      "Updating existing user's name should succeed, confirming `effects`.",
    );
    const profileAfterSuccess = await getProfileOrThrow(
      userProfileConcept,
      charlieId,
    );
    assertEquals(
      profileAfterSuccess.name,
      newName,
      "User's name should be updated after successful call.",
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
      "Updating name for a non-existent user should fail, confirming `requires` condition.",
    );
    assertEquals(
      (failResult as { error: string }).error,
      `User with ID '${nonExistentUserId}' not found.`,
      "Error message should indicate user not found.",
    );
    console.log("  Updating name for non-existent user correctly failed, requirement satisfied.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: updateProfilePicture requires user exists", async () => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    console.log(
      "\n--- Action Test: updateProfilePicture requires user exists ---",
    );

    // Setup: Create a user for successful update scenario
    const createResult = await userProfileConcept.createUser({
      uid: "user_d_uid",
      name: "Diana Prince",
      email: "diana@example.com",
      password: "pass",
      profilePicture: "diana_old.jpg",
      fieldOfInterests: [],
    });
    const { user: dianaId } = createResult as { user: ID };
    console.log(`  Existing user (ID: ${dianaId}) created for positive test case.`);

    // Test successful update for an existing user
    console.log("Testing: Successful update of an existing user's profile picture.");
    const newPicture = "diana_new.png";
    const successResult = await userProfileConcept.updateProfilePicture({
      user: dianaId,
      newProfilePicture: newPicture,
    });
    assertEquals(
      "error" in successResult,
      false,
      "Updating existing user's profile picture should succeed, confirming `effects`.",
    );
    const profileAfterSuccess = await getProfileOrThrow(
      userProfileConcept,
      dianaId,
    );
    assertEquals(
      profileAfterSuccess.profilePicture,
      newPicture,
      "User's profile picture should be updated after successful call.",
    );
    console.log(`  Profile picture successfully updated to '${newPicture}' and verified.`);

    // Test failure for a non-existent user
    console.log(
      "Testing: Attempt to update profile picture for a non-existent user.",
    );
    const nonExistentUserId = "user:nonexistent_e" as ID;
    const failResult = await userProfileConcept.updateProfilePicture({
      user: nonExistentUserId,
      newProfilePicture: "nonexistent.png",
    });
    assertEquals(
      "error" in failResult,
      true,
      "Updating profile picture for a non-existent user should fail, confirming `requires` condition.",
    );
    assertEquals(
      (failResult as { error: string }).error,
      `User with ID '${nonExistentUserId}' not found.`,
      "Error message should indicate user not found.",
    );
    console.log(
      "  Updating profile picture for non-existent user correctly failed, requirement satisfied.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: updatePassword requires user exists", async () => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    console.log("\n--- Action Test: updatePassword requires user exists ---");

    // Setup: Create a user for successful update scenario
    const createResult = await userProfileConcept.createUser({
      uid: "user_e_uid",
      name: "Ethan Hunt",
      email: "ethan@example.com",
      password: "initial_password_ethan",
      profilePicture: "ethan.jpg",
      fieldOfInterests: [],
    });
    const { user: ethanId } = createResult as { user: ID };
    console.log(`  Existing user (ID: ${ethanId}) created for positive test case.`);

    // Test successful update for an existing user
    console.log("Testing: Successful update of an existing user's password.");
    const newPassword = "new_strong_password_ethan";
    const successResult = await userProfileConcept.updatePassword({
      user: ethanId,
      newPassword: newPassword,
    });
    assertEquals(
      "error" in successResult,
      false,
      "Updating existing user's password should succeed, confirming `effects`.",
    );
    // Password is not returned by _getProfile, so we confirm action success.
    console.log(
      "  Password successfully updated (effect confirmed by action returning no error).",
    );

    // Test failure for a non-existent user
    console.log("Testing: Attempt to update password for a non-existent user.");
    const nonExistentUserId = "user:nonexistent_f" as ID;
    const failResult = await userProfileConcept.updatePassword({
      user: nonExistentUserId,
      newPassword: "bad_password",
    });
    assertEquals(
      "error" in failResult,
      true,
      "Updating password for a non-existent user should fail, confirming `requires` condition.",
    );
    assertEquals(
      (failResult as { error: string }).error,
      `User with ID '${nonExistentUserId}' not found.`,
      "Error message should indicate user not found.",
    );
    console.log("  Updating password for non-existent user correctly failed, requirement satisfied.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: updateInterests requires user exists", async () => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    console.log("\n--- Action Test: updateInterests requires user exists ---");

    // Setup: Create a user with some initial interests for successful update scenario
    const initialInterests = ["Books", "Movies"];
    const createResult = await userProfileConcept.createUser({
      uid: "user_f_uid",
      name: "Fiona Gale",
      email: "fiona@example.com",
      password: "pass",
      profilePicture: "fiona.jpg",
      fieldOfInterests: initialInterests,
    });
    const { user: fionaId } = createResult as { user: ID };
    console.log(
      `  Existing user (ID: ${fionaId}) created with initial interests: ${initialInterests.join(", ")}.`,
    );

    // Test successful update for an existing user
    console.log("Testing: Successful update of an existing user's interests.");
    const newInterests = ["Music", "Travel", "Books", "Art"]; // Includes an existing and new interests
    const successResult = await userProfileConcept.updateInterests({
      user: fionaId,
      newFieldsOfInterests: newInterests,
    });
    assertEquals(
      "error" in successResult,
      false,
      "Updating existing user's interests should succeed, confirming `effects`.",
    );
    const profileAfterSuccess = await getProfileOrThrow(
      userProfileConcept,
      fionaId,
    );
    assertEquals(
      profileAfterSuccess.fieldOfInterests.sort(),
      newInterests.sort(),
      "User's interests should be updated after successful call.",
    );
    console.log(`  Interests successfully updated to: ${newInterests.join(", ")} and verified.`);

    // Test failure for a non-existent user
    console.log("Testing: Attempt to update interests for a non-existent user.");
    const nonExistentUserId = "user:nonexistent_g" as ID;
    const failResult = await userProfileConcept.updateInterests({
      user: nonExistentUserId,
      newFieldsOfInterests: ["Fake Interest"],
    });
    assertEquals(
      "error" in failResult,
      true,
      "Updating interests for a non-existent user should fail, confirming `requires` condition.",
    );
    assertEquals(
      (failResult as { error: string }).error,
      `User with ID '${nonExistentUserId}' not found.`,
      "Error message should indicate user not found.",
    );
    console.log("  Updating interests for non-existent user correctly failed, requirement satisfied.");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getProfile requires user exists", async () => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  try {
    console.log("\n--- Query Test: _getProfile requires user exists ---");

    // Setup: Create a user for successful retrieval scenario
    const createResult = await userProfileConcept.createUser({
      uid: "user_g_uid",
      name: "George",
      email: "george@example.com",
      password: "pass",
      profilePicture: "george.jpg",
      fieldOfInterests: ["Science"],
    });
    const { user: georgeId } = createResult as { user: ID };
    console.log(`  Existing user (ID: ${georgeId}) created for positive test case.`);

    // Test successful retrieval for an existing user
    console.log("Testing: Successful retrieval of an existing user's profile.");
    const successResult = await userProfileConcept._getProfile({
      user: georgeId,
    });
    assertNotEquals(
      "error" in successResult,
      true,
      "Retrieving existing user's profile should succeed.",
    );
    assertExists(
      (successResult as [{ profile: any }])[0].profile,
      "Profile data should be returned for an existing user.",
    );
    assertEquals(
      (successResult as [{ profile: any }])[0].profile.uid,
      "user_g_uid",
      "Retrieved profile UID should match the created user.",
    );
    assertEquals(
      (successResult as [{ profile: any }])[0].profile.fieldOfInterests.sort(),
      ["Science"].sort(),
      "Retrieved profile interests should match the created user.",
    );
    console.log("  Existing user's profile successfully retrieved and verified, `effects` confirmed.");

    // Test failure for a non-existent user
    console.log("Testing: Attempt to retrieve profile for a non-existent user.");
    const nonExistentUserId = "user:nonexistent_h" as ID;
    const failResult = await userProfileConcept._getProfile({
      user: nonExistentUserId,
    });
    assertEquals(
      "error" in failResult,
      true,
      "Retrieving profile for a non-existent user should fail, confirming `requires` condition.",
    );
    assertEquals(
      (failResult as { error: string }).error,
      `User with ID '${nonExistentUserId}' not found.`,
      "Error message should indicate user not found.",
    );
    console.log("  Retrieving profile for non-existent user correctly failed, requirement satisfied.");
  } finally {
    await client.close();
  }
});
```
