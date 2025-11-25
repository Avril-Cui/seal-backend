---
timestamp: 'Tue Nov 25 2025 12:54:44 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_125444.31df0dd7.md]]'
content_id: 301c269ea84b0e740be7b02b94ba17a2342369506ac7498cf1ed096cacc38554
---

# file: src/concepts/UserAuth/UserAuthConcept.test.ts

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthConcept from "./UserAuthConcept.ts";

const TEST_EMAIL_1 = "alice@example.com";
const TEST_PASSWORD_1 = "securePassword123";
const TEST_EMAIL_2 = "bob@example.com";
const TEST_PASSWORD_2 = "anotherSecurePass";
const WRONG_PASSWORD = "wrongPassword";

Deno.test("Principle: User accounts are unique by email, and users can log in", async (t) => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);

  try {
    await t.step("trace: Alice signs up for an account", async () => {
      console.log(`Trace: Attempting to signup with email: ${TEST_EMAIL_1}`);
      const signupResult = await userAuthConcept.signup({
        email: TEST_EMAIL_1,
        password: TEST_PASSWORD_1,
      });

      assertEquals(
        "error" in signupResult,
        false,
        "Signup for a new user should succeed.",
      );
      assertExists(
        (signupResult as { user: unknown }).user,
        "Signup should return a user object.",
      );
      console.log(`Trace: Signup successful. User ID: ${
        (signupResult as any).user._id
      }`);
    });

    await t.step(
      "trace: Attempting to signup with the same email (demonstrates uniqueness)",
      async () => {
        console.log(
          `Trace: Attempting to signup again with email: ${TEST_EMAIL_1}`,
        );
        const duplicateSignupResult = await userAuthConcept.signup({
          email: TEST_EMAIL_1,
          password: TEST_PASSWORD_1,
        });

        assertEquals(
          "error" in duplicateSignupResult,
          true,
          "Signup with an existing email should fail, enforcing uniqueness.",
        );
        assertEquals(
          (duplicateSignupResult as { error: string }).error,
          "Email already registered.",
          "Error message should indicate duplicate email.",
        );
        console.log(
          `Trace: Signup with duplicate email failed as expected: ${
            (duplicateSignupResult as { error: string }).error
          }`,
        );
      },
    );

    await t.step(
      "trace: Alice attempts to log in with valid credentials (demonstrates login)",
      async () => {
        console.log(
          `Trace: Attempting to login with email: ${TEST_EMAIL_1} and valid password.`,
        );
        const loginResult = await userAuthConcept.login({
          email: TEST_EMAIL_1,
          password: TEST_PASSWORD_1,
        });

        assertEquals(
          "error" in loginResult,
          false,
          "Login with valid credentials should succeed.",
        );
        assertExists(
          (loginResult as { user: unknown }).user,
          "Login should return a user object.",
        );
        assertEquals(
          (loginResult as any).user.email,
          TEST_EMAIL_1,
          "Logged in user's email should match.",
        );
        console.log(`Trace: Login successful for user: ${
          (loginResult as any).user.email
        }`);
      },
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: signup - requirements and effects", async (t) => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);

  try {
    await t.step("requires: no registered user exists with matching email", async () => {
      console.log(`Test: Attempting initial signup for ${TEST_EMAIL_1}.`);
      // First signup should succeed
      const initialSignup = await userAuthConcept.signup({
        email: TEST_EMAIL_1,
        password: TEST_PASSWORD_1,
      });
      assertEquals("error" in initialSignup, false, "Initial signup must succeed.");
      assertExists((initialSignup as any).user, "User object must be returned.");
      console.log(`Test: Initial signup successful for ${TEST_EMAIL_1}.`);

      // Second signup with same email should fail
      console.log(`Test: Attempting signup again for ${TEST_EMAIL_1} (should fail).`);
      const duplicateSignup = await userAuthConcept.signup({
        email: TEST_EMAIL_1,
        password: TEST_PASSWORD_2, // Password doesn't matter for email uniqueness check
      });
      assertEquals("error" in duplicateSignup, true, "Duplicate email signup must return an error.");
      assertEquals(
        (duplicateSignup as { error: string }).error,
        "Email already registered.",
        "Error message for duplicate email should be correct.",
      );
      console.log(
        `Test: Duplicate signup for ${TEST_EMAIL_1} failed as required.`,
      );
    });

    await t.step("effects: creates new user, adds to RegisteredUsers, returns user", async () => {
      console.log(`Test: Attempting signup for new user ${TEST_EMAIL_2}.`);
      const newSignupResult = await userAuthConcept.signup({
        email: TEST_EMAIL_2,
        password: TEST_PASSWORD_2,
      });

      assertEquals("error" in newSignupResult, false, "New user signup must succeed.");
      const newUser = (newSignupResult as any).user;
      assertExists(newUser, "Signup should return the created user object.");
      assertExists(newUser._id, "The created user should have a unique ID.");
      assertEquals(newUser.email, TEST_EMAIL_2, "The created user's email should match input.");
      assertEquals(newUser.password, TEST_PASSWORD_2, "The created user's password should match input.");
      console.log(
        `Test: New user ${TEST_EMAIL_2} created and returned with ID: ${newUser._id}.`,
      );

      // Verify the user is now in RegisteredUsers by attempting to log in
      console.log(`Test: Verifying user ${TEST_EMAIL_2} can login.`);
      const loginVerification = await userAuthConcept.login({
        email: TEST_EMAIL_2,
        password: TEST_PASSWORD_2,
      });
      assertEquals("error" in loginVerification, false, "Login for newly signed up user must succeed.");
      assertEquals(
        (loginVerification as any).user.email,
        TEST_EMAIL_2,
        "Logged in user's email should match the newly created user.",
      );
      console.log(`Test: User ${TEST_EMAIL_2} successfully logged in, confirming creation effect.`);
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: login - requirements and effects", async (t) => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);

  // Setup: Sign up a user for login tests
  const { user: registeredUser } = (await userAuthConcept.signup({
    email: TEST_EMAIL_1,
    password: TEST_PASSWORD_1,
  })) as any;
  assertExists(registeredUser, "Setup: User must be signed up successfully.");
  console.log(`Setup: User ${TEST_EMAIL_1} signed up for login tests.`);

  try {
    await t.step("requires: user exists with matching (email, password) - non-existent email", async () => {
      const nonExistentEmail = "nonexistent@example.com";
      console.log(`Test: Attempting login with non-existent email: ${nonExistentEmail}.`);
      const loginResult = await userAuthConcept.login({
        email: nonExistentEmail,
        password: TEST_PASSWORD_1,
      });
      assertEquals("error" in loginResult, true, "Login with non-existent email should fail.");
      assertEquals(
        (loginResult as { error: string }).error,
        "Invalid credentials.",
        "Error message should indicate invalid credentials.",
      );
      console.log(
        `Test: Login with non-existent email failed as required: ${nonExistentEmail}.`,
      );
    });

    await t.step("requires: user exists with matching (email, password) - wrong password", async () => {
      console.log(
        `Test: Attempting login for ${TEST_EMAIL_1} with wrong password.`,
      );
      const loginResult = await userAuthConcept.login({
        email: TEST_EMAIL_1,
        password: WRONG_PASSWORD,
      });
      assertEquals("error" in loginResult, true, "Login with wrong password should fail.");
      assertEquals(
        (loginResult as { error: string }).error,
        "Invalid credentials.",
        "Error message should indicate invalid credentials.",
      );
      console.log(
        `Test: Login for ${TEST_EMAIL_1} with wrong password failed as required.`,
      );
    });

    await t.step("effects: return this user upon successful login", async () => {
      console.log(
        `Test: Attempting successful login for ${TEST_EMAIL_1} with correct credentials.`,
      );
      const loginResult = await userAuthConcept.login({
        email: TEST_EMAIL_1,
        password: TEST_PASSWORD_1,
      });
      assertEquals("error" in loginResult, false, "Login with valid credentials must succeed.");
      const loggedInUser = (loginResult as any).user;
      assertExists(loggedInUser, "Successful login should return a user object.");
      assertEquals(
        loggedInUser._id,
        registeredUser._id,
        "The returned user ID should match the registered user's ID.",
      );
      assertEquals(
        loggedInUser.email,
        registeredUser.email,
        "The returned user email should match the registered user's email.",
      );
      assertEquals(
        loggedInUser.password,
        registeredUser.password,
        "The returned user password should match the registered user's password (for verification in tests).",
      );
      console.log(`Test: Successful login returned user: ${loggedInUser.email}.`);
    });
  } finally {
    await client.close();
  }
});
```
