[@concept-design-overview](../../background/concept-design-overview.md)


[@concept-specifications](../../background/concept-specifications.md)


[@implementing-concepts](../../background/implementing-concepts.md)

# implement: UserAuth
I want to update the UserAuth implementation I have now based on my new spec. This is my current implementation:
```
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

// Declare collection prefix, use concept name
const PREFIX = "PasswordAuth" + ".";

// Generic types of this concept
type Party = ID;

/**
 * a set of RegisteredParties with
 *     a party Party
 *     an email String
 *     a password String
 */
interface RegisteredPartyDoc {
  _id: Party; // The ID of the party
  email: string;
  password: string;
}

/**
 * a set of AuthenticatedParties with
 *     a party Party
 */
interface AuthenticatedPartyDoc {
  _id: Party; // The ID of the authenticated party
}

/**
 * concept: PasswordAuth [Party]
 *
 * purpose:
 *     Authenticate users via email and password credentials.
 */
export default class PasswordAuthConcept {
  registeredParties: Collection<RegisteredPartyDoc>;
  authenticatedParties: Collection<AuthenticatedPartyDoc>;

  constructor(private readonly db: Db) {
    this.registeredParties = this.db.collection(PREFIX + "registeredParties");
    this.authenticatedParties = this.db.collection(
      PREFIX + "authenticatedParties",
    );
  }

  /**
   * register (party: Party, email: String, password: String): {party: Party} | {error: string}
   *
   * **requires** no registered party exists with matching email
   *
   * **effects** add (party, email, password) to RegisteredParties
   */
  async register(
    { party, email, password }: { party: Party; email: string; password: string },
  ): Promise<{ party: Party } | { error: string }> {
    // Check precondition: no registered party exists with matching email
    const existingParty = await this.registeredParties.findOne({ email });
    if (existingParty) {
      return { error: "Email already registered." };
    }

    // Effect: add (party, email, password) to RegisteredParties
    await this.registeredParties.insertOne({
      _id: party,
      email,
      password,
    });

    return { party };
  }

  /**
   * authenticate (email: String, password: String): {party: Party} | {error: string}
   *
   * **requires** exists (party, email, password) in RegisteredParties
   *
   * **effects** add party to AuthenticatedParties; return party
   */
  async authenticate(
    { email, password }: { email: string; password: string },
  ): Promise<{ party: Party } | { error: string }> {
    // Check precondition: exists (party, email, password) in RegisteredParties
    const registeredParty = await this.registeredParties.findOne({
      email,
      password,
    });
    if (!registeredParty) {
      return { error: "Invalid credentials." };
    }

    // Effect: add party to AuthenticatedParties
    // We use upsert to ensure idempotence if `authenticate` is called multiple times for an already authenticated user.
    await this.authenticatedParties.updateOne(
      { _id: registeredParty._id },
      { $set: { _id: registeredParty._id } },
      { upsert: true },
    );

    // Effect: return party
    return { party: registeredParty._id };
  }

  /**
   * endSession (party: Party): {success: true} | {error: string}
   *
   * **requires** party exists in AuthenticatedParties
   *
   * **effects** remove party from AuthenticatedParties
   */
  async endSession({ party }: { party: Party }): Promise<{ success: true } | { error: string }> {
    // Check precondition: party exists in AuthenticatedParties
    const authenticatedParty = await this.authenticatedParties.findOne({
      _id: party,
    });
    if (!authenticatedParty) {
      return { error: "Party not authenticated." };
    }

    // Effect: remove party from AuthenticatedParties
    await this.authenticatedParties.deleteOne({ _id: party });

    return { success: true };
  }

  /**
   * updatePassword (party: Party, newPassword: String): {success: true} | {error: string}
   *
   * **requires**
   *     party exists in AuthenticatedParties
   *     party exists in RegisteredParties
   *
   * **effects** update password for party in RegisteredParties
   */
  async updatePassword(
    { party, newPassword }: { party: Party; newPassword: string },
  ): Promise<{ success: true } | { error: string }> {
    // Check precondition 1: party exists in AuthenticatedParties
    const isAuthenticated = await this.authenticatedParties.findOne({
      _id: party,
    });
    if (!isAuthenticated) {
      return { error: "Party not authenticated to update password." };
    }

    // Check precondition 2: party exists in RegisteredParties
    const registeredParty = await this.registeredParties.findOne({ _id: party });
    if (!registeredParty) {
      return { error: "Party not registered." };
    }

    // Effect: update password for party in RegisteredParties
    await this.registeredParties.updateOne(
      { _id: party },
      { $set: { password: newPassword } },
    );

    return { success: true };
  }
}
```


This is my updated concept spec:
```
concept: UserAuth

purpose:
    Manages users that are registered under BuyBye.

principles:
    (1) Each user account is uniquely identified by an email address.
    (2) Users can log in with valid credentials.

state:
    a set of RegisteredUsers with
      a uid String  // unique id
      an email String
      a password String

    signup (email: String, password: String): (user: RegisteredUsers)
        requires
            no registered user exists with matching email
        effect
            create a new registered user $u$ with (email, password);
            add user $u$ to RegisteredUsers;
            return user $u$;

    login (email: String, password: String): (user: RegisteredUsers)
        requires
            exists a user in RegisteredUsers with matching (email, password)
        effect
            return this user;
```


# response:

Okay, let's refactor your `PasswordAuthConcept` implementation to align with the new `UserAuth` concept specification.

The key changes based on your new spec are:

1.  **Concept Name Change**: From `PasswordAuth` to `UserAuth`.
2.  **State Simplification**: The `AuthenticatedParties` collection is removed. The concept's state now *only* tracks `RegisteredUsers`. Authentication state (whether a user is currently logged in) is now a separate concern, likely managed by a `Session` concept via synchronizations.
3.  **Action Renaming**: `register` becomes `signup`, `authenticate` becomes `login`.
4.  **Action Removal**: `endSession` and `updatePassword` are removed from this concept. These actions imply concerns that are no longer part of `UserAuth`'s core purpose as defined. Password updates, for instance, would be a `ProfileManagement` or `AccountSettings` concept, potentially using `UserAuth` for verification. Session management is typically a `Session` concept.
5.  **Explicit `uid`**: The `RegisteredUsers` now explicitly have a `uid` property, which will map to `_id` in MongoDB.
6.  **Return Types**: `signup` and `login` now return the `RegisteredUsers` object (or at least its properties), not just a `Party` ID.

Here's the updated implementation:

```typescript
// file: src/concepts/UserAuth/UserAuthConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "UserAuth" + "."; // Updated prefix

/**
 * a set of RegisteredUsers with
 *     a uid String  // unique id
 *     an email String
 *     a password String
 */
interface RegisteredUserDoc {
  _id: ID; // Corresponds to the 'uid' String in the spec
  email: string;
  password: string;
}

/**
 * concept: UserAuth
 *
 * purpose:
 *     Manages users that are registered under BuyBye.
 *
 * principles:
 *     (1) Each user account is uniquely identified by an email address.
 *     (2) Users can log in with valid credentials.
 */
export default class UserAuthConcept {
  registeredUsers: Collection<RegisteredUserDoc>; // Renamed collection

  constructor(private readonly db: Db) {
    this.registeredUsers = this.db.collection(PREFIX + "registeredUsers");
  }

  /**
   * signup (email: String, password: String): (user: RegisteredUsers)
   *
   * **requires** no registered user exists with matching email
   *
   * **effects** creates a new registered user $u$ with (email, password);
   *             add user $u$ to RegisteredUsers;
   *             return user $u$;
   */
  async signup(
    { email, password }: { email: string; password: string },
  ): Promise<{ user: RegisteredUserDoc } | { error: string }> {
    // Check precondition: no registered user exists with matching email
    const existingUser = await this.registeredUsers.findOne({ email });
    if (existingUser) {
      return { error: "Email already registered." };
    }

    // Effect: create a new registered user $u$ with (email, password);
    // add user $u$ to RegisteredUsers;
    const uid = freshID(); // Generate a unique ID for the user
    const newUser: RegisteredUserDoc = {
      _id: uid, // Use the generated ID as _id
      email,
      password,
    };

    await this.registeredUsers.insertOne(newUser);

    // Effect: return user $u$
    return { user: newUser };
  }

  /**
   * login (email: String, password: String): (user: RegisteredUsers)
   *
   * **requires** exists a user in RegisteredUsers with matching (email, password)
   *
   * **effects** return this user;
   */
  async login(
    { email, password }: { email: string; password: string },
  ): Promise<{ user: RegisteredUserDoc } | { error: string }> {
    // Check precondition: exists a user in RegisteredUsers with matching (email, password)
    const registeredUser = await this.registeredUsers.findOne({
      email,
      password,
    });
    if (!registeredUser) {
      return { error: "Invalid credentials." };
    }

    // Effect: return this user
    return { user: registeredUser };
  }

  // The 'endSession' and 'updatePassword' actions have been removed
  // as they are not part of the 'UserAuth' concept's purpose
  // according to the new specification.
  // These concerns would typically be managed by separate concepts (e.g., Session, ProfileManagement).
}
```

**Summary of Changes Made:**

1.  **Class Name**: `PasswordAuthConcept` changed to `UserAuthConcept`.
2.  **File Name**: Assumed to be moved to `src/concepts/UserAuth/UserAuthConcept.ts`.
3.  **Collection Prefix**: `PREFIX` updated from `"PasswordAuth."` to `"UserAuth."`.
4.  **State Interface**:
    *   `RegisteredPartyDoc` renamed to `RegisteredUserDoc`.
    *   The generic `Party` type parameter for the concept was removed, as the `uid` is an internal `String` managed by this concept.
    *   `_id: ID` is used for the `uid` as per the generic parameters section (treating `ID` as a branded string).
    *   The `AuthenticatedPartyDoc` interface and the `authenticatedParties` collection were entirely removed from the class and constructor, simplifying the concept's state.
5.  **`register` action**:
    *   Renamed to `signup`.
    *   Now uses `freshID()` to generate a unique `_id` (representing the `uid`) for new users.
    *   The return type is `Promise<{ user: RegisteredUserDoc } | { error: string }>`, which returns the full `RegisteredUserDoc` object upon successful registration.
6.  **`authenticate` action**:
    *   Renamed to `login`.
    *   The logic for adding to `authenticatedParties` was removed, as that collection no longer exists in this concept.
    *   The return type is `Promise<{ user: RegisteredUserDoc } | { error: string }>`, returning the full `RegisteredUserDoc` object upon successful login.
7.  **Removed Actions**: `endSession` and `updatePassword` methods, and their associated collection usage, were removed. This enforces a stronger separation of concerns as defined by your `UserAuth` spec.
8.  **Documentation**: JSDoc comments were updated to reflect the new action signatures, requires, and effects.

This revised implementation strictly adheres to the provided `UserAuth` concept specification, demonstrating a clearer separation of concerns.
