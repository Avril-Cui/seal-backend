# seal-backend
Team SEAL: Fuqi Cui, Lauren Yoo, Elaine Jiang, Stanley Zhao
1. [Assignment 1: Problem Framing](/assignments/AS1/problem_framing.md)
2. [Assignment 2: Functional Design](/assignments/AS2/functional_design.md)
3. [Assignment 3 (group critique)](/assignments/AS3/Avril.md)
4.  - [Updated concept design](/assignments/AS2/updated_functional_design.md)
    - [Alpha Updated Development Plan](/assignments/AS4%20-%20Alpha/Alpha%20Checkpoint%20Updates.md)

# Demo Alpha
[![Watch the video](https://img.youtube.com/vi/8QrR26eFPms/hqdefault.jpg)](https://www.youtube.com/watch?v=8QrR26eFPms)


# How to run this code base?
1. Create a `.env` file with:
  ```
  GEMINI_API_KEY=
  GEMINI_MODEL=gemini-2.5-flash
  GEMINI_CONFIG=./geminiConfig.json
  MONGODB_URL=
  DB_NAME=
   ```

2. Install Deno: https://deno.land/

3. Run `deno task concepts` to start the server

4. Run `deno test -A` to run the test cases
