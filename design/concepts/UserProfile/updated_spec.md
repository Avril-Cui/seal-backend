[@concept-design-overview](../../background/concept-design-overview.md)


[@concept-specifications](../../background/concept-specifications.md)


[@implementing-concepts](../../background/implementing-concepts.md)

# implement: UserProfile
I want to update the user profile implementation I have now based on my new spec. This is my current implementation:
```
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
// No need for freshID here as the User ID directly serves as the _id for the profile document.

// Declare collection prefix, using the concept name
const PREFIX = "UserProfile" + ".";

// Generic types of this concept, treated as branded IDs for polymorphism
type User = ID;
type FieldsOfInterests = string[]; // Array of interest strings

/**
 * Interface representing a document in the 'profiles' collection.
 * This corresponds to the 'a set of Profiles' in the concept state.
 *
 * state:
 *   a set of Profiles with
 *       a user User
 *       a name String
 *       a profilePicture String
 *       a fieldsOfInterests FieldsOfInterests
 */
interface ProfileDocument {
  _id: User; // The User ID is used as the document's primary key
  name: string;
  profilePicture: string;
  fieldsOfInterests: FieldsOfInterests;
}

/**
 * concept: UserProfile [User, FieldsOfInterests]
 *
 * purpose:
 *     Manage display and biographical information for users.
 *
 * principle:
 *     Each user has associated profile information (name, picture, interests)
 *     that can be viewed and updated by that user.
 */
export default class UserProfileConcept {
  profiles: Collection<ProfileDocument>;

  constructor(private readonly db: Db) {
    // Initialize the MongoDB collection for user profiles
    this.profiles = this.db.collection(PREFIX + "profiles");
  }

  /**
   * createProfile (user: User, name: String, profilePicture: String,
   *                fieldsOfInterests: FieldsOfInterests): {profile: {user, name, profilePicture, fieldsOfInterests}} | {error: String}
   *
   * **requires**
   *     no profile exists for user
   *
   * **effects**
   *     add (user, name, profilePicture, fieldsOfInterests) to Profiles
   */
  async createProfile(
    { user, name, profilePicture, fieldsOfInterests }: {
      user: User;
      name: string;
      profilePicture: string;
      fieldsOfInterests: FieldsOfInterests;
    },
  ): Promise<
    {
      profile: {
        user: User;
        name: string;
        profilePicture: string;
        fieldsOfInterests: FieldsOfInterests;
      };
    } | { error: string }
  > {
    // Check 'requires' condition: ensure no profile already exists for the given user
    const existingProfile = await this.profiles.findOne({ _id: user });
    if (existingProfile) {
      return { error: "Profile already exists for this user." };
    }

    // 'effects': Insert a new profile document into the collection
    const newProfile: ProfileDocument = {
      _id: user, // The user ID serves as the unique identifier for the profile
      name,
      profilePicture,
      fieldsOfInterests,
    };
    await this.profiles.insertOne(newProfile);
    return {
      profile: {
        user,
        name,
        profilePicture,
        fieldsOfInterests,
      },
    };
  }

  /**
   * updateName (user: User, newName: String): {success: true} | {error: String}
   *
   * **requires**
   *     profile exists for user
   *
   * **effects**
   *     update name for user in Profiles
   */
  async updateName(
    { user, newName }: { user: User; newName: string },
  ): Promise<{ success: true } | { error: string }> {
    // Check 'requires' condition: ensure a profile exists for the given user
    const existingProfile = await this.profiles.findOne({ _id: user });
    if (!existingProfile) {
      return { error: "Profile does not exist for this user." };
    }

    // 'effects': Update the 'name' field for the specified user's profile
    await this.profiles.updateOne(
      { _id: user },
      { $set: { name: newName } },
    );
    return { success: true };
  }

  /**
   * updatePicture (user: User, newProfilePicture: String): {success: true} | {error: String}
   *
   * **requires**
   *     profile exists for user
   *
   * **effects**
   *     update profilePicture for user in Profiles
   */
  async updatePicture(
    { user, newProfilePicture }: { user: User; newProfilePicture: string },
  ): Promise<{ success: true } | { error: string }> {
    // Check 'requires' condition: ensure a profile exists for the given user
    const existingProfile = await this.profiles.findOne({ _id: user });
    if (!existingProfile) {
      return { error: "Profile does not exist for this user." };
    }

    // 'effects': Update the 'profilePicture' field for the specified user's profile
    await this.profiles.updateOne(
      { _id: user },
      { $set: { profilePicture: newProfilePicture } },
    );
    return { success: true };
  }

  /**
   * updateInterests (user: User, newFieldsOfInterests: FieldsOfInterests): {success: true} | {error: String}
   *
   * **requires**
   *     profile exists for user
   *
   * **effects**
   *     update fieldsOfInterests for user in Profiles
   */
  async updateInterests(
    { user, newFieldsOfInterests }: {
      user: User;
      newFieldsOfInterests: FieldsOfInterests;
    },
  ): Promise<{ success: true } | { error: string }> {
    // Check 'requires' condition: ensure a profile exists for the given user
    const existingProfile = await this.profiles.findOne({ _id: user });
    if (!existingProfile) {
      return { error: "Profile does not exist for this user." };
    }

    // 'effects': Update the 'fieldsOfInterests' field for the specified user's profile
    await this.profiles.updateOne(
      { _id: user },
      { $set: { fieldsOfInterests: newFieldsOfInterests } },
    );
    return { success: true };
  }

  /**
   * getProfile (user: User): {profile: {name: String, profilePicture: String, fieldsOfInterests: FieldsOfInterests, user: User}} | {error: String}
   *
   * **requires**
   *     profile exists for user
   *
   * **effects**
   *     return the profile information for user
   */
  async getProfile(
    { user }: { user: User },
  ): Promise<
    {
      profile: {
        user: User;
        name: string;
        profilePicture: string;
        fieldsOfInterests: FieldsOfInterests;
      };
    } | { error: string }
  > {
    // Check 'requires' condition: ensure a profile exists for the given user
    const profile = await this.profiles.findOne({ _id: user });
    if (!profile) {
      return { error: "Profile does not exist for this user." };
    }

    // 'effects': Return the requested profile information
    return {
      profile: {
        user: profile._id,
        name: profile.name,
        profilePicture: profile.profilePicture,
        fieldsOfInterests: profile.fieldsOfInterests,
      },
    };
  }
}
```

This is my latest concept spec:
```
concept: UserProfile

purpose:
    Manages user profiles that are registered under BuyBye.

principle:
    (1) Users customize their profile when they are signing up for BuyBye.
    (2) Users can edit their own profile information.

state:
    a set of Users with
      a uid String  // this is an unique id
      a name String
      an email String
      a password String
      a profilePicture String
      a reward Number
      a fieldOfInterests set of FieldsOfInterests

    a set of FieldsOfInterests
        a field String

actions:
    createUser (uid: String, name: String, email: String, password: String, profilePicture: String, fieldOfInterests: set of FieldsOfInterests): (user: User)
      requires
        no user exists with matching uid;
      effect
        create a new user with (uid, name, email, password, profilePicture, reward = 0, fieldOfInterests);
        return user;

    updateProfileName (user: User, newName: String)
    updateProfilePicture (user: User, newProfilePicture: String)
    updatePassword (user: User, newPassword: String)
      requires
        user exists;
      effect
          update the corresponding attribute of this user

    updateInterests (user: User, newFieldsOfInterests: FieldsOfInterests)
        requires
            user exists;
        effect
            update this user's set of FieldsOfInterests to newFieldsOfInterests;
```
# response:

To update the `UserProfileConcept` implementation based on your new specification, we need to make several key changes, particularly around the structure of the state and the actions.

The new specification introduces:
1.  **Detailed `User` entity**: The `UserProfile` concept now manages full user details including `uid`, `email`, `password`, `reward`, and `fieldOfInterests` directly within a `User` entity.
2.  **`FieldsOfInterests` as a separate entity**: The `fieldOfInterests` is now a `set of FieldsOfInterests`, implying `FieldsOfInterests` is its own entity type with a `field` string. This means we'll likely have two collections: one for `Users` and one for `FieldsOfInterests`.
3.  **New Actions**: `createUser`, `updateProfileName`, `updateProfilePicture`, `updatePassword`, `updateInterests`.

Here's the updated implementation:

```typescript
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
    { user, newFieldsOfInterests }: { user: ID; newFieldsOfInterests: string[] }, // Expecting array of interest NAMES
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