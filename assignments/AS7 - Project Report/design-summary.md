# Design Summary

_Design summary: a succinct but thoughtful summary of the changes you made to your design since the original proposal in your functional design submission. Your mentoring meeting notes should help in reminding you of all the changes you made._

Since our original functional design submission, we made several targeted revisions to reduce user friction, strengthen technical foundations, and refine the overall user experience. Many of these changes emerged from mentoring feedback, user testing insights, our classmates' feedback on your problem framing, and limitations we recognized during implementation.

## Concept Design
In our initial functional design, several of our concepts lacked proper modularity. We had introduced broad, generic entities such as User and Item that bundled together responsibilities that should have been separated. Additionally, UserAuth and UserProfile were intertwined in ways that made their boundaries unclear and created unwanted dependencies. During our mentoring meetings, Eagon highlighted these issues and helped us see where conceptual leakage was occurring. Based on this feedback, we restructured our concepts to achieve clean modularity: authentication was isolated from profile data and each concept was revised so that it had a single, well-defined purpose. These refinements not only aligned our design with best practices but also made the later implementation phase far more manageable.

## Chrome Extension Integration
The most significant evolution in our design was the introduction of a Chrome extension. Early feedback from our classmate revealed that asking users to interrupt their shopping flow to manually open ByeBuy created substantial friction. To address this, we did two changes. First, we designed the extension as a seamless entry point that sits directly on Amazon product pages. With one click, users can save an item to Byebuy without leaving their browsing context. This redesign not only reduced cognitive load but also aligned the product more closely with real shopping behavior. Two, we simplified the add product interface on the Byebuy website itself, and users can simply add an item by pasting the Amazon link.

## Backend Architecture: Session Management
We shifted from frontend-only session management to a more secure and maintainable backend-based session system.  Although a behind-the-scenes change, it substantially improved reliability, state consistency across devices, and long-term extensibility.

## Scope Refinement and MVP
Initially, our concept envisioned supporting multiple e-commerce platforms. During implementation, we narrowed the scope to focus exclusively on Amazon. This strategic reduction allowed us to implement high-quality auto-scraping for product metadata, eliminating manual data entry and creating a smoother, more polished user experience. By deepening support for one platform instead of spreading thin across many, we delivered a more functional and robust MVP. In the future, if we want, we can easily scale the project to support different e-commerce platforms.

## Stats and AI Integration
The Stats page evolved from a simple metrics dashboard into a more meaningful reflection tool. We incorporated AI-generated insights that analyze user patterns and provide personalized suggestions or observations. This enhancement made the page feel less like a static readout and more like a guided reflection experience consistent with our goal of encouraging intentional decision-making. The AI insight features also help us solve the lack of critical mass issue. Even if an user didn't receive any community feedback yet, they can still use our AI insights to understand their purchase behavior.

## Visual Identity
To create a more cohesive and delightful user experience, we added a custom-drawn pig mascot that appears across key pages. This visual identity element helped the app feel less transactional and more friendly, aligning with our objective of reducing guilt-based framing and promoting supportive reflection.

## Onboarding Experience
Our user testing revealed that new users often felt uncertain about what certain features, especially the swiping and PauseCart features, were intended to do. To address this, we redesigned our onboarding and in-app guidance experience.

We added instructional toggles that appear contextually on each page, allowing new users to reveal explanations and micro-tutorials. We also introduced Q&A sections tailored to each major feature, giving users a quick way to understand the purpose of a page and how to interact with it. These additions made the product feel more approachable and self-explanatory, especially for first-time users.

## Field of Interest
Right now, we store the user’s field of interest as part of the UserProfile concept. However, in our product, we chose not to incorporate this field into the daily queue generation algorithm. After evaluating task priorities and the overall impact on user experience, we determined that customizing the queue based on interests would be a nice-to-have enhancement (as it makes swiping more fun) rather than a core requirement, because it doesn't really add too much value to our goal of "preventing impulsive purchase." So, instead, we decide to focus on delivering a stable, low-friction workflow and ensuring that the swiping and reflection features functioned smoothly.