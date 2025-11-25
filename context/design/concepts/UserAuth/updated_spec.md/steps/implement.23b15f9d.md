---
timestamp: 'Tue Nov 25 2025 12:51:56 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_125156.1003e7d7.md]]'
content_id: 23b15f9d836ba813c8033b09a2e557f92a6e8321d6dcc2c253d7f15296669ec8
---

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
