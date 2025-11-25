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
