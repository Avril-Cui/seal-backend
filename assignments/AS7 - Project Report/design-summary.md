# Design Summary

_Design summary: a succinct but thoughtful summary of the changes you made to your design since the original proposal in your functional design submission. Your mentoring meeting notes should help in reminding you of all the changes you made._

Since our original functional design submission, we made several significant changes to address user friction and enhance the experience:

**Chrome Extension Integration**: Our most substantial change was developing a Chrome extension to reduce friction in the user journey. Rather than requiring users to manually navigate to BuyBye while shopping, the extension serves as an alternative entry point that integrates directly with Amazon product pages. This allows users to pause items without leaving their shopping context, addressing the key user friction issue identified in early feedback.

**Backend Architecture**: We moved from frontend-only session management to backend-based sessioning, which required removing passwords from the UserProfile concept.

**Scope**: We narrowed our implementation to focus exclusively on Amazon rather than supporting multiple e-commerce platforms. This allowed us to implement the auto-scraping functionality that extracts product details directly from Amazon pages, eliminating manual data entry and streamlining the experience.

**Stats & AI Integration**: We expanded the Stats page beyond basic metrics to also include actual AI-generated insights, making the reflection aspect of our design more actionable and personalized.

**Visual Identity**: We added custom-drawn pig mascot illustrations throughout the app to make the experience more fun and engaging.

**Infrastructure**: We switched from Render to Deno for backend deployment to solve the cold start issues for better performance in user testing and final deployment.
