# `react-ddp`
A lightweight ddp-client for react-native. Expanded on work by mondora.

## Purpose
**The goal is not to implement a full-blown Meteor client in react-native.** This library is meant to include minimally necessary set of functions which are implemented on traditional Meteor clients, but to say **absolutely nothing** about how your data is handled. You may use redux, minimongo, or a custom object to store data; whatever you want. I tried to couple this library with my own store until I realized two things:

1. Creating a reactive front-end data store is non-trivial.
2. React-native users have mixed opinions about data storage, best to not force them.

Thus, this ddp client does not implement a cache of any sort. You will get the traditional `added`, `changed`, and `removed` messages (compliant with the DDP version 1 spec) which you will use to populate a (potentially reactive) data-store yourself.

With `react-ddp` and `minimongo-cache`, we can achieve a front-end on react-native which is eerily similar to a traditional Meteor front end, with little work on your end, whilst being modular. Don't like minimongo? Feel free to use Redux or something. The coupling between the data-store and `react-ddp` is as easy as writing custom `added`, `changed`, and `remove` callbacks. For minimongo, this is trivial because the ddp messages are already in "mongo" form. An example below will show you how easy it is to get started with Pete Hunt's `minimongo-cache` and `react-ddp`.

## Implementation
### Reactive Client Metadata
`ReactiveVar` (npm install reactive-var) is used sparingly in `react-ddp` to provide a reactive handle to user state:
```
Client.loggingIn() //true or false
Client.userId() // "someUserId" or null
Client.status() // "connecting", "connected", "reconnecting", "disconnected"
```
While `Tracker` (npm install trackr) is not an explicit dependency of `react-ddp`, you will need `Tracker` in your application in order to make use of the reactive nature of `ReactiveVar`. [Read more about how to use Tracker with react-native](./docs/TRACKER.md)

### Main methods
#### Instantiation
In the top level of your react-native app, create an instance of the react-ddp client:
```
//connect.js

import DDP from "react-ddp";
export const client = new DDP({
  SocketConstructor: WebSocket,
  endpoint:"ws://localhost:3000/websocket",
  //endpoint: "wss://mysecurewebsite.example.com/websocket",
  debug:false,
  autoConnect: true,
  autoReconnect: true,
  appId: "myAwesomeAppSDFSLjfwqijdkf",
  reconnectInterval: 10000
})
```
[Read more about `debug` and `appId` here](./docs/OPTS.md)
See mondora's ddp.js docs for more information on things like `endpoint`, `autoReconnect`, etc.

#### Regarding Encryption, Authentication & Passwords
As of now, when you call a method via `client.call(...)`, any key in the `data` field of `opts` which is one of: `"password"`, `"oldPassword"`, `"newPassword"` will be encrypted before it is sent to the server. This is used in the `login` method, as well as custom sign up/ password changing methods.

When the `react-ddp` client is instantiated, the socket opens and sends a connect message to server automatically (thanks to mondora's raw ddp client). `react-ddp` will attempt to (re)log the user in automatically once a connection has been successfully (re)established. This is achieved by using react-native's `AsyncStorage`. [Read about authentication state flicker and how it's fixed with react-ddp](./docs/FLICKER.md)

#### Methods

```
import { myValidationFunction } from "./validation.js";
import { client } from "./connect.js";
```
#### client.login
```
...
client.login({
  check: myValidationFunction, //takes args (data, currentUserId)
  data: {
    user: {
      email: "hello@example.com"
    },
    password: "terriblePassword" //not sent in plain text over the wire (encrypted)
  }
}, optionalCallback)

//optionalCallback is provided (error, result) arguments.
```
#### client.logout
```
...
client.logout(optionalCallback)
//optionalCallback is provided (error) arguments.
```

#### client.subscribe
The syntax differs slightly from vanilla Meteor. Supports caching.
```
...
client.subscribe({
  cache: false, //default
  check: myValidationFunction, //takes args (data, currentUserId)
  data: {
    location: [42.2345,-72.68583],
    topic: "Trees"
  },
  name: "treesAroundMe"
}, optionalCallback)

//optionalCallback is provided with (error, sub) arguments.
//sub is of the form {id: "someSubId"}
```
Subscribes to the `treesAroundMe` subscription with a single argument (`data`). If `cache` is true, then this subscription will not get overridden by a new subscription of the same name. For example (with `cache` === false`) if we perform the same subscription with `data.location` equal to `[40, -72]`, then the client will unsub from the previous subscription, and will subscribe to the new one. By default, a call to the exact same subscription (same `name`, same `data`) will not result in a re-run of the subscription.

#### client.unsubscribe
```
...
client.unsubscribe({
  id: "theSubIdIfKnown", //if you know this, you don't need to enter name or data.
  name: "nameOfSub", //if you don't have the id, but know the name.
  data: {
    some:"data"
  }
}, optionalCallback)

//optionalCallback is provided with (error, sub) arguments.
//sub is of the form {id: "someSubId"}
```
If you provide the `id`, the client will try to unsub from that exact `id`. If you provide a sub `name`, you should provide the `data` passed to the sub as well so that you can differentiate between possibly cached subscriptions.

#### client.call 
The syntax differs slightly from vanilla Meteor.
```
client.call({
  name:"someMethod",
  data: {
    userInput1: "I love potatoes",
    userInput2: "I love tomatoes"
  },
  check: myValiationFunction //takes args (data, currentUserId)
}, optionalCallback)

//optionalCallback is provided (error, result) arguments.
```

## Using minimongo-cache

Using this library with minimongo-cache is relatively easy because of how DDP messages are structured.
On the client:
```
//database.js
import minimongo from "minimongo-cache";
import { client } from "./connect.js";

process.nextTick = setImmediate; //react-native polyfill
const db = new minimongo();

//initialize collections
const collections = ['posts','users','messages','trees','animals'];
collections.forEach(function(coll){
  db.addCollection(coll)
})

client.on('added', function(data){
  if (!db[data.collection]){
    db.addCollection(data.collection);
  }
  db[data.collection].upsert({_id: data.id, ...data.fields})
})

client.on('changed', function(data){
  db[data.collection].upsert({_id: data.id, ...data.fields});
})

client.on('removed', function(data){
  db[data.collection].remove({_id:data.id});
})

export { db }; //use db.posts.find(...), db.posts.findOne(...), etc. as in minimongo-cache
```
`minimongo-cache` makes it easy to get reactivity into react-native:
```
...
import { db } from "./database.js";
export default class MyComponent extends Component {
  constructor(props){
    super(props);
    this.state = {posts:[]}
  }
  componentWillMount(){
    this.observer = db.observe(()=>{
      return db.posts.find({},{fields:{name:1,body:1}})
    })
    this.observer.subscribe((posts)=>{
      //this function will run whenever the result set "posts" changes
      //for example, due to your incoming DDP messages!
      this.setState({posts:posts})
    })
  }
  componentWillUnmount(){
    this.observer.dispose();
  }
  render(){
    ...
  }
}
```