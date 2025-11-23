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