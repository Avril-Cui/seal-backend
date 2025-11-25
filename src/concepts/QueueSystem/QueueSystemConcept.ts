import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * concept: QueueSystem [User]
 *
 * purpose:
 *     Assign a daily queue of items to each user for community swiping.
 *
 * principle:
 *     (1) Every user receives a daily queue containing items from other users' added items.
 *     (2) A queue contains items that the user does not own.
 *     (3) Items in a queue are chosen to be relevant to the user's interests when possible.
 */

// Declare collection prefix, use concept name
const PREFIX = "QueueSystem" + ".";

// Generic types of this concept
type User = ID;
type Queue = ID; // The ID for a specific queue instance

/**
 * Helper function to get the start of the current day in UTC for consistent date comparisons.
 * This ensures that "current date" logic is consistent regardless of where the server is running.
 */
function getTodayStart(): Date {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Set to start of day in UTC
  return today;
}

/**
 * State: a set of Queues with
 *     an owner User
 *     an itemIdSet set of Strings  // contains unique ids identifying items
 *     a completedQueue Number
 *     a creationDate Date
 */
interface QueueDocument {
  _id: Queue; // ID of the queue itself
  owner: User;
  itemIdSet: string[]; // Changed from Item[] to string[] as per spec
  completedQueue: number;
  creationDate: Date; // Added as per spec
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
   *     queue $q$ exists with matching owner with the current date;
   *
   * **effects**
   *     return $q$.completedQueue
   */
  async _getCompletedQueue(
    { owner }: { owner: User },
  ): Promise<{ completedQueue: number }[] | { error: string }> {
    const today = getTodayStart();
    // Precondition check: queue exists with matching owner AND current date
    const queue = await this.queues.findOne({ owner, creationDate: today });
    if (!queue) {
      return { error: `No queue found for user ${owner} for today` };
    }
    // Effect: return the completedQueue count
    return [{ completedQueue: queue.completedQueue }];
  }

  /**
   * generateDailyQueue (owner: User, itemIds: set of Strings): (queue: Queue)
   *
   * **requires**
   *     no queue exists with owner matching this user for the current date
   *
   * **effects**
   *     create a queue with (owner, itemIdSet = itemIds, completedQueue = 0, and creationDate = current date);
   *     returns the newly created queue's ID
   */
  async generateDailyQueue(
    { owner, itemIds }: { owner: User; itemIds: string[] }, // `itemIds` argument added as per spec
  ): Promise<{ queue: Queue } | { error: string }> {
    const today = getTodayStart();
    // Precondition check: no queue exists for this owner for the current date
    const existingQueue = await this.queues.findOne({
      owner,
      creationDate: today,
    });
    if (existingQueue) {
      return { error: `A queue already exists for user ${owner} for today` };
    }

    const newQueueId = freshID();
    const newQueue: QueueDocument = {
      _id: newQueueId,
      owner,
      itemIdSet: itemIds, // Use provided `itemIds` from the argument
      completedQueue: 0,
      creationDate: today, // Set `creationDate` to the current date
    };

    // Effect: create and insert the new queue
    await this.queues.insertOne(newQueue);
    return { queue: newQueueId };
  }

  /**
   * incrementCompletedQueue (owner: User, itemId: String)
   *
   * **requires**
   *     exists a queue $q$ under this user with current date;
   *     itemId exists in $q$.itemIdSet;
   *
   * **effects**
   *     add one count to completedQueue;
   *     remove itemId from $q$.itemIdSet;
   */
  async incrementCompletedQueue(
    { owner, itemId }: { owner: User; itemId: string }, // `itemId` parameter changed to `itemId: string`
  ): Promise<Empty | { error: string }> {
    const today = getTodayStart();
    // Precondition check: Find the queue for the owner for the current date
    const queue = await this.queues.findOne({ owner, creationDate: today });
    if (!queue) {
      return { error: `No queue found for user ${owner} for today` };
    }

    // Precondition check: `itemId` exists in the queue's `itemIdSet`
    const itemIndex = queue.itemIdSet.findIndex((id) => id === itemId);
    if (itemIndex === -1) {
      return {
        error: `Item ${itemId} not found in queue for user ${owner} for today`,
      };
    }

    // Effects: increment `completedQueue` and remove `itemId` from `itemIdSet`
    const updatedItemIdSet = [
      ...queue.itemIdSet.slice(0, itemIndex),
      ...queue.itemIdSet.slice(itemIndex + 1),
    ];

    await this.queues.updateOne(
      { _id: queue._id },
      {
        $set: {
          itemIdSet: updatedItemIdSet, // Update `itemIdSet`
          completedQueue: queue.completedQueue + 1, // Increment `completedQueue`
        },
      },
    );

    return {};
  }
}
