import schedule from 'node-schedule'
import { DateTime } from 'luxon'
import config from './config.js'
import { getChannelId, getUserId, sendMessage, sendDM, app, webClient } from './slack.js'
import { sendToGPT } from './gpt.js'

function anonymizeMessage(text) {
  // Implement anonymization logic here
  return text
}

async function scheduleQuestion() {
  const ptOnlyChannelId = await getChannelId(config.ptOnlyChannel)
  const ptLeadsChannelId = await getChannelId(config.ptLeadsChannel)

  if (!ptOnlyChannelId) {
    console.error('ptOnlyChannel not found')
    return
  }

  const members = await webClient.conversations.members({ channel: ptOnlyChannelId })

  const questionDate = DateTime.local()
  .set({ hour: parseInt(config.defaultTime.split(':')[0]), minute: parseInt(config.defaultTime.split(':')[1]) })
  .setZone(config.defaultTimezone)

  console.log('questionDate!!', questionDate)

  schedule.scheduleJob(questionDate.toJSDate(), async () => {
    const responses = []

    for (const userId of members.members) {
      await sendDM(userId, config.defaultQuestion)
      setTimeout(async () => {
        const dmHistory = await webClient.conversations.history({
          channel: userId,
        })

        const responseMessage = dmHistory.messages.find(
          (msg) => msg.text !== config.defaultQuestion
        )
        console.log('responseMessage', responseMessage)

        if (responseMessage) {
          responses.push(anonymizeMessage(responseMessage.text))
        }
      }, config.defaultResponseTime * 60 * 1000)
    }


    // setTimeout(async () => {
    //   const prompt = `Summarize the following anonymous employee feedback:\n\n${responses.join(
    //     '\n'
    //   )}\n\nPlease provide a concise yet complete summary of the team's overall mood and a score from 1 to 10.`

    //   const summary = await sendToGPT(prompt)
    //   await sendMessage(ptLeadsChannelId, summary)
    // }, (config.defaultResponseTime + 1) * 60 * 1000)
  })
}


export { scheduleQuestion }


