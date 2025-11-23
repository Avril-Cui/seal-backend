---
timestamp: 'Sun Nov 23 2025 13:00:28 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251123_130028.b1612879.md]]'
content_id: 73485dd6f5cc3a4b511251d32d10a2054fc6d4e657b173c12db033caed87237f
---

# concept: ItemCollection

```

concept: ItemCollection [User, Item, AmazonAPI, GeminiLLM]

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
    a geminiLLM GeminiLLM

actions:
    addItem (owner: User, url: String, reason: String, isNeed: String, isFutureApprove: String): (item: Item)
        effect
            fetch item's itemName, description, photo, and price with amazonAPI;
            create a new item with (itemName, description, photo, price, reason, isNeed, isFutureApprove, wasPurchased=False);
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
    
    async getAIInsight (owner: User, item: Item): (llm_response: String)
        requires
            exists a wishlist $w$ with this user;
            item exists in $w$'s itemSet;
        effect
            send item to geminiLLM (including all the attributes under item, like description, price, reason, isNeed, isFutureApprove) and ask for insights on whether geminiLLM thinks this purchase is impulsive;
            return the llm_response;


```

### Note

* We abstract AmazonAPI because its implementation (scraping, affiliate API, or proxy) is outside this concept's scope.
* We assume metadata is fetched at the moment of adding the item for accuracy and simplicity.
* We use three generic types here: User, Item, and AmazonAPI. User and Item are defined in the section above.
* getAIInsight is an async, AI-augmented action that we designed to address the lack of critical mass issue. When we don't have enough users to provide swipe states, users can gather some insights on whether the AI thinks a purchase is impulsive or not.

response:
