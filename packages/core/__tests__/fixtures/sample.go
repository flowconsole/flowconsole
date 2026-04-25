package main

import . "github.com/flowconsole/flowconsole"

user := NewUser(&UserArgs{
    Name:        "user",
    Description: "Administrator user",
    Tags:        []string{"admin", "user"},
    Badge:       "gold",
})

app := NewReactApp(&ReactAppArgs{
    Name: "app",
})

api := NewRestApi(&RestApiArgs{
    Name: "api",
})

user.SendsRequest(app, "Load App")
app.Then(api)
