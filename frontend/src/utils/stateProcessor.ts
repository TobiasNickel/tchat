import { ignore } from './utils'

// we want to allow the organization to provide a stateProcessing definition in yaml format.
// the state can be an entity from our system, an attribute, object, system, etc.

// this module is inspired by the finity js library from npm.
// it defines a stateMachine, allow the definition of rules, such as
// when in state A and receive event EA then go to other state B

// but instead of defining the state machine in code, we want to allow the organization to define it in yaml format.
// An interesting feature is the definition of async processes.
// using yaml we could allow similar features, but offering commands with results.
// a command can be like a function, but also can execute some http request, or other async process.
// the result of the command can be used to decide the next state.

// the organization can make simple definitions such as comparing a field,
// or more complex definitions such as using related Data and doing validations with those items.
// for security purpose we can hold have the user define that logic with lua functions. That have their own limited isolated scope.

// the yaml definition could be provided completely or we can offer a UI leading the user to create
// a valid definition.
// if we organization uses complex rules, we can make it mandatory that one of our developers review the definition.
//

export function processState(definition: any, state: any) {
  ignore(definition, state)
  return definition
}
