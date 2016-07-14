## New Instantiation Options
These options are not included in the raw ddp client. They were added in `react-ddp`.

`debug`: If `debug` is `true`, all inbound and outbound messages sent over the socket will be logged on the client.
Later, this may have more functionality. For example, we may specify that we only want to show `"added"` messages, or maybe we want to ignore background `"ping"` and `"pong"` messages.

`appId`: `appId` is a unique identifier for your application. This may not be necessary in react-native's `AsyncStorage`. Nevertheless, all stored keys are prepended with your `appId` anyways...
