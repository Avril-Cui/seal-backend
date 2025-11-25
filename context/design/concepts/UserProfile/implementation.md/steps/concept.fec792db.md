---
timestamp: 'Sun Nov 23 2025 13:58:14 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251123_135814.c61f8125.md]]'
content_id: fec792db9d2f9c7a18fe87a471800a3452dc5c29264b328552c8a012378faf6e
---

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
