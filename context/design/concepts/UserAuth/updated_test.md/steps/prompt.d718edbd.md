---
timestamp: 'Tue Nov 25 2025 12:54:24 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_125424.e78ae98b.md]]'
content_id: d718edbd6fbcf74559b7af47d5d198269c0b0d8dcf8f16fb552ac7d14437a7c1
---

# prompt: Observe how tests were structured for the sample LikertSurvey concept here ([@testing](design/concepts/LikertSurvey/testing.md) and [@LikertSurveyConcept.test](/src/concepts/LikertSurvey/LikertSurveyConcept.test.ts)) and create a test suite for test-first programming that works with the Deno testing framework and covers a full trace that demonstrates how the principle of the concept is fulfilled by a sequence of actions. Ensure that no tests use or depend on ANY other concepts besides <concept name> itself. Do not test any behavior that requires cross-concept interaction. Minimize imports to what is needed. When performing await testDb() (do NOT use getDb()); declare the results as const variables db and client on the first line of the test case, and set const <concept instance name> = new <concept class name>(db);. Refer to previously written test cases for a similar concept as a very rough guideline.
