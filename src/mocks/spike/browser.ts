import { setupWorker } from 'msw/browser'
import { spikeHandlers } from './handlers'

export const spikeWorker = setupWorker(...spikeHandlers)
