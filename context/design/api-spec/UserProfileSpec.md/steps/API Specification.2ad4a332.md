---
timestamp: 'Tue Nov 25 2025 14:52:37 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_145237.e1e1b73e.md]]'
content_id: 2ad4a3325b7fae732eacbc9e44eab4d024becabf3f20fe753a75ee7895f2c677
---

# API Specification: UserProfile

**Purpose:** Manages user profiles that are registered under BuyBye.

***

## API Endpoints

### POST /api/UserProfile/createUser

**Description:** Creates a new user profile with the provided details upon signing up for BuyBye.

**Requirements:**

* no user exists with matching uid;

**Effects:**

* create a new user with (uid, name, email, password, profilePicture, reward = 0, fieldOfInterests);
* return user;

**Request Body:**

```json
{
  "uid": "string",
  "name": "string",
  "email": "string",
  "password": "string",
  "profilePicture": "string",
  "fieldOfInterests": [
    {
      "field": "string"
    }
  ]
}
```

**Success Response Body (Action):**

```json
{
  "user": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserProfile/updateProfileName

**Description:** Updates the name associated with an existing user profile.

**Requirements:**

* user exists;

**Effects:**

* update the corresponding attribute (name) of this user

**Request Body:**

```json
{
  "user": "string",
  "newName": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserProfile/updateProfilePicture

**Description:** Updates the profile picture URL for an existing user.

**Requirements:**

* user exists;

**Effects:**

* update the corresponding attribute (profilePicture) of this user

**Request Body:**

```json
{
  "user": "string",
  "newProfilePicture": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserProfile/updatePassword

**Description:** Changes the password for an existing user profile.

**Requirements:**

* user exists;

**Effects:**

* update the corresponding attribute (password) of this user

**Request Body:**

```json
{
  "user": "string",
  "newPassword": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserProfile/updateInterests

**Description:** Replaces the entire set of field of interests for an existing user.

**Requirements:**

* user exists;

**Effects:**

* update this user's set of FieldsOfInterests to newFieldsOfInterests;

**Request Body:**

```json
{
  "user": "string",
  "newFieldsOfInterests": [
    {
      "field": "string"
    }
  ]
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
