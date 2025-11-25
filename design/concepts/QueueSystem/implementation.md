[@concept-design-overview](../../background/concept-design-overview.md)


[@concept-specifications](../../background/concept-specifications.md)


[@implementing-concepts](../../background/implementing-concepts.md)


# implement: QueueSystem


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

   - Progress tracking (UI feedback).
   - Determining when the queue is finished.
   - Enforcing that users complete their daily queue before requesting feedback on their own items. In implementation, we will set a threshold (i.e., 10 queues per day) that a user must complete to receive feedbacks from other users.

3. Queues contain items from other users only. This prevents self-influence or score manipulation. It reinforces the integrity of community-based reflection.

4. Here, to keep our concept modular, we blackboxed the queue-generation algorithm in the `generateDailyQueue` action. When we actually implement this, we will incorporate users’ FieldsOfInterest when selecting items for their queue. This increases the quality of community judgments (people swipe on things they understand) while improving user engagement and system fairness.


# response:

```typescript
// file: src/concepts/QueueSystem/QueueSystemConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * concept: QueueSystem [User, Item]
 *
 * purpose:
 *     Assign a daily queue of items to each user for community swiping.
 */

// Declare collection prefix, use concept name
const PREFIX = "QueueSystem" + ".";

// Generic types of this concept
type User = ID;
type Item = ID;
type Queue = ID; // The ID for a specific queue instance

/**
 * State: a set of Queues with
 *     an owner User
 *     an itemSet a set of Items
 *     a completedQueue Number
 */
interface QueueDocument {
  _id: Queue; // ID of the queue itself
  owner: User;
  itemSet: Item[]; // An array of Item IDs
  completedQueue: number;
}

export default class QueueSystemConcept {
  queues: Collection<QueueDocument>;

  constructor(private readonly db: Db) {
    this.queues = this.db.collection(PREFIX + "queues");
  }

  /**
   * _getCompletedQueue (owner: User): (completedQueue: Number)
   *
   * **requires**
   *     queue $q$ exists with matching owner
   *
   * **effects**
   *     return $q$.completedQueue
   */
  async _getCompletedQueue(
    { owner }: { owner: User },
  ): Promise<{ completedQueue: number }[] | { error: string }> {
    const queue = await this.queues.findOne({ owner });
    if (!queue) {
      return { error: `No queue found for user ${owner}` };
    }
    return [{ completedQueue: queue.completedQueue }];
  }

  /**
   * generateDailyQueue (owner: User): (queue: Queue)
   *
   * **requires**
   *     no queue exists with owner matching this user
   *
   * **effects**
   *     select a set of items that are not owned by this user;
   *     create a queue with (owner, set of items, and completedQueue = 0);
   *     returns the newly created queue's ID
   *
   * Note: For demonstration, item selection is simplified. In a real scenario,
   * this would involve querying other concepts (e.g., Item, UserProfile)
   * to get relevant items not owned by the user.
   */
  async generateDailyQueue(
    { owner }: { owner: User },
  ): Promise<{ queue: Queue } | { error: string }> {
    // Check precondition: no queue exists for this owner
    const existingQueue = await this.queues.findOne({ owner });
    if (existingQueue) {
      return { error: `A queue already exists for user ${owner}` };
    }

    // Simulate selecting items not owned by this user and relevant to interests
    // In a real system, this would be a complex query across multiple concepts.
    // For now, generate a fixed set of dummy items.
    const numberOfItemsInQueue = 10;
    const itemSet: Item[] = [];
    for (let i = 1; i <= numberOfItemsInQueue; i++) {
      // Ensure generated item IDs are distinct from the owner ID for this simplified example
      itemSet.push(`item:${freshID()}` as Item);
    }

    const newQueueId = freshID();
    const newQueue: QueueDocument = {
      _id: newQueueId,
      owner,
      itemSet,
      completedQueue: 0,
    };

    await this.queues.insertOne(newQueue);
    return { queue: newQueueId };
  }

  /**
   * incrementCompletedQueue (owner: User, item: Item)
   *
   * **requires**
   *     exists a queue $q$ under this user;
   *     item exists in $q$.itemSet;
   *
   * **effects**
   *     add one count to completedQueue;
   *     remove item from $q$.itemSet;
   */
  async incrementCompletedQueue(
    { owner, item }: { owner: User; item: Item },
  ): Promise<Empty | { error: string }> {
    // Find the queue for the owner
    const queue = await this.queues.findOne({ owner });
    if (!queue) {
      return { error: `No queue found for user ${owner}` };
    }

    // Check precondition: item exists in the queue's itemSet
    const itemIndex = queue.itemSet.findIndex((id) => id === item);
    if (itemIndex === -1) {
      return { error: `Item ${item} not found in queue for user ${owner}` };
    }

    // Update effects: increment completedQueue and remove item from itemSet
    const updatedItemSet = [
      ...queue.itemSet.slice(0, itemIndex),
      ...queue.itemSet.slice(itemIndex + 1),
    ];

    await this.queues.updateOne(
      { _id: queue._id },
      {
        $set: {
          itemSet: updatedItemSet,
          completedQueue: queue.completedQueue + 1,
        },
      },
    );

    return {};
  }
}
```
# response:

