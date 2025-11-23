---
timestamp: 'Sun Nov 23 2025 02:28:01 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251123_022801.9c2cd7e3.md]]'
content_id: fb3d00bb7a2e05cfaacd0e849b61b5df7ca9fb412b92f07c44cdce50bd3b2738
---

# concept: SwipeSystem

```
concept: SwipeSystem

purpose:
    Record swipe decisions made by users about items in their queues and make aggregated community feedback available.

principle:
    (1) Each swipe represents one user's judgment on one item.
    (2) A user may decide to swipe "approve" or "disapprove" on an item once per queue. The decision is recorded.
    (3) Swipe decisions accumulate over time to produce simple, interpretable statistics for community feedback (e.g., the percentage of users who recommend buying an item).

state:
    a set of Swipes with
        an UserId String
        an ItemId String
        a decision Flag [Optional]  // user's swipe decision (i.e., worth buying or not)
        a comment String [Optional] // user's short reason or remark (e.g., "this is a great/bad product, super useful/less!")
action
    _getSwipeStats (ownerUserId: String, itemId: String): (total: Number, approval: Number)
        requires
            exists at least one swipe with matching (ownerUserId, itemId)
        effect
            let positive := number of swipes with matching (ownerUserId, itemId) and decision equals "Buy"
            let negative := number of swipes with matching (ownerUserId, itemId) and decision equals "Don't Buy"
            return total = positive + negative and approval = positive

    _getSwipeComments (ownerUserId: String, itemId: String): (comments: set of String)
        requires
            exists at least one swipe with matching (ownerUserId, itemId) and comment is not None
        effect
            return all comments under swipes that has matching (ownerUserId, itemId) and comment is not None

    recordSwipe (ownerUserId: String, itemId: String, decision: Flag, comment: String)
        requires
            no swipe exists with matching (ownerUserId, itemId)
        effect
            create a new swipe with (ownerUserId, itemId, decision, comment)

    updateDecision (ownerUserId: String, itemId: String, newDecision: Flag, newComment: String)
        requires
            swipe exists with matching (ownerUserId, itemId)
        effect
            update this swipe's decision to newDecision
            update this swipe's comment to newComment;
```
