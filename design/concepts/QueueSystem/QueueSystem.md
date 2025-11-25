## QueueSystem
```
concept: QueueSystem [User]

purpose:
    Assign a daily queue of items to each user for community swiping.

principle:
    (1) Every user receives a daily queue containing items from other users' added items.
    (2) A queue contains items that the user does not own.
    (3) Items in a queue are chosen to be relevant to the user's interests when possible.

state:
    a set of Queues with
        an owner User
        an itemIdSet set of Strings  // contains unique ids identifying items
        a completedQueue Number
        a creationDate Date

actions:
    _getCompletedQueue (owner: User): (completedQueue: Number)
        requires
            queue $q$ exists with matching owner with the current date;
        effect
            return $q$.completedQueue

    generateDailyQueue (owner: User, itemIds: set of Strings): (queue: Queue)
        requires
            no queue exists with owner matching this user
        effect
            create a queue with (owner, itemIdSet = itemIds, completedQueue = 0, and creationDate = current date);

    incrementCompletedQueue (owner: User, itemId: String)
        requires
            exists a queue $q$ under this user with current date;
            itemId exists in $q$.itemIdSet;
        effect
            add one count to completedQueue;
            remove itemId from $q$.itemIdSet;
```

### Note

1. Separation of concerns: We deliberately separate QueueSystem and SwipeSystem because they represent two different responsibilities in the SwipeSense feature: - QueueSystem determines which items a user must swipe today. - SwipeSystem records what decision the user makes.
   This modular approach makes each concept independently testable and easier to maintain.

2. A queue ensures that swiping is equitable and participatory. Users must complete their assigned queues before receiving community feedback on their own items. This structure supports the fairness model described in our problem framing (i.e., balanced community participation). In particular, we maintain the `completedQueue` attribute under each queue to keep track of how many of the daily queue a user has completed. This allows:

   - Progress tracking (UI feedback).
   - Determining when the queue is finished.
   - Enforcing that users complete their daily queue before requesting feedback on their own items. In implementation, we will set a threshold (i.e., 10 queues per day) that a user must complete to receive feedbacks from other users.

3. Queues contain items from other users only. This prevents self-influence or score manipulation. It reinforces the integrity of community-based reflection.

4. Here, to keep our concept modular, we blackboxed the queue-generation algorithm in the `generateDailyQueue` action. When we actually implement this, we will incorporate users’ FieldsOfInterest when selecting items for their queue. This increases the quality of community judgments (people swipe on things they understand) while improving user engagement and system fairness.
