import './loadEnv.js'
import { app } from './slack.js'
import { scheduleQuestion } from './scheduler.js'

(async () => {
  await app.start(process.env.PORT || 3000)
  console.log('⚡️ Bolt app is running!')

  scheduleQuestion()
})()