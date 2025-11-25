## SwipeSystem

```
concept: SwipeSystem [User]

purpose:
    Record swipe decisions made by users about items in their queues and make aggregated community feedback available.

principle:
    (1) Each swipe represents one user's judgment on one item.
    (2) A user may decide to swipe "approve" or "disapprove" on an item once per queue. The decision is recorded.
    (3) Swipe decisions accumulate over time to produce simple, interpretable statistics for community feedback (e.g., the percentage of users who recommend buying an item).

state:
    a set of Swipes with
        an owner User
        an itemId String  // this is a unique Id
        a decision Flag [Optional]  // user's swipe decision (i.e., worth buying or not)
        a comment String [Optional] // user's short reason or remark (e.g., "this is a great/bad product, super useful/less!" )
action
    _getSwipeStats (owner: User, itemId: String): (total: Number, approval: Number)
        requires
            exists at least one swipe with matching (owner, itemId)
        effect
            let positive := number of swipes with matching (owner, itemId) and decision equals "Buy"
            let negative := number of swipes with matching (owner, itemId) and decision equals "Don't Buy"
            return total = positive + negative and approval = positive
    
    _getSwipeComments (owner: User, itemId: String): (comments: set of String)
        requires
            exists at least one swipe with matching (owner, itemId) and comment is not None
        effect
            return all comments under swipes that has matching (owner, itemId) and comment is not None

    recordSwipe (owner: User, itemId: String, decision: Flag, comment: String)
        requires
            no swipe exists with matching (owner, itemId)
        effect
            create a new swipe with (owner, itemId, decision, comment)

    updateDecision (owner: User, itemId: String, newDecision: Flag, newComment: String)
        requires
            swipe exists with matching (owner, itemId)
        effect
            update this swipe's decision to newDecision
            update this swipe's comment to newComment;

```

### Note

- We model one decision per (user, itemId) to keep aggregation simple and avoid vote manipulation.
- The decision flag should be a binary Flag. It represents the user's insight on whether an item is worth buying or not.
