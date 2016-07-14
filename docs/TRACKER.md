## Tracker
Tracker is a pretty well designed, lightweight library for running functions reactively. In a nutshell, When some value changes, all functions which depend on that value will get rerun.

Example:
```
//in your client code
import Tracker from "trackr";
let comp = Tracker.autorun(()=>{
  let status = Client.status() //this contains a reactive dependency
                               //the .status method implements a call to an instance of 
                               //`ReactiveVar`. (e.g. myReactiveVar.get())
  console.log(status)
})
```
`comp` is a "computation" which will rerun the arrow function whenever the state of any contained `ReactiveVar`s changes. So, when the status starts out as `"connecting"`, we'll see that in our logs, since we log it in the computation. When it goes from `"connecting"` to `"connected"`, this function will be rerun, and will see the new status logged. A computation can be stopped at any time with its `stop` method.

In react-native, you can call `this.setState` in a reactive computation to reactively update your view.

`Tracker` is a lightweight utility that was designed by the Meteor core team. Apparently, it's a decent way to handle reactivity. `ReactiveVar` is ~10 lines of code.