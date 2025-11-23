---
timestamp: 'Sun Nov 23 2025 13:49:18 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251123_134918.b8723712.md]]'
content_id: 7d228872809be1e5dddc9fb2b9e638e3c8146f2829ebf0eb04754c4fa2206cd5
---

# response:

```typescript
// file: src/concepts/PasswordAuth/PasswordAuthConcept.test.ts
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PasswordAuthConcept from "./PasswordAuthConcept.ts";

const partyA = "party:Alice" as ID;
const emailA = "alice@example.com";
const passwordA = "password123";
const newPasswordA = "newPassword456";

const partyB = "party:Bob" as ID;
const emailB = "bob@example.com";
const passwordB = "securepass";

const nonExistentEmail = "unknown@example.com";
const incorrectPassword = "wrongpassword";
const unauthenticatedParty = "party:Charlie" as ID; // A party that exists but isn't authenticated for a specific action

// Helper function to check for an error return type from concept actions
function isError(result: any): result is { error: string } {
  return typeof result === "object" && result !== null && "error" in result;
}

Deno.test("Principle: A party can register, authenticate, and manage their session/password.", async (t) => {
  const [db, client] = await testDb();
  const authConcept = new PasswordAuthConcept(db);

  try {
    // trace: Register Party A
    await t.step("1. Party A registers with email and password.", async () => {
      console.log(`Trace: Registering ${partyA} with email: ${emailA}`);
      const registerResult = await authConcept.register({
        party: partyA,
        email: emailA,
        password: passwordA,
      });
      assertNotEquals(isError(registerResult), true, `Registration for ${partyA} should succeed.`);
      assertEquals((registerResult as { party: ID }).party, partyA, "The registered party ID should match.");
      console.log(`Registered ${partyA}.`);
    });

    // trace: Authenticate Party A
    let authenticatedPartyId: ID;
    await t.step("2. Party A authenticates with correct credentials.", async () => {
      console.log(`Trace: Authenticating email: ${emailA} with password: ${passwordA}`);
      const authResult = await authConcept.authenticate({
        email: emailA,
        password: passwordA,
      });
      assertNotEquals(isError(authResult), true, `Authentication for ${emailA} should succeed.`);
      assertExists((authResult as { party: ID }).party, "Authenticated party ID should be returned.");
      assertEquals((authResult as { party: ID }).party, partyA, "Authenticated party should be Alice.");
      authenticatedPartyId = (authResult as { party: ID }).party;
      console.log(`Authenticated ${authenticatedPartyId}.`);
    });

    // trace: Authenticated Party A updates their password
    await t.step("3. Authenticated Party A updates their password.", async () => {
      console.log(`Trace: ${authenticatedPartyId} (authenticated) updating password to ${newPasswordA}`);
      const updateResult = await authConcept.updatePassword({
        party: authenticatedPartyId,
        newPassword: newPasswordA,
      });
      assertNotEquals(isError(updateResult), true, `Password update for ${authenticatedPartyId} should succeed.`);
      console.log(`Password for ${authenticatedPartyId} updated.`);
    });

    // trace: Attempt to authenticate with old password (should fail)
    await t.step("4. Party A tries to authenticate with the old password (should fail).", async () => {
      console.log(`Trace: Attempting to authenticate email: ${emailA} with old password.`);
      const authResultOld = await authConcept.authenticate({
        email: emailA,
        password: passwordA,
      });
      assertEquals(isError(authResultOld), true, `Authentication with old password should fail.`);
      assertEquals((authResultOld as { error: string }).error, "Invalid credentials.", "Error message should indicate invalid credentials.");
      console.log(`Authentication with old password failed as expected.`);
    });

    // trace: Authenticate with new password (should succeed)
    await t.step("5. Party A authenticates with the new password.", async () => {
      console.log(`Trace: Authenticating email: ${emailA} with new password: ${newPasswordA}`);
      const authResultNew = await authConcept.authenticate({
        email: emailA,
        password: newPasswordA,
      });
      assertNotEquals(isError(authResultNew), true, `Authentication with new password should succeed.`);
      assertExists((authResultNew as { party: ID }).party, "Authenticated party ID should be returned.");
      assertEquals((authResultNew as { party: ID }).party, partyA, "Authenticated party should be Alice.");
      authenticatedPartyId = (authResultNew as { party: ID }).party; // Re-authenticate, ensuring the new session is valid
      console.log(`Authenticated ${authenticatedPartyId} with new password.`);
    });

    // trace: Party A ends their session
    await t.step("6. Authenticated Party A ends their session.", async () => {
      console.log(`Trace: ${authenticatedPartyId} ending session.`);
      const endSessionResult = await authConcept.endSession({ party: authenticatedPartyId });
      assertNotEquals(isError(endSessionResult), true, `Ending session for ${authenticatedPartyId} should succeed.`);
      assertEquals((endSessionResult as { success: true }).success, true, "Successful end session should return success.");
      console.log(`Session for ${authenticatedPartyId} ended.`);
    });

    // trace: Party A tries to update password again (should fail as session ended)
    await t.step("7. Party A tries to update password again after session ended (should fail).", async () => {
      console.log(`Trace: ${partyA} trying to update password after session ended.`);
      const updateResultAfterEnd = await authConcept.updatePassword({
        party: partyA,
        newPassword: "evenNewerPassword",
      });
      assertEquals(isError(updateResultAfterEnd), true, `Password update should fail as party is not authenticated.`);
      assertEquals((updateResultAfterEnd as { error: string }).error, "Party not authenticated to update password.", "Error message should match.");
      console.log(`Password update failed as expected after session ended.`);
    });

    console.log("Principle fulfilled: Registration, authentication, password update, and session management demonstrated.");
  } finally {
    await client.close();
  }
});


Deno.test("Action: register requirements are enforced and effects are verified.", async (t) => {
  const [db, client] = await testDb();
  const authConcept = new PasswordAuthConcept(db);

  try {
    await t.step("1. Successful initial registration.", async () => {
      console.log(`Action: register - Registering ${partyA} with email: ${emailA}.`);
      const registerResult = await authConcept.register({
        party: partyA,
        email: emailA,
        password: passwordA,
      });
      assertNotEquals(isError(registerResult), true, "Initial registration should succeed.");
      assertEquals((registerResult as { party: ID }).party, partyA, "Correct party ID should be returned.");
      console.log(`Effect confirmed: ${partyA} registered.`);
    });

    await t.step("2. Requirement: no registered party exists with matching email (attempt to register with duplicate email).", async () => {
      console.log(`Action: register - Attempting to register ${partyB} with existing email ${emailA}.`);
      const duplicateEmailResult = await authConcept.register({
        party: partyB,
        email: emailA, // Duplicate email
        password: passwordB,
      });
      assertEquals(isError(duplicateEmailResult), true, "Registration with duplicate email should fail.");
      assertEquals((duplicateEmailResult as { error: string }).error, "Email already registered.", "Error message should indicate duplicate email.");
      console.log("Requirement satisfied: Duplicate email registration failed.");
    });

    await t.step("3. Effect: The party can successfully authenticate after registration.", async () => {
      console.log(`Action: authenticate - Attempting to authenticate ${emailA} to verify registration persistence.`);
      const authResult = await authConcept.authenticate({
        email: emailA,
        password: passwordA,
      });
      assertNotEquals(isError(authResult), true, "Authentication with original credentials should still succeed, confirming effect.");
      assertEquals((authResult as { party: ID }).party, partyA, "Original party should be authenticated.");
      await authConcept.endSession({ party: partyA }); // Clean up session for other tests
      console.log("Effect verified: Registered party can still authenticate.");
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: authenticate requirements are enforced and effects are verified.", async (t) => {
  const [db, client] = await testDb();
  const authConcept = new PasswordAuthConcept(db);

  try {
    // Setup: Register Party A for authentication tests
    await authConcept.register({ party: partyA, email: emailA, password: passwordA });
    console.log(`Setup: Registered ${partyA} for authentication tests.`);

    await t.step("1. Requirement: exists (party, email, password) in RegisteredParties (non-existent email).", async () => {
      console.log(`Action: authenticate - Attempting to authenticate with non-existent email ${nonExistentEmail}.`);
      const nonExistentEmailResult = await authConcept.authenticate({
        email: nonExistentEmail,
        password: passwordA,
      });
      assertEquals(isError(nonExistentEmailResult), true, "Authentication with non-existent email should fail.");
      assertEquals((nonExistentEmailResult as { error: string }).error, "Invalid credentials.", "Error message should indicate invalid credentials.");
      console.log("Requirement satisfied: Authentication with non-existent email failed.");
    });

    await t.step("2. Requirement: exists (party, email, password) in RegisteredParties (incorrect password).", async () => {
      console.log(`Action: authenticate - Attempting to authenticate ${emailA} with incorrect password.`);
      const incorrectPasswordResult = await authConcept.authenticate({
        email: emailA,
        password: incorrectPassword,
      });
      assertEquals(isError(incorrectPasswordResult), true, "Authentication with incorrect password should fail.");
      assertEquals((incorrectPasswordResult as { error: string }).error, "Invalid credentials.", "Error message should indicate invalid credentials.");
      console.log("Requirement satisfied: Authentication with incorrect password failed.");
    });

    let authenticatedPartyId: ID;
    await t.step("3. Effect: add party to AuthenticatedParties and return party upon successful authentication.", async () => {
      console.log(`Action: authenticate - Authenticating ${emailA} with correct credentials.`);
      const successResult = await authConcept.authenticate({
        email: emailA,
        password: passwordA,
      });
      assertNotEquals(isError(successResult), true, "Authentication with correct credentials should succeed.");
      assertExists((successResult as { party: ID }).party, "Authenticated party ID should be returned.");
      assertEquals((successResult as { party: ID }).party, partyA, "The correct party ID should be returned.");
      authenticatedPartyId = (successResult as { party: ID }).party;
      console.log(`Effect confirmed: ${authenticatedPartyId} authenticated.`);
    });

    await t.step("4. Effect (indirect): Authenticated party can perform actions that require authentication.", async () => {
      console.log(`Action: updatePassword - Attempting to update password for ${authenticatedPartyId} (requires authentication).`);
      const updateResult = await authConcept.updatePassword({ party: authenticatedPartyId, newPassword: newPasswordA });
      assertNotEquals(isError(updateResult), true, "Update password should succeed, confirming party is authenticated.");
      await authConcept.endSession({ party: authenticatedPartyId }); // Clean up
      console.log("Effect verified: Authenticated party could perform an authenticated action.");
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: endSession requirements are enforced and effects are verified.", async (t) => {
  const [db, client] = await testDb();
  const authConcept = new PasswordAuthConcept(db);

  try {
    // Setup: Register and Authenticate Party A
    await authConcept.register({ party: partyA, email: emailA, password: passwordA });
    const authResult = await authConcept.authenticate({ email: emailA, password: passwordA });
    const authenticatedPartyId = (authResult as { party: ID }).party;
    console.log(`Setup: Registered and authenticated ${authenticatedPartyId} for endSession tests.`);

    await t.step("1. Requirement: party exists in AuthenticatedParties (attempt to end session for unauthenticated party).", async () => {
      console.log(`Action: endSession - Attempting to end session for an unauthenticated party ${unauthenticatedParty}.`);
      const unauthenticatedEndSessionResult = await authConcept.endSession({ party: unauthenticatedParty });
      assertEquals(isError(unauthenticatedEndSessionResult), true, "Ending session for unauthenticated party should fail.");
      assertEquals((unauthenticatedEndSessionResult as { error: string }).error, "Party not authenticated.", "Error message should match.");
      console.log("Requirement satisfied: Ending session for unauthenticated party failed.");
    });

    await t.step("2. Effect: remove party from AuthenticatedParties upon successful endSession.", async () => {
      console.log(`Action: endSession - Ending session for authenticated party ${authenticatedPartyId}.`);
      const successEndSessionResult = await authConcept.endSession({ party: authenticatedPartyId });
      assertNotEquals(isError(successEndSessionResult), true, "Ending session for authenticated party should succeed.");
      assertEquals((successEndSessionResult as { success: true }).success, true, "Successful end session should return success.");
      console.log(`Effect confirmed: Session for ${authenticatedPartyId} ended.`);
    });

    await t.step("3. Effect (indirect): Party can no longer perform authenticated actions after session ends.", async () => {
      console.log(`Action: updatePassword - Attempting to update password for ${partyA} after session ended.`);
      const updateResultAfterEnd = await authConcept.updatePassword({ party: partyA, newPassword: newPasswordA });
      assertEquals(isError(updateResultAfterEnd), true, "Update password should fail as party is no longer authenticated.");
      assertEquals((updateResultAfterEnd as { error: string }).error, "Party not authenticated to update password.", "Error message should match.");
      console.log("Effect verified: Party could not perform authenticated action after session ended.");
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: updatePassword requirements are enforced and effects are verified.", async (t) => {
  const [db, client] = await testDb();
  const authConcept = new PasswordAuthConcept(db);

  try {
    // Setup: Register Party A
    await authConcept.register({ party: partyA, email: emailA, password: passwordA });
    console.log(`Setup: Registered ${partyA} for updatePassword tests.`);

    await t.step("1. Requirement: party exists in AuthenticatedParties (attempt to update without authentication).", async () => {
      console.log(`Action: updatePassword - Attempting to update password for ${partyA} without authentication.`);
      const notAuthUpdateResult = await authConcept.updatePassword({
        party: partyA,
        newPassword: newPasswordA,
      });
      assertEquals(isError(notAuthUpdateResult), true, "Update password should fail if party is not authenticated.");
      assertEquals((notAuthUpdateResult as { error: string }).error, "Party not authenticated to update password.", "Error message should match.");
      console.log("Requirement satisfied: Update password failed due to lack of authentication.");
    });

    // Authenticate Party A for subsequent steps
    await authConcept.authenticate({ email: emailA, password: passwordA });
    console.log(`Setup: Authenticated ${partyA}.`);

    await t.step("2. Requirement: party exists in RegisteredParties (implicitly handled by successful authentication).", async () => {
      // The concept states "party exists in RegisteredParties". Since authentication
      // itself requires the party to be registered, if we can authenticate, this
      // requirement is inherently met. Testing a scenario where an authenticated
      // party is not registered is an inconsistent state that should not occur.
      // We perform a valid update to confirm it passes when both conditions are met.
      console.log(`Action: updatePassword - Attempting valid password update for ${partyA} (authenticated and registered).`);
      const result = await authConcept.updatePassword({ party: partyA, newPassword: passwordA }); // No actual change, just checking it passes
      assertNotEquals(isError(result), true, "Update password for an authenticated and registered party should succeed.");
      console.log("Requirement satisfied: Party existed in RegisteredParties (implicitly via authentication).");
    });


    await t.step("3. Effect: update password for party in RegisteredParties.", async () => {
      console.log(`Action: updatePassword - Updating password for ${partyA} to ${newPasswordA}.`);
      const successUpdateResult = await authConcept.updatePassword({
        party: partyA,
        newPassword: newPasswordA,
      });
      assertNotEquals(isError(successUpdateResult), true, "Password update should succeed.");
      assertEquals((successUpdateResult as { success: true }).success, true, "Successful update should return success.");
      console.log(`Effect confirmed: Password for ${partyA} updated to ${newPasswordA}.`);
    });

    await t.step("4. Effect (indirect): Old password no longer works, new password works for authentication.", async () => {
      console.log(`Action: authenticate - Attempting to authenticate ${emailA} with old password ${passwordA} (should fail).`);
      const authResultOld = await authConcept.authenticate({
        email: emailA,
        password: passwordA,
      });
      assertEquals(isError(authResultOld), true, "Authentication with old password should fail.");
      assertEquals((authResultOld as { error: string }).error, "Invalid credentials.", "Error message should match.");
      console.log("Effect verified: Old password no longer works.");

      console.log(`Action: authenticate - Attempting to authenticate ${emailA} with new password ${newPasswordA} (should succeed).`);
      const authResultNew = await authConcept.authenticate({
        email: emailA,
        password: newPasswordA,
      });
      assertNotEquals(isError(authResultNew), true, "Authentication with new password should succeed.");
      assertEquals((authResultNew as { party: ID }).party, partyA, "Correct party should be authenticated with new password.");
      console.log("Effect verified: New password works for authentication.");
      await authConcept.endSession({ party: partyA }); // Clean up
    });
  } finally {
    await client.close();
  }
});
```
