## ItemCollection

```
concept: ItemCollection [User, AmazonAPI, GeminiLLM]

purpose:
    Tracks and manage items that users are considering for purchase.

principles:
    (1) Users maintain a personal wishlist of items they intend to purchase.
    (2) Adding an item requires users to enter reflection questions.
    (3) Item metadata is fetched from AmazonAPI to reduce user effort.
    (4) Users can update attributes of the items they own.
    (5) Users can mark items as purchased after they made the purchase.

state:
    a set of Items with
      an owner User
      an itemId String  // this is a unique id
      an itemName String
      a description String
      a photo String
      a price Number
      a reason String  // user's reflection on why they want to purchase
      a isNeed String  // user's reflection on is this a "need" or "want"
      a isFutureApprove String  // user's reflection on whether their future-self will like this purchase
      an wasPurchased Flag
      an PurchasedTime Number  [Optional]

    a set of WishLists with
        an owner User
        an itemIdSet set of Strings  // this contains unique ids identifying items

    an amazonAPI AmazonAPI
    a geminiLLM GeminiLLM

actions:
    _getTenRandomItems (owner: User): (itemIdSet: set of Strings)
      requires
        exists at least ten items with owner not matching the given owner
      effect
        select by random ten items with owner not matching the given owner;
        return an itemIdSet containing the itemIds of these ten items; 

    addItem (owner: User, url: String, reason: String, isNeed: String, isFutureApprove: String): (item: Item)
        effect
            fetch item's itemName, description, photo, and price with amazonAPI;
            generate a new unique itemId;
            create a new item with (owner, itemId, itemName, description, photo, price, reason, isNeed, isFutureApprove, wasPurchased=False);
            add item to the itemIdSet under the wishlist with owner matching this user;
            return the added item;

    removeItem (owner: User, itemId: String)
        requires
            exists a wishlist $w$ with this user;
            itemId exists in $w$'s itemIdSet;
        effect
            remove itemId from the itemIdSet;

    updateItemName (owner: User, item: Item, itemName: String)
    updateDescription (owner: User, item: Item, description: String)
    updatePhoto (owner: User, item: Item, photo: String)
    updatePrice (owner: User, item: Item, Price: Number)
    updateReason (owner: User, item: Item, Reason: String)
    updateIsNeed (owner: User, item: Item, isNeed: String)
    updateIsFutureApprove (owner: User, item: Item, isFutureApprove: String)
        requires
            exists a wishlist $w$ with this user;
            item.itemId exists in $w$'s itemIdSet;
        effect
            update the given attribute of this item;

    setPurchased (owner: User, item: Item)
        requires
            exists a wishlist $w$ with this user;
            item $i$.itemId exists in $w$'s itemIdSet;
            $i$.wasPurchased is False;
        effect
            set $i$.wasPurchased as True;
            set $i$.PurchasedTime as the current time of this action;
    
    async getAIInsight (owner: User, item: Item, context_prompt: String): (llm_response: String)
        requires
            exists a wishlist $w$ with this user;
            item.itemId exists in $w$'s itemIdSet;
        effect
            send context_prompt with the item to geminiLLM (including all the attributes under item, like description, price, reason, isNeed, isFutureApprove) and ask for insights on whether geminiLLM thinks this purchase is impulsive;
            return the llm_response;

```

### Note
- `Items` are the goods/products users hope to purchase.
- When an user adds an item to their wish list, we hope to prompt them through a list of thoughtful, self-reflection questions so that they can take a moment to reflect on whether their intended purchase is impulsive or not. We record the answers to these questions under Item:
  - `reason`: This records the answer for "Why do you want this item?"
  - `isNeed`: This records the answer for "Is this a need or a want?" We want the users to self-reflect on whether a purchase is a genuine necessity or it's an unnecessary want.
  - `isFutureApprove`: This records the answer for "Would Future-You approve?" This prompts the user to consider the consequences of the purchase, helping them to self-identify whether the intended purchase is impulsive or not.
- We abstract AmazonAPI because its implementation (scraping, affiliate API, or proxy) is outside this concept's scope.
- We assume metadata is fetched at the moment of adding the item for accuracy and simplicity.
- getAIInsight is an async, AI-augmented action that we designed to address the lack of critical mass issue. When we don't have enough users to provide swipe states, users can gather some insights on whether the AI thinks a purchase is impulsive or not.
