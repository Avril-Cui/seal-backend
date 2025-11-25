---
timestamp: 'Sun Nov 23 2025 13:47:39 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251123_134739.0592bb4b.md]]'
content_id: e1e514d71ca7ae26787d6efefd2c4220e69db016ee184d9a5ac19601a6ee48f1
---

# concept: PasswordAuth

```
concept: PasswordAuth [Party]

purpose:
    Authenticate users via email and password credentials.

principle:
    A party can register with credentials (email, password), then authenticate 
    by providing matching credentials to establish a session.

state:
    a set of RegisteredParties with
        a party Party
        an email String
        a password String

    a set of AuthenticatedParties with
        a party Party

actions:
    register (party: Party, email: String, password: String)
        requires
            no registered party exists with matching email
        effect
            add (party, email, password) to RegisteredParties

    authenticate (email: String, password: String): (party: Party)
        requires
            exists (party, email, password) in RegisteredParties
        effect
            add party to AuthenticatedParties
            return party

    endSession (party: Party)
        requires
            party exists in AuthenticatedParties
        effect
            remove party from AuthenticatedParties

    updatePassword (party: Party, newPassword: String)
        requires
            party exists in AuthenticatedParties
            party exists in RegisteredParties
        effect
            update password for party in RegisteredParties
```
