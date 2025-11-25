---
timestamp: 'Tue Nov 25 2025 12:36:38 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_123638.3eaafa45.md]]'
content_id: a1e5eebfca93138037f25d47a3bb4a7c3b5671c50f89e38bccf199041a0f7978
---

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
