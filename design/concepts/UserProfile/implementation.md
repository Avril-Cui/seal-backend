[@concept-design-overview](../../background/concept-design-overview.md)


[@concept-specifications](../../background/concept-specifications.md)


[@implementing-concepts](../../background/implementing-concepts.md)


# implement: UserProfile


# concept: UserProfile
```
concept: UserProfile [User, FieldsOfInterests]

purpose:
    Manage display and biographical information for users.

principle:
    Each user has associated profile information (name, picture, interests) 
    that can be viewed and updated by that user.

state:
    a set of Profiles with
        a user User
        a name String
        a profilePicture String
        a fieldsOfInterests FieldsOfInterests

actions:
    createProfile (user: User, name: String, profilePicture: String, 
                   fieldsOfInterests: FieldsOfInterests)
        requires
            no profile exists for user
        effect
            add (user, name, profilePicture, fieldsOfInterests) to Profiles

    updateName (user: User, newName: String)
        requires
            profile exists for user
        effect
            update name for user in Profiles

    updatePicture (user: User, newProfilePicture: String)
        requires
            profile exists for user
        effect
            update profilePicture for user in Profiles

    updateInterests (user: User, newFieldsOfInterests: FieldsOfInterests)
        requires
            profile exists for user
        effect
            update fieldsOfInterests for user in Profiles

    getProfile (user: User): (name, profilePicture, fieldsOfInterests)
        requires
            profile exists for user
        effect
            return the profile information for user
```

# response:

Here's the implementation for the `UserProfile` concept following the concept design principles and implementation guidelines:

# file: src/concepts/UserProfile/UserProfileConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
// No need for freshID here as the User ID directly serves as the _id for the profile document.

// Declare collection prefix, using the concept name
const PREFIX = "UserProfile" + ".";

// Generic types of this concept, treated as branded IDs for polymorphism
type User = ID;
type FieldsOfInterests = ID; // Assuming FieldsOfInterests is an ID to another concept or just a conceptual string ID

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
   *                fieldsOfInterests: FieldsOfInterests): Empty | {error: String}
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
  ): Promise<Empty | { error: string }> {
    // Check 'requires' condition: ensure no profile already exists for the given user
    const existingProfile = await this.profiles.findOne({ _id: user });
    if (existingProfile) {
      return { error: `Profile already exists for user: ${user}` };
    }

    // 'effects': Insert a new profile document into the collection
    const newProfile: ProfileDocument = {
      _id: user, // The user ID serves as the unique identifier for the profile
      name,
      profilePicture,
      fieldsOfInterests,
    };
    await this.profiles.insertOne(newProfile);
    return {}; // Return an empty object for success
  }

  /**
   * updateName (user: User, newName: String): Empty | {error: String}
   *
   * **requires**
   *     profile exists for user
   *
   * **effects**
   *     update name for user in Profiles
   */
  async updateName(
    { user, newName }: { user: User; newName: string },
  ): Promise<Empty | { error: string }> {
    // Check 'requires' condition: ensure a profile exists for the given user
    const existingProfile = await this.profiles.findOne({ _id: user });
    if (!existingProfile) {
      return { error: `No profile found for user: ${user}` };
    }

    // 'effects': Update the 'name' field for the specified user's profile
    await this.profiles.updateOne(
      { _id: user },
      { $set: { name: newName } },
    );
    return {}; // Return an empty object for success
  }

  /**
   * updatePicture (user: User, newProfilePicture: String): Empty | {error: String}
   *
   * **requires**
   *     profile exists for user
   *
   * **effects**
   *     update profilePicture for user in Profiles
   */
  async updatePicture(
    { user, newProfilePicture }: { user: User; newProfilePicture: string },
  ): Promise<Empty | { error: string }> {
    // Check 'requires' condition: ensure a profile exists for the given user
    const existingProfile = await this.profiles.findOne({ _id: user });
    if (!existingProfile) {
      return { error: `No profile found for user: ${user}` };
    }

    // 'effects': Update the 'profilePicture' field for the specified user's profile
    await this.profiles.updateOne(
      { _id: user },
      { $set: { profilePicture: newProfilePicture } },
    );
    return {}; // Return an empty object for success
  }

  /**
   * updateInterests (user: User, newFieldsOfInterests: FieldsOfInterests): Empty | {error: String}
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
  ): Promise<Empty | { error: string }> {
    // Check 'requires' condition: ensure a profile exists for the given user
    const existingProfile = await this.profiles.findOne({ _id: user });
    if (!existingProfile) {
      return { error: `No profile found for user: ${user}` };
    }

    // 'effects': Update the 'fieldsOfInterests' field for the specified user's profile
    await this.profiles.updateOne(
      { _id: user },
      { $set: { fieldsOfInterests: newFieldsOfInterests } },
    );
    return {}; // Return an empty object for success
  }

  /**
   * _getProfile (user: User): Array<{name: String, profilePicture: String, fieldsOfInterests: FieldsOfInterests}> | {error: String}
   *
   * **requires**
   *     profile exists for user
   *
   * **effects**
   *     return the profile information for user
   *
   * Note: Queries always return an array of dictionaries, even if only one result is expected.
   */
  async _getProfile(
    { user }: { user: User },
  ): Promise<
    Array<{
      name: string;
      profilePicture: string;
      fieldsOfInterests: FieldsOfInterests;
    }> | { error: string }
  > {
    // Check 'requires' condition: ensure a profile exists for the given user
    const profile = await this.profiles.findOne({ _id: user });
    if (!profile) {
      return { error: `No profile found for user: ${user}` };
    }

    // 'effects': Return the requested profile information as an array containing one dictionary
    return [{
      name: profile.name,
      profilePicture: profile.profilePicture,
      fieldsOfInterests: profile.fieldsOfInterests,
    }];
  }
}
```