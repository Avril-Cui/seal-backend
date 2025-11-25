---
timestamp: 'Tue Nov 25 2025 13:56:14 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_135614.435e1c41.md]]'
content_id: 68a8e08ad126a9857cbb788353f6fc200d779ec79d660ea113f323a2adae0414
---

# implement: QueueSystem

I want to update the QueueSystem implementation I have now based on my new spec. This is my current implementation:

```
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

This is my updated spec:

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
