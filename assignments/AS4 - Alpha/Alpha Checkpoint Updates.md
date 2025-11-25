# New version of the development plan explaining what progress you’ve made

# What remains to be done

# How your plans might have changed.

# Updates
After receiving feedbacks from Eagon for our concepts, we did the following adjustments on the concept spec:
1. Generic types is no longer shared now, but  entirely encapsulated within concepts. In particular, we moved Items state inside ItemCollection, because that is the concept where it is defined and modified/updated.
2. To better keep track of queues that are created for each day, we added a new state attribute under Queue, called creationDate, which is the data for which the queue is created.
3. In all itemSets, instead of storing items, we modify that into itemIdSet, where it purely store unique ids of items. In this way, we better maintain modularity and separation of concepts for our concepts, since now they won't need to know the internal structure of items anymore.
4. We separated UserAuth and UserProfile to achieve separation of concerns.