import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, using the concept name
const PREFIX = "UserProfile" + ".";

// Define the User entity structure based on the new state
/**
 * a set of Users with
 *   a name String
 *   an email String
 *   a profilePicture String
 *   a reward Number
 *   a fieldOfInterests set of FieldsOfInterests (stored as IDs)
 */
interface UserDocument {
  _id: ID; // The UserAuth._id is used directly as the document's primary key
  name: string;
  email: string;
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
    interestNames: string[]
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
   * createUser (uid: String, name: String, email: String,
   *             profilePicture: String, fieldOfInterests: set of FieldsOfInterests): (user: User)
   *
   * **requires**
   *     no user exists with matching uid;
   *
   * **effects**
   *     create a new user with (uid as _id, name, email, profilePicture, reward = 0, fieldOfInterests);
   *     return user;
   */
  async createUser({
    uid,
    name,
    email,
    profilePicture,
    fieldOfInterests,
  }: {
    uid: ID; // This is the UserAuth._id
    name: string;
    email: string;
    profilePicture: string;
    fieldOfInterests: string[]; // Expecting an array of interest NAMES (strings)
  }): Promise<{ user: ID } | { error: string }> {
    // Check 'requires' condition: ensure no user with the given _id already exists
    const existingUser = await this.users.findOne({ _id: uid });
    if (existingUser) {
      return { error: `User with ID '${uid}' already exists.` };
    }

    // Resolve or create FieldsOfInterests entities and get their IDs
    const interestIDs = await this.ensureFieldsOfInterestsExist(
      fieldOfInterests
    );

    // 'effects': Create and insert a new UserDocument using uid as _id
    const newUser: UserDocument = {
      _id: uid, // Use the UserAuth._id directly
      name: name,
      email: email,
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
  async updateProfileName({
    user,
    newName,
  }: {
    user: ID;
    newName: string;
  }): Promise<Empty | { error: string }> {
    // Check 'requires' condition implicitly by checking if update was successful
    const result = await this.users.updateOne(
      { _id: user },
      { $set: { name: newName } }
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
  async updateProfilePicture({
    user,
    newProfilePicture,
  }: {
    user: ID;
    newProfilePicture: string;
  }): Promise<Empty | { error: string }> {
    // Check 'requires' condition implicitly
    const result = await this.users.updateOne(
      { _id: user },
      { $set: { profilePicture: newProfilePicture } }
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
    {
      user,
      newFieldsOfInterests,
    }: {
      user: ID;
      newFieldsOfInterests: string[];
    } // Expecting array of interest NAMES
  ): Promise<Empty | { error: string }> {
    // Check 'requires' condition: ensure user exists
    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) {
      return { error: `User with ID '${user}' not found.` };
    }

    // Resolve or create FieldsOfInterests entities and get their IDs
    const interestIDs = await this.ensureFieldsOfInterestsExist(
      newFieldsOfInterests
    );

    // 'effects': Update the 'fieldOfInterests' array for the specified user
    await this.users.updateOne(
      { _id: user },
      { $set: { fieldOfInterests: interestIDs } }
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
  async _getProfile({ user }: { user: ID }): Promise<
    | [
        {
          profile: {
            name: string;
            email: string;
            profilePicture: string;
            reward: number;
            fieldOfInterests: string[]; // Returns actual interest names for display
          };
        }
      ]
    | [{ error: string }]
  > {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return [{ error: `User with ID '${user}' not found.` }];
    }

    // Fetch the actual names for the fieldOfInterests IDs
    // Handle case where fieldOfInterests might be undefined, null, or empty
    const fieldOfInterestsIds = userDoc.fieldOfInterests || [];
    const interestDocs = await this.fieldsOfInterests
      .find({
        _id: { $in: fieldOfInterestsIds },
      })
      .toArray();
    const interestNames = interestDocs.map((doc) => doc.field);

    // Return an array of dictionaries, as per query specification guidelines
    return [
      {
        profile: {
          name: userDoc.name,
          email: userDoc.email,
          profilePicture: userDoc.profilePicture,
          reward: userDoc.reward,
          fieldOfInterests: interestNames,
        },
      },
    ];
  }
}
