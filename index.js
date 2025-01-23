import { createActor, fromPromise, setup, waitFor } from 'xstate';
import assert from 'node:assert/strict'

const sleep = () => new Promise(resolve => setTimeout(resolve, 1000))

const machine = setup({
  actors: {
    updateShippingAddress: fromPromise(async () => {
      console.log('invoked!')
      await sleep()
      return
    })
  }
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOgGU8AHSgqAQQggCc5YBiAV0onQBcwAtLCo18UAekYtYsANoAGALqJQlAPaxcvXGvwqQAD0QBGACwBmEvIDsxgGzy71gJwBWB6dMAmADQgAniYAHKZWrtaeXnbG4UFBXuYAvol+aFh4hKQAqtx8tBS41LQMzKxsELpgJAQAbmoA1lVpOATEJDk82mIFRWIl0rAItWqYeboKihP66prauvpGCDGhrq6mdkHWrn6BCN7WJMbWW6Yuds5ezo5JKSDNGW0ded0ixVJlYExMakwklAA2fAAZj9UCR7q1srkulAeqJ6O8ZEN8HVRnN8BMpkgQDMtDo9NjFuZnM5DuZXMYLpt3NY4jtgq4SKsIsTzEE1uZ5M5rMlUhgWpkSAB5JgQT5kDioDBMfxsSBaISvMRY1QaPHzQmIAQOEimZzsrwRYxmTzyYz0hDmSlWELyLyOTxxeRBXl3fkPUgisVMCVS9AykgAOTUvAASmBJLKWJGVTi1eiFohyQcvGs7BT9XZiV5fAFEEF5KF5FyvPFi-bTPFXRDBV7xZLpf4SOHI2x8CGBNGIP5Y7iE5rLaZ5CQruc3NZzFmLrndk4giQXDmc84h-qKclbu2xfBsTXiNN4-jEwgBMZnbq14bTMbPKYLaSYmynBP9d4nKZq+7IeQlQjSjID1mI8B2MeISBCYwryOcwn3MGdEGcOwSHTJ8nEfQt3E-dJvyeGE4Tef8d1VICNVARZjDgpkSWdOwnBgoIs3ghBS1JIcDXJcIz3sLCBTaOsfQbf1dmI9UCTIkxXC8ZDvHkVZvHorMLTWYdEPtfVnAo6xoh4j1hVFes-QDYMwwjbtANE481N1GwNkLBIn0NC0Iik4luS068GNMVwdO-fjfUbZtTOEuMSLEwxEErYdJONaxZPsV9wic8wDjNLxPDMNZrFLG4+Ww2t9IEwymwACVwWBeB+YK+2A8TmOLaT7Tk+yGPMC07FLXV2rPaJVgcScN0SIA */
  initial: 'ShippingAddress',
  states: {
    ShippingAddress: {
      tags: ['pause'],
      on: {
        'update-shipping-address': 'UpdatingShippingAddress'
      },
    },
    UpdatingShippingAddress: {
      invoke: {
        src: 'updateShippingAddress',
        onDone: {
          target: 'OrderSummary.History',
          actions: () => console.log('invoke done')
        },
        onError: 'ShippingAddress'
      }
    },
    OrderSummary: {
      initial: "NotReady",
      on: {
        'edit-shipping': 'ShippingAddress'
      },
      states: {
        NotReady: {
          tags: ['pause'],
          on: {
            "ready": 'Ready'
          }
        },
        Ready: {
          tags: ['pause'],
          on: {
            "not-ready": 'NotReady'
          }
        },
        History: {
          type: 'history',
          target: 'NotReady'
        },
      }
    },
  }
})

const actor = createActor(machine).start();
actor.send({ type: 'update-shipping-address' })
await waitFor(actor, snapshot => snapshot.hasTag('pause'), { waitFor: 3000 })
assert.deepEqual(actor.getSnapshot().value, { OrderSummary: 'NotReady' })
actor.send({ type: 'ready' })
assert.deepEqual(actor.getSnapshot().value, { OrderSummary: 'Ready' })
actor.send({ type: 'edit-shipping' })
// we should now have historyValue
// console.log(actor.getSnapshot().historyValue['(machine).OrderSummary.History'])

// simulate persist
const snapshot = actor.getPersistedSnapshot()
const serialized = JSON.stringify(snapshot)
// console.log(serialized)
// restore persisted snapshot
const parsed = JSON.parse(serialized)
console.log('creating actor from snapshot')
const secondActor = createActor(machine, { snapshot: parsed }).start();
console.log('created actor from snapshot')

secondActor.send({ type: 'update-shipping-address' })
await waitFor(secondActor, snapshot => snapshot.hasTag('pause'), { waitFor: 3000 })
assert.deepEqual(secondActor.getSnapshot().value, { OrderSummary: 'Ready' })