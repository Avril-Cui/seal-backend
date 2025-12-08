# User 2 Test Summary
Before conducting this session, we deployed the app with realistic, prepopulated data for swipe and mocked an account that has items added and community feedback provided.

For User Test 2, we adjusted our protocol based on insights from Test 1: we explicitly described the app’s purpose in the beginning, and asked the participant to role-play as an impulsive buyer. This context-setting significantly improved comprehension of the reflection questions and the Stats page.

The participant overall reported that the experience felt “straightforward,” and she found the UI visually appealing and easy to understand. However, several areas still produced confusion, particularly around feature discoverability, naming clarity (i.e., our nav bar headers like SwipeSense), and interpretation of system-generated metrics (i.e., they misinterpreted some stats meaning, which is mentioned more in depth in later sections below).

The major issue our user in this testing found confused is that she couldn't understand the purpose of each feature when she first landed the page. Initially, she was confused about what “PauseCart” meant (she asked, “Wait, where is add? How do I do that?”). She could not locate the add-item button at first, and accidentally opened SwipeSense instead and said she “didn’t know what SwipeSense was." Once she found the Add Item button, she successfully copy–pasted an Amazon link and used auto-fetch. Reflection questions were also described as “making sense,” and the second item was added with much more confidence.

The second issue is with locating the chrome extension. Initially, she was unable to find the extension, and said “Where is it? I didn’t see anything here.” She noticed it after we repeated: "Use the Chrome Extension located at the bottom right of your screen."

The third issue is that she didn't discover the swipe gesture we implemented (i.e., users can drag and swipe the items), and relied exclusively on the buttons. This isn't a huge issue, but we can possibly add more instructions to show users this feature.

The fourth issue is that the Stats page was mostly intuitive, but ambiguous terminology created friction. She understood most of the stats correctly, however she thought rejection rate meant the percentage of items she rejected from her own cart (which we defined as the percentage of items other users rejected under her cart).

The user found the app intuitive after a short adjustment period and liked its visual clarity and simplicity. However, her early confusion around naming, navigation, the extension, and interpreting community-related features suggests that initial onboarding, terminology, and in-context guidance need to be strengthened for first-time users to easily grasp the platform’s purpose and functionality. So overall, the user liked the product, but thinks it would be better to have more instructions in the website.

# Flaws / Opportunities for Growth
## Terminology and Navigation Are Not Immediately Understandable
The user struggled to understand the purpose of features like PauseCart and SwipeSense when first landing on the homepage. She repeatedly asked where to add items, accidentally opened SwipeSense, and indicated she didn’t know what SwipeSense was.

### Cause
Feature names rely on internal metaphors that are not meaningful to first-time users. We came up with the names because we thought they are iconic and unique. The minimalist UI also provides no onboarding cues or contextual explanations, leaving users to infer functions based solely on unfamiliar terms.

### Solutions
- Add intuitive icons (e.g., cart icon, swipe icon) next to navigation labels.
- Provide first-time tooltips or a short guided walkthrough explaining core concepts.
- Consider renaming features to more explicit terms (e.g., “Saved Items” instead of PauseCart, “Peer Review” instead of SwipeSense).
- Add brief subtitles under each nav label (e.g., PauseCart – Your saved items to reconsider).

## Confusing Landing and Onboarding Experience
The landing experience is a little confusing: users see a set of features without understanding how they work together toward reducing impulsive purchases. No onboarding modal or homepage explanation ties the experience into a coherent narrative.

### Causes
- New users are not provided any description or tutorial about our product and are thus confused.

### Solutions
- Add inline helper text under section headers.
- Provide a “?” help icon in the nav bar that gives a quick breakdown of each feature.
- Introduce a lightweight “Getting Started” page for new accounts.


## Chrome Extension Is Difficult to Discover
The user was unable to locate the Chrome extension, even though it was visible on the page. She only found it after being told where to look.

### Cause
The extension button blends visually into busy Amazon product pages due to its size and color. Our minimalistic black-and-white theme also makes the logo hard to find.

### Solution
- Increase contrast and introduce a more distinctive, branded color for the extension button.
- Move the button closer to the “Add to Cart” area to align with user expectations.

##  Swipe Gesture Is Not Discoverable
While completing the SwipeSense queue, the user never discovered the drag/swipe gesture and relied solely on the buttons. She did not realize swiping was an intended primary interaction.

### Cause
The gesture affordance for swipe is entirely invisible. Without visual cues, users cannot infer that cards are draggable. The UI relies on prior familiarity with swipe-based interfaces, which cannot be assumed.

### Solutions
- Place subtle arrow indicators or a “Swipe to decide” text cue on the card.
- Add a tutorial overlay the first time a user enters SwipeSense.

## Some Stats Page Terminology Is Ambiguous
Although the participant interpreted most metrics correctly, she misunderstood “Rejection Rate,” assuming it meant the percentage of items she rejected from her own cart rather than the percentage of items other users rejected from hers.

### Cause
Metric names are overly concise and lack sufficient context or help text. The absence of explanations forces users to infer meanings, and similar-sounding terms (rejecting an item vs. being rejected by others) lead to ambiguity.

### Solutions
- Add explanatory tooltips or sub-labels beneath each metric (e.g., “% of your items rejected by the community”).
- Consider renaming metrics (“Community Rejection Rate,” “Your Skip Rate”).
- Provide an info icon that opens a brief glossary of terms.
