## UserAuth

```
concept: UserAuth

purpose:
    Manages users that are registered under BuyBye.

principles:
    (1) Each user account is uniquely identified by an email address.
    (2) Users can log in with valid credentials.

state:
    a set of RegisteredUsers with
      a uid String  // unique id
      an email String
      a password String

    signup (email: String, password: String): (user: RegisteredUsers)
        requires
            no registered user exists with matching email
        effect
            create a new registered user $u$ with (email, password);
            add user $u$ to RegisteredUsers;
            return user $u$;

    login (email: String, password: String): (user: RegisteredUsers)
        requires
            exists a user in RegisteredUsers with matching (email, password)
        effect
            return this user;
```