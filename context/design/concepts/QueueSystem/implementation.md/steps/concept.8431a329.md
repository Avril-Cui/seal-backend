---
timestamp: 'Sun Nov 23 2025 14:15:07 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251123_141507.1441791f.md]]'
content_id: 8431a329185e0f9bd9fcec8520823f599d27bf762fb24b73e0dce1445d7e325c
---

# concept: QueueSystem

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
    _getCompletedQueue (owner: User): (completedQueue: Number)
        requires
            queue $q$ exists with matching owner
        effect
            return $q$.completedQueue

    generateDailyQueue (owner: User): (queue: Queue)
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

1. Separation of concerns: We deliberately separate QueueSystem and SwipeSystem because they represent two different responsibilities in the SwipeSense feature: - QueueSystem determines which items a user must swipe today. - SwipeSystem records what decision the user makes.
   This modular approach makes each concept independently testable and easier to maintain.

2. A queue ensures that swiping is equitable and participatory. Users must complete their assigned queues before receiving community feedback on their own items. This structure supports the fairness model described in our problem framing (i.e., balanced community participation). In particular, we maintain the `completedQueue` attribute under each queue to keep track of how many of the daily queue a user has completed. This allows:

   * Progress tracking (UI feedback).
   * Determining when the queue is finished.
   * Enforcing that users complete their daily queue before requesting feedback on their own items. In implementation, we will set a threshold (i.e., 10 queues per day) that a user must complete to receive feedbacks from other users.

3. Queues contain items from other users only. This prevents self-influence or score manipulation. It reinforces the integrity of community-based reflection.

4. Here, to keep our concept modular, we blackboxed the queue-generation algorithm in the `generateDailyQueue` action. When we actually implement this, we will incorporate users’ FieldsOfInterest when selecting items for their queue. This increases the quality of community judgments (people swipe on things they understand) while improving user engagement and system fairness.
