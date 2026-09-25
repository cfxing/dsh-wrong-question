import test from 'node:test'
import assert from 'node:assert/strict'
import { scheduleReview } from '../lib/review.js'
test('good starts at one day',()=>{const x=scheduleReview({reps:0,ease:2.5,intervalDays:0,dueAt:new Date().toISOString()},'good');assert.equal(x.state.intervalDays,1)})
test('again resets',()=>{const x=scheduleReview({reps:4,ease:2.5,intervalDays:20,dueAt:new Date().toISOString()},'again');assert.equal(x.state.reps,0);assert.equal(x.state.intervalDays,0)})
