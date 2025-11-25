## UserProfile

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

### Note
- FieldsOfInterests Integration: Allowing users to enter and update their fieldsOfInterests is important because other concepts (like QueueSystem) depend on up-to-date FieldsOfInterests to give users relevant items in their daily queues. Keeping this in UserProfile makes it clear where the user can manage their preferences.
