## UI Flicker
`react-ddp` utilizes a queue for subscription `ready` messages to avoid the ugly flickering that happens when the authentication state changes. 

When first opening the app, the user is not logged in. The app may decide to immediately send an array of subscriptions, along with a login attempt. The subscriptions may depend on the state of the user. Ideally, we would prefer to avoid synchronous round trips to the server, so we don't want to wait to see if the user's login will succeed before we send our data subscriptions.

The problem is when we rely on the subscription's `ready` state to render view components. A subscription will be fired, and will come back ready before the user is logged in. Then, the user is logged in, and the subscription is rereun, or data is sent again, and another ready event is fired, but the UI just updates as if new data was sent -- not as if it were the initial batch. This is what causes UI flicker, a common problem in vanilla Meteor.
