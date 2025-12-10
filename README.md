# seal-backend

Team SEAL: Fuqi Cui, Lauren Yoo, Elaine Jiang, Stanley Zhao

1. [Assignment 1: Problem Framing](/assignments/AS1/problem_framing.md)
2. [Assignment 2: Functional Design](/assignments/AS2/functional_design.md)
3. [Assignment 3 (group critique)](/assignments/AS3/fuqi.md)
4. Alpha Checkpoint:
   - [Updated concept design](/assignments/AS2/updated_functional_design.md)
   - [Alpha Updated Development Plan](/assignments/AS4%20-%20Alpha/Alpha%20Checkpoint%20Updates.md)
   - #### Demo Alpha [![Watch the video](https://img.youtube.com/vi/8QrR26eFPms/hqdefault.jpg)](https://www.youtube.com/watch?v=8QrR26eFPms)
5. Beta Checkpoint:
   - [Beta Updated Development Plan](/assignments/AS5%20-%20Beta/Beta%20Checkpoint%20Updates.md)
   - #### Demo Beta [![Watch the video](https://img.youtube.com/vi/V81xnXmcCdQ/hqdefault.jpg)](https://www.youtube.com/watch?v=V81xnXmcCdQ)
6. User Testing
   - [User Testing Tasks and Instructions](/assignments/AS6%20-%20User%20Testing/instruction.md)
   - [User 1 Test Summary](/assignments/AS6%20-%20User%20Testing/user_test_1.md)
   - [User 2 Test Summary](/assignments/AS6%20-%20User%20Testing/user_test_2.md)
7. Project report
   - [Fuqi Reflection](/assignments/AS7%20-%20Project%20Report/reflection-fuqi.md)
   - [Elaine Reflection](/assignments/AS7%20-%20Project%20Report/reflection-elaine.md)
   - [Lauren Reflection](/assignments/AS7%20-%20Project%20Report/reflection-lauren.md)
   - [Stanley Reflection](/assignments/AS7%20-%20Project%20Report/reflection-stanley.md)
   - [Design Summary](/assignments/AS7%20-%20Project%20Report/design-summary.md)
      - #### Final Video [![Watch the video](https://img.youtube.com/vi/hiea2Mxxhz4/hqdefault.jpg)](https://www.youtube.com/watch?v=hiea2Mxxhz4)


# How to run this backend code base?

1. Create a `.env` file with:

```
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_CONFIG=./geminiConfig.json
MONGODB_URL=
DB_NAME=
```

2. Install Deno: https://deno.land/

3. Run `deno run build; deno run start` to start the new server

# How to run tests?

1. Run `deno test -A` to run the concept/sync cases

2. To seed MongoDB with mock data for manual testing:

   1. To the .env file edit `DB_NAME` field with name of desired test datebase name.

   ```
   GEMINI_API_KEY=
   GEMINI_MODEL=gemini-2.5-flash
   GEMINI_CONFIG=./geminiConfig.json
   MONGODB_URL=
   DB_NAME=
   ```

   2. Restart backend

   3. Run `deno run -A src/utils/seed.ts` to seed. Follow console output to test actions in different user accounts

   4. Optionally, Run `deno run -A src/utils/clear_db.ts` to reset `DB_NAME` in MongoDB
