# User 1 Test Summary
Before the testing, we populated a diverse range of data for SwipeSense to give our user a realistic impression of what it would be like when they are actually using our app for swiping. We also created a sample account with existing items in the shopping chart and community feedback, so the user can mock using the app after other users provided them with community feedback.

The user was most confused about the swiping feature because once you register, you go through interests and then you immediately get to the swipe feature with no explanation of what it is or how to use it. When they came to the task of swiping on the queue, the user was basing their decision of ‘skip it’ vs. ‘worth it’ based on whether they knew the user (e.g., they said “I don’t know Bob, so I guess I’ll skip it”) or if they themselves personally needed/wanted the item (e.g., ”I could use a coffee maker”). It didn’t seem clear that these were items other participants had in their wishlist. They also didn’t read the reasoning, want/need, future-approval at all.

Using the chrome extension was the second most confusing feature. The user had difficulty finding it on the page as it sits in the corner and is white/black/hard to distinguish from a crowded Amazon product page. They also had to refresh the page on PauseCart to see the new item updated, which was confusing at first when they didn’t see it on PauseCart.  

Adding items to PauseCart via the ‘Add item’ button on the main page via copying and pasting the Amazon product link was tedious but easy to understand. There was a bit of confusion on how to remove an item because the ‘x’ only appears once the user hovers over it and first attempts to remove it by clicking the item card. Answers to buy the item were very short, which might indicate very very little reflection. When editing the reflection, the user was confused where to see the updated reflection and only saw it once they clicked the item card, suggesting we could display their answers on the item card. 

During the debrief, the user summarized the app as basically “something to save the things you want to buy” and initially thought the purpose was to “buy stuff”, perhaps our name for our app could be more clear or we could have a slogan to  clarify its purpose. It generally didn’t seem clear that the app was for specifically stopping ‘impulsive purchasing”, suggesting the app could be better integrated into the natural flow of buying something. This issue could have been aided if at the beginning of the study we clarified the app’s purpose and somewhat role-played the participant as an ‘impulsive buyer’, but at the same time this feedback from someone with no background about what the app does at all is immensely helpful. In our second user testing, we conducted it differently by stating the purpose of our app in the beginning, and explicitly asked the user to pretend they are an impulsive buyer.

The numbers on the Stats pages was also quite confusing such as the "Rejection Rate" and what exactly "Amount Saved Meant". This likely follows from the confusion of the app's purpose, features overall.

# Flaws/Opportunities for Growth

1. Confusion on how to use the app and chrome extension and its general purpose.  
  - **Cause:**  This might have more to do because we didn’t explain/preface the app’s purpose beforehand better in this user test.  
    - **Main App:** UI perhaps too minimalist, lacks instructions/explanations. We plan to add more description, or even a new-user tutorial.
    - **Extension:** Sits at corner of screen, not prominent in colors. We plan to give the logo a color to make it more obvious.
  - **Solutions**  
    - Main App: More instructions on purpose and how to use the app would be helpful. Maybe a mini tutorial at start or instructions throughout.  
    - Extension: Make it more prominent, perhaps right next to add to cart or brighter in color etc.. Maybe make this the main entry point instead of the app to fit better into the flow of someone ‘impulsively buying’ something. The extension is also more convenient than copy-pasting the Amazon link.

2. Confusion over community swiping aspect: What the skip it/worth it buttons means, how to navigate, how to decide upon another person’s item if they don’t know the person  etc.  
  - **Cause:**  This has more to do with gaining critical mass and stimulating this critical mass via prepopulating the database. Another reason is similar to flaws one, which is our website is too minimalistic and lacks some instructions. 
  - **Solution:**  
    - More instructions explicitly saying something along the lines of “Evaluate these items on if the person, not YOU, should buy it based on their provided reasoning.  
    - Maybe add a bio per person, so the person swiping has more context about the person they're swiping on  
    - Add communities like reddit where users are shown items they cared/know a lot about. We can possibly connect the queue generation algorithm with the field of interest data.  
    - Replace Swipe it and Worth it with something more explicit like “DO NOT BUY”, “BUY”  

3. General Minor UI Improvements/Navigation  
    - **Cause:**  The desire for a minimalist UI style in our visual design. 
    - **Solutions:**  
        - Display reflection question answers on items cards themselves, maybe remove product description and replace with reflection because description is directly scrapped from amazon and can be very verbose  
        - Make the “X” delete available in PauseCart  not just when hovering  

4. Minimal reflection for reflection questions inputted by the user. This could hinder the goal of thoughtful self-reflection to reduce impulsive purchase.  
  - **Cause:**  No min word limit, challenging questions. Users find it tedious to write an answer to all items they added.
  - **Solutions**  
    - Add min word limit  
    - Maybe AI feature that checks it explanation is valid/comprehensive enough could be overkill and add latency though