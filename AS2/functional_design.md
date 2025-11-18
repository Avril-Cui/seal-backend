# Table of Contents

- [Problem Framing](#problem-framing)
- [Features](#features)
- [Concept Design](#concept-design)
- [Syncs](#syncs)
- [User Journey](#user-journey)
- [UI Sketches](#ui-sketches)
- [Visual Design Study](#visual-design-study)
- [Design Summary](#design-summary)
- [Development Plan](#development-plan)

# Problem Framing
Buybye aims at solving issue related to online shopping from three angles:

1. Impulsive-Buying: When shopping online, people often make impulsive purchases on small accessories, limited-time deals, or “recommended for you” (essentially, products they never intended to buy if they actually think about them carefully). Although these items may bring brief satisfaction, they’re often unnecessary, and there’s no simple way to pause or reflect before completing the purchase. Distinguishing between what we need and what we merely want can be difficult in the moment. 

2. Uninformed Decision-Making: At the moment of purchase, shoppers rarely stop to consider whether an item is a true need or simply a want. Shoppers make decisions based on impulse, emotion, or fear of missing out rather than rational evaluation. There is no mechanism that encourages reflection or provides suggestions about the necessity of the purchase. As a result, shoppers lack awareness and accountability at the decision point, leading to regret, clutter, and overspending.

3. Cost-Tracking: Existing expense-tracking tools or online shopping are also too manual or tedious, leading many shoppers to skip logging their spending entirely after they make a purchase. As a result, shoppers lose awareness of how much of their money goes toward unplanned or impulsive buys.

We chose the impulsive buying problem because impulse shopping is a common and relatable behavior that affects nearly everyone who shops online. Modern e-commerce platforms are intentionally designed to encourage instant decisions through flash sales, one-click checkout, and personalized recommendations, leaving little space for reflection. Addressing this problem offers both practical impact and technical feasibility. It can be tackled without requiring large-scale work from the users or complex infrastructure, while still providing meaningful value to everyday consumers.

# Features
We can up with some possible features to address the problem.

## PauseCart: Reflective shopping cart
One possible feature is a reflective shopping cart, where users can paste links to items they’re considering purchasing or import their existing carts from platforms like Amazon and other major e-commerce sites. Users also log the reason why they hope to purchase this item.

## SwipeSense: Community Swipe Preference
Another possible feature is Community Swipe Preferences, a social layer that introduces accountability and shared feedback into the shopping process. Users can upload or import items they’re considering buying and have them appear in an A/B comparison format for other users to swipe on, indicating which item other users think is more worthwhile or necessary. Alternatively, they can swipe to decide whether they think the purchase is worth it. In turn, users must complete their own daily swiping queue before their items become eligible for community feedback, ensuring balanced participation. This creates a fun, peer-based system that helps shoppers gain perspective on their decisions, see how others evaluate similar purchases, and develop more intentional buying habits through collective reflection.

## WalletWhisper: Personal Cost Tracking of Items Bought
A third feature is Personal Cost Tracking. Once an item is bought by the user, it’s added to a personal dashboard that tracks spending patterns and displays insights such as, “You purchased something that 40% of users predicted you might regret.” After receiving the item, users can log their thoughts or feedback: whether they’re satisfied, neutral, or regret the purchase. Over time, the system learns from these reflections, identifying trends in impulsive behavior and flagging similar future items as potential impulse buys. This feedback loop encourages mindful shopping habits by combining personal data, community insight, and behavioral learning.

# Concept design
Concept design: A collection of concept specifications and syncs; include a note section in each concept and sync to explain any non-obvious design decisions or to mark issues to be resolved.

## Generic Types
```
a set of Items with
	an itemName String
	a description String
	a photo String
    a price Number
    a reason String  // user's reflection on why they want to purchase
    a isNeed String  // user's reflection on is this a "need" or "want"
    a isFutureApprove String  // user's reflection on whether their future-self will like this purchase
    an wasPurchased Flag
    an PurchasedTime Number  (optional)

a set of Users with
	a name String
	an email String
	a password String
	a profilePicture String
    a reward Number
    a set of FieldsOfInterests

a set of FieldsOfInterests
    a field String
```
### Notes
Here we define the generic types for our systems that are used across different concepts. We will clarify some of the attribute definition below:
- `Items` are the goods/products users hope to purchase.
- When an user adds an item to their wish list, we hope to prompt them through a list of thoughtful, self-reflection questions so that they can take a moment to reflect on whether their intended purchase is impulsive or not. We record the answers to these questions under Item:
    - `reason`: This records the answer for "Why do you want this item?"
    - `isNeed`: This records the answer for "Is this a need or a want?" We want the users to self-reflect on whether a purchase is a genuine necessity or it's an unnecessary want.
    - `isFutureApprove`: This records the answer for "Would Future-You approve?" This prompts the user to consider the consequences of the purchase, helping them to self-identify whether the intended purchase is impulsive or not.
- For each user, we record their sets of FieldOfInterests, which are fields of purchases they are interested in (for example: Fashion, Electronics, Books, Sport, etc.). We will use this information in our queue system to give users queues that they are more related to.

## ItemCollection
```
concept: ItemCollection [User, Item, AmazonAPI]

purpose:
    Tracks and manage items that users are considering for purchase.

principles:
    (1) Users maintain a personal wishlist of items they intend to purchase.
    (2) Adding an item requires users to enter reflection questions.
    (3) Item metadata is fetched from AmazonAPI to reduce user effort.
    (4) Users can update attributes of the items they own. 
    (5) Users can mark items as purchased after they made the purchase.

state:
    a set of WishLists with
        an owner User
        an itemSet set of Items
    
    an amazonAPI AmazonAPI

actions:
    addItem (owner: User, url: String, reason: String, isNeed: String, isFutureApprove: String): (item: Item)
        effect
            fetch item's itemName, description, photo, and price with amazonAPI;
            create a new item with (itemName, description, photo, price, reason, isNeed, isFutureAprove, wasPurchased=False);
            add item to the itemSet under the wishlist with owner matching this user;
            return the added item;
        
    removeItem (owner: User, item: Item)
        requires
            exists a wishlist $w$ with this user;
            item exists in $w$'s itemSet;
        effect
            remove item from the itemSet;
    
    updateItemName (owner: User, item: Item, itemName: String)
    updateDescription (owner: User, item: Item, description: String)
    updatePhoto (owner: User, item: Item, photo: String)
    updatePrice (owner: User, item: Item, Price: Number)
    updateReason (owner: User, item: Item, Reason: String)
    updateIsNeed (owner: User, item: Item, isNeed: String)
    updateIsFutureApprove (owner: User, item: Item, isFutureApprove: String)
        requires
            exists a wishlist $w$ with this user;
            item exists in $w$'s itemSet;
        effect
            update the given attribute of this item;

    setPurchased (owner: User, item: Item)
        requires
            exists a wishlist $w$ with this user;
            item $i$ exists in $w$'s itemSet;
            $i$.wasPurchased is False;
        effect
            set $i$.wasPurchased as True;
            set $i$.PurchasedTime as the current time of this action;
```
### Note
- We abstract AmazonAPI because its implementation (scraping, affiliate API, or proxy) is outside this concept's scope.
- We assume metadata is fetched at the moment of adding the item for accuracy and simplicity.
- We use three generic types here: User, Item, and AmazonAPI. User and Item are defined in the section above.

## QueueSystem
```
concept: QueueSystem [User, Item]

purpose:
    Assign a daily queue of items to each user for community swiping.

principle:
    (1) Every user receives a daily queue containing items from other users' added items.
    (2) A queue contains items that the user does not own.
    (3) Items in a queue are chosen to be relevant to the user's interests when possible.

state:
    a set of Queues with
        an owner User
        an itemSet a set of Items
        a completedQueue Number

actions:
    generateDailyQueue (owner: User)
        requires
            no queue exists with owner matching this user
        effect
            select a set of items that are not owned by this user;
            create a queue with (owner, set of items, and completedQueue = 0);
    
    incrementCompletedQueue (owner: User, item: Item)
        requires
            exists a queue $q$ under this user;
            item exists in $q$.itemSet;
        effect
            add one count to completedQueue;
            remove item from $q$.itemSet;
```
### Note
1. Separation of concerns: We deliberately separate QueueSystem and SwipeSystem because they represent two different responsibilities in the SwipeSense feature:
    - QueueSystem determines which items a user must swipe today.
    - SwipeSystem records what decision the user makes.
This modular approach makes each concept independently testable and easier to maintain.

2. A queue ensures that swiping is equitable and participatory. Users must complete their assigned queues before receiving community feedback on their own items. This structure supports the fairness model described in our problem framing (i.e., balanced community participation). In particular, we maintain the `completedQueue` attribute under each queue to keep track of how many of the daily queue a user has completed. This allows:
    - Progress tracking (UI feedback).
    - Determining when the queue is finished.
    - Enforcing that users complete their daily queue before requesting feedback on their own items. In implementation, we will set a threshold (i.e., 10 queues per day) that a user must complete to receive feedbacks from other users.

3. Queues contain items from other users only. This prevents self-influence or score manipulation. It reinforces the integrity of community-based reflection.

4. Here, to keep our concept modular, we blackboxed the queue-generation algorithm in the `generateDailyQueue` action. When we actually implement this, we will incorporate users’ FieldsOfInterest when selecting items for their queue. This increases the quality of community judgments (people swipe on things they understand) while improving user engagement and system fairness.


## SwipeSystem
```
concept: SwipeSystem [User, Item]

purpose:
    Record swipe decisions made by users about items in their queues and make aggregated community feedback available.

principle:
    (1) Each swipe represents one user's judgment on one item.
    (2) A user may decide to swipe "approve" or "disapprove" on an item once per queue. The decision is recorded.
    (3) Swipe decisions accumulate over time to produce simple, interpretable statistics for community feedback (e.g., the percentage of users who recommend buying an item).

state:
    a set of Swipes with
        an owner User
        an item Item
        a decision Flag [Optional]  // user's swipe decision (i.e., worth buying or not)
    
action
    recordSwipe (owner: User, item: Item, decision: Flag)
        requires
            no swipe exists with matching (owner, item)
        effect
            create a new swipe with (owner, item, decision)
    
    updateDecision (owner: User, item: Item, newDecision: Flag)
        requires
            swipe exists with matching (owner, item)
        effect
            update this swipe's decision to newDecision


recordSwipe(user: User, item: Item, decision: Flag)
        requires
            // this user has not already swiped this item
            there is no swipe s in Swipes with
                s.owner = user and s.item = item;
        effect
            create a new swipe s with
                s.owner := user;
                s.item := item;
                s.decision := decision;
            add s to Swipes;
```

### Note
- We model one decision per (user, item) to keep aggregation simple and avoid vote manipulation.
- The decision flag should be a binary Flag. It represents the user's insight on whether an item is worth buying or not.

## UserAuth
```
concept: UserAuth [User, FieldsOfInterests]

purpose:
    Manages users that are registered under BuyBye.

principle:
    (1) Each user account is uniquely identified by an email address.
    (2) Users can create an account by signing up with basic information.
    (3) Users can log in with valid credentials.
    (4) Logged-in users can edit their own profile information.

state:
    a set of RegisteredUsers with
        a user User

    a set of LoggedInUsers with
        a user User
    
    signup (name: String, email: String, password: String, profilePicture: String, fieldsOfInterests: FieldsOfInterests): (user: User)
        requires
            no registered user exists with matching email
        effect
            create a new user $u$ with (name, email, password, profilePicture, reward = 0, fieldsOfInterests);
            add user $u$ to RegisteredUsers;
            return user $u$;
    
    login (email: String, password: String): (user: User)
        requires
            exists a user in RegisteredUsers with matching (email, password)
        effect
            add this user to LoggedInUsers;
            return this user;
    
    logout (user: User)
        requires
            user exists in LoggedInUsers;
        effect
            remove this user from LoggedInUsers;
    
    updateProfileName (user: User, newName: String)
    updateProfilePicture (user: User, newProfilePicture: String)
    updatePassword (user: User, newPassword: String)
        requires
            exists user in LoggedInUsers
            exists user in RegisteredUsers
        effect
            update the corresponding attribute of this user

    updateInterests (user: User, newFieldsOfInterests: FieldsOfInterests)
        requires
            exists user in LoggedInUsers
            exists user in RegisteredUsers
        effect
            update this user's set of FieldsOfInterests to newFieldsOfInterests;
```

### Note
1. RegisteredUsers vs LoggedInUsers:
    - RegisteredUsers represents all accounts in the system.
    - LoggedInUsers represents the subset of users who have an active session.
This separation keeps authentication concerns (who is logged in) distinct from account existence.

2. Email as Unique Identifier: We enforce uniqueness of email in the `signup` action, since email is a natural key for accounts.

3. Editing Profiles Requires Being Logged In: All profile updates require the user to be in LoggedInUsers. This matches real-world expectations and avoids unauthorized modifications.

4. Password Handling: We treat password as a simple String here because this is a concept-level specification, not an implementation. In a real system, this would be a hashed value, but that detail is intentionally abstracted away for this assignment.

5. FieldsOfInterests Integration: Allowing users to enter and update their fieldsOfInterests is important because other concepts (like QueueSystem) depend on up-to-date FieldsOfInterests to give users relevant items in their daily queues. Keeping this in UserAuth makes it clear where the user can manage their preferences. FieldsOfInterests is another generic type we defined in the very beginning.



# Syncs

## 1. Authentication + session syncs
These connect HTTP auth endpoints to UserAuth and Sessioning.

### sync Signup
```
when
    Requesting.request (
        path: "/auth/signup",
        name,
        email,
        password,
        profilePicture,
        fieldsOfInterests
    ) : (request)

then
    UserAuth.signup (name, email, password, profilePicture, fieldsOfInterests) : (user)
    Sessioning.createSession (user) : (session)
    Requesting.respond (request, session, user)
```

### sync Login
```
when
    Requesting.request (path: "/auth/login", email, password) : (request)

then
    UserAuth.login (email, password) : (user)
    Sessioning.createSession (user) : (session)
    Requesting.respond (request, session, user)
```

### sync Logout
```
when
    Requesting.request (path: "/auth/logout", session) : (request)

where
    in Sessioning: user of session is user

then
    Sessioning.deleteSession (session)
    UserAuth.logout (user)
    Requesting.respond (request, status: "logged_out")
```

## 2. PauseCart / ItemCollection syncs
These syncs ensure that only the authenticated user can manage items in their own wishlist (PauseCart).

### sync AddItemToWishlist
```
when
    Requesting.request (path: "/items/add", session, url, reason, isNeed, isFutureApprove) : (request)

where
    in Sessioning: user of session is owner

then
    ItemCollection.addItem (owner, url, reason, isNeed, isFutureApprove) : (item)
    Requesting.respond (request, item)
```

### sync UpdateItemReflection
```
when
    Requesting.request (path: "/items/updateReflection", session, item, reason, isNeed, isFutureApprove) : (request)

where
    in Sessioning: user of session is owner
    in ItemCollection: item belongs to wishlist of owner

then
    ItemCollection.updateReason (owner, item, reason)
    ItemCollection.updateIsNeed (owner, item, isNeed)
    ItemCollection.updateIsFutureApprove (owner, item, isFutureApprove)
    Requesting.respond (request, status: "updated")
```

### sync RemoveItemFromWishlist
```
when
    Requesting.request (path: "/items/remove", session, item) : (request)

where
    in Sessioning: user of session is owner
    in ItemCollection: item belongs to wishlist of owner

then
    ItemCollection.removeItem (owner, item)
    Requesting.respond (request, status: "removed")
```

### sync MarkItemPurchased
```
when
    Requesting.request (path: "/items/setPurchased", session, item) : (request)

where
    in Sessioning: user of session is owner
    in ItemCollection: item belongs to wishlist of owner

then
    ItemCollection.setPurchased (owner, item)
    Requesting.respond (request, status: "purchased")
```

## 3. QueueSystem syncs (generate & progress)
These implement the SwipeSense daily queue and tie it to the logged-in user.

### sync GenerateDailyQueueRequest
```
when
    Requesting.request (path: "/queue/generate", session) : (request)

where
    in Sessioning: user of session is owner

then
    QueueSystem.generateDailyQueue (owner) : (queue)
    Requesting.respond (request, queue)
```

### sync SwipeFromQueue
```
when
    Requesting.request (path: "/swipes/record", session, item, decision) : (request)

where
    in Sessioning: user of session is owner
    in QueueSystem: item is in current queue for owner

then
    SwipeSystem.recordSwipe (owner, item, decision)
    QueueSystem.incrementCompletedQueue (owner, item)
    Requesting.respond (request, status: "recorded")
```

**Note:** For SwipeFromQueue, when a user swipes on an item that comes from their current queue, we want to both record the swipe and bump the completedQueue counter in QueueSystem.

## 4. SwipeSystem syncs (viewing community feedback)
These expose aggregated SwipeSense data only after the user has participated enough in other people's queues.

### sync GetItemCommunityStats
```
when
    Requesting.request (path: "/items/communityStats", session, item) : (request)

where
    in Sessioning: user of session is owner
    in ItemCollection: item belongs to wishlist of owner
    in QueueSystem: queue for owner has completedQueue >= 10
    in SwipeSystem: swipes is set of all swipes s where s.item = item
    stats is {
        "total": count of swipes,
        "approvals": count of swipes with decision = True
    }

then
    Requesting.respond (request, stats)
```



# User Journey

## "Bez Jeffos and the Midnight Cart"

Under stress, Bez Jeffos shops with the same energy some corporations bring to mass layoffs: sudden, sweeping decisions powered by the belief that whatever happens next… well, that's tomorrow's problem. The night before a major exam, he's sitting in his dorm room, mentally tired and looking for distraction. As he scrolls through Amazon "just for a minute," his cart quietly fills with a 24-pack of Sugar-Free Red Bull, a CASABREWS espresso machine, a tortilla baby burrito swaddle blanket, and an inflatable roast turkey costume. He recognizes the pattern: stress leading to increasingly questionable items, and knows that by morning he'll be wondering why he ever thought he needed any of this.

### Step 1 - PauseCart Interrupts the Spiral

Instead of checking out, Bez remembers he installed ByeBuy.

He switches tabs. He already has an account on the app, so he just logins. On the wishlist page of the app, he copies the first Amazon link and pastes it into the "Add Item" field. This triggers:
```
→ AddItemToWishlist → ItemCollection.addItem
```

ByeBuy automatically pulls the item's photo, price, and details, then prompts him with three short reflection questions before it can be added to his PauseCart:

- "Why do you want this item?"
- "Is this a need or a want?"
- "Would Future-You approve?"

He answers each as he goes:

**Red Bull 24-pack**
- Why? "I need energy and this is cheaper in bulk."
- Need or want? "Want."
- Future approval? "Probably not."

Satisfied (but already questioning himself), Bez pastes the link for the next item:

**Espresso machine**
- Why? "Could save money long-term (hopefully)."
- Need or want? "Want."
- Future approval? "Maybe."

Then the third link:

**Tortilla baby burrito blanket**
- Why? "It's funny."
- Need or want? "Want."
- Future approval? "No :("

Finally, he pastes the link for the inflatable turkey costume. He starts typing an explanation, stops halfway through, realizes there is no explanation that would make sense, and silently adds it anyway.

One link at a time, the reflection prompts him to slow down, interrupting the late-night emotional momentum that led him here. After adding the last item, he closes the app and decides his future self—hopefully more awake—will deal with everything in the morning.

### Step 2 - SwipeSense Adds Community Perspective

The next day, Bez opens ByeBuy again. The app generates his daily swipe queue, created via:
```
→ GenerateQueueRequest → QueueSystem.generateDailyQueue
```

This time he's shown items that other students are debating:

- A gallon-sized cold brew dispenser someone claims is "cheaper than therapy."
- A portable mini projector captioned, "for movie nights I will definitely host."
- A set of color-coded cable organizers from someone trying to "finally get my life together."
- A cat-shaped mug warmer posted by a user who admits, "I don't own a cat. I just like the vibe."

As he swipes through the queue, Bez notices he evaluates other people's picks far more critically than he does his own. Apparently it's easier to be objective when the impulse belongs to someone else. BuyBye records each choice using:
```
→ SwipeFromQueue → SwipeSystem.recordSwipe + QueueSystem.addCompletedQueue
```

Seeing such a wide range of equally impulsive items makes his own late-night picks feel far less embarrassing and reminds him that he's not the only one who shops under stress.

### Step 3 - Reviewing Community Insight

Once he completes his queue, ByeBuy unlocks community feedback on his own PauseCart.

- The Red Bull 24-pack gets cautious disapproval, with most users suggesting sleep might be a better strategy.
- The espresso machine receives mixed feedback in the comments: split between "practical investment" and "wishful thinking."
- The tortilla blanket gets low approval but earns remarks about its comedic value.
- The turkey costume receives near-unanimous rejection, politely urging him to reconsider.

The feedback feels gentle rather than judgmental, giving Bez a fresh perspective he didn't have the night before.

### Step 4 - A More Intentional, Informed Decision

Bez removes the items that no longer make sense in daylight:
```
→ ItemCollection.removeItem
```

He ends up keeping just one—the tortilla blanket—because even now, it still brings him joy and isn't a risky purchase.

He marks it as purchased:
```
→ ItemCollection.setPurchased
```

Two weeks later, ByeBuy's mascot Pig bounces onto his stats page with a celebratory squeal:

> "You avoided $257 of impulsive spending this month! That's serious willpower, Bez."

The message surprises him; he hadn't realized how often late-night stress had been guiding his decisions.

### Outcome

By the end of the journey, Bez feels more in control of his online shopping habits. ByeBuy doesn't stop him from buying things he enjoys. Instead, it gives him space to reflect, gather perspective, and make decisions he won't regret. Through PauseCart, SwipeSense, and simple follow-up insights, Bez learns to navigate stress-driven shopping with more clarity and far fewer turkey costumes.