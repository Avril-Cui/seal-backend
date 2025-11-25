---
timestamp: 'Sun Nov 23 2025 13:00:28 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251123_130028.b1612879.md]]'
content_id: 024782c5c6dc3d4c5f65bfbf8155ebc5f9c5958f19238b4f0a24421d83ad5e3f
---

# prompt: Observe how tests were structured for the sample LikertSurvey concept here ([@testing](design/concepts/LikertSurvey/testing.md) and [@LikertSurveyConcept.test](/src/concepts/LikertSurvey/LikertSurveyConcept.test.ts)) and create a test suite for test-first programming that works with the Deno testing framework and covers a full trace that demonstrates how the principle of the concept is fulfilled by a sequence of actions. Ensure that no tests use or depend on ANY other concepts besides ItemCollection itself. Do not test any behavior that requires cross-concept interaction. Minimize imports to what is needed. When performing await testDb() (do NOT use getDb()); declare the results as const variables db and client on the first line of the test case, and set const ItemCollection = new ItemCollection(db);. Refer to previously written test cases for a similar concept as a very rough guideline.
