[@concept-design-overview](../../background/concept-design-overview.md)


[@concept-specifications](../../background/concept-specifications.md)


[@implementing-concepts](../../background/implementing-concepts.md)


# implement: PasswordAuth


# concept: PasswordAuth
```
concept: PasswordAuth [Party]

purpose:
    Authenticate users via email and password credentials.

principle:
    A party can register with credentials (email, password), then authenticate 
    by providing matching credentials to establish a session.

state:
    a set of RegisteredParties with
        a party Party
        an email String
        a password String

    a set of AuthenticatedParties with
        a party Party

actions:
    register (party: Party, email: String, password: String)
        requires
            no registered party exists with matching email
        effect
            add (party, email, password) to RegisteredParties

    authenticate (email: String, password: String): (party: Party)
        requires
            exists (party, email, password) in RegisteredParties
        effect
            add party to AuthenticatedParties
            return party

    endSession (party: Party)
        requires
            party exists in AuthenticatedParties
        effect
            remove party from AuthenticatedParties

    updatePassword (party: Party, newPassword: String)
        requires
            party exists in AuthenticatedParties
            party exists in RegisteredParties
        effect
            update password for party in RegisteredParties
```

# response:

```typescript
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
   * register (party: Party, email: String, password: String): Empty | {error: string}
   *
   * **requires** no registered party exists with matching email
   *
   * **effects** add (party, email, password) to RegisteredParties
   */
  async register(
    { party, email, password }: { party: Party; email: string; password: string },
  ): Promise<Empty | { error: string }> {
    // Check precondition: no registered party exists with matching email
    const existingParty = await this.registeredParties.findOne({ email });
    if (existingParty) {
      return { error: `A party with email '${email}' is already registered.` };
    }

    // Effect: add (party, email, password) to RegisteredParties
    await this.registeredParties.insertOne({
      _id: party,
      email,
      password,
    });

    return {};
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
      return { error: "Invalid email or password." };
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
   * endSession (party: Party): Empty | {error: string}
   *
   * **requires** party exists in AuthenticatedParties
   *
   * **effects** remove party from AuthenticatedParties
   */
  async endSession({ party }: { party: Party }): Promise<Empty | { error: string }> {
    // Check precondition: party exists in AuthenticatedParties
    const authenticatedParty = await this.authenticatedParties.findOne({
      _id: party,
    });
    if (!authenticatedParty) {
      return { error: `Party '${party}' is not currently authenticated.` };
    }

    // Effect: remove party from AuthenticatedParties
    await this.authenticatedParties.deleteOne({ _id: party });

    return {};
  }

  /**
   * updatePassword (party: Party, newPassword: String): Empty | {error: string}
   *
   * **requires**
   *     party exists in AuthenticatedParties
   *     party exists in RegisteredParties
   *
   * **effects** update password for party in RegisteredParties
   */
  async updatePassword(
    { party, newPassword }: { party: Party; newPassword: string },
  ): Promise<Empty | { error: string }> {
    // Check precondition 1: party exists in AuthenticatedParties
    const isAuthenticated = await this.authenticatedParties.findOne({
      _id: party,
    });
    if (!isAuthenticated) {
      return { error: `Party '${party}' is not authenticated.` };
    }

    // Check precondition 2: party exists in RegisteredParties
    const registeredParty = await this.registeredParties.findOne({ _id: party });
    if (!registeredParty) {
      return { error: `Party '${party}' is not registered.` };
    }

    // Effect: update password for party in RegisteredParties
    await this.registeredParties.updateOne(
      { _id: party },
      { $set: { password: newPassword } },
    );

    return {};
  }
}
```