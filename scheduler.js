import schedule from 'node-schedule'
import { DateTime } from 'luxon'
import config from './config.js'
import { getChannelId, getUserId, sendMessage, sendDM, app, webClient, getDMHistory } from './slack.js'
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

  schedule.scheduleJob(questionDate.toJSDate(), async () => {
    const responses = []
    console.log('members.members', members.members)
    for (const userId of members.members) {
      const dmConversation = await webClient.conversations.open({ users: userId })
      const channelId = dmConversation.channel.id
      console.log('channelId in scheduler.js', channelId)
      const sendDmResult = await sendDM(userId, config.defaultQuestion)
      console.log('sendDmResult scheduler.js', sendDmResult)

      let messages = null
      let foundResponse = false

      while (!foundResponse) {
        messages = await getDMHistory(channelId)
        console.log('messages in scheduler', messages)

        // responseMessage = messages.find(
        //   (msg) => msg.text !== config.defaultQuestion
        // )
        if (messages) {
          foundResponse = true
        } else {
          console.log('No message found for user', userId)
          // await new Promise(resolve => setTimeout(resolve, 10000))
        }
      }
      messages.map(msg => responses.push(anonymizeMessage(msg))
      )
      console.log('responses', responses)
    

    const prompt = `Summarize the following anonymous employee feedback:\n\n${responses.join(
      '\n'
    )}\n\nPlease provide a concise yet complete summary of the team's overall mood and a score from 1 to 10.`

    const summary = await sendToGPT(prompt)
    console.log('summary of GPT', summary)
    await sendMessage(ptLeadsChannelId, summary)
    }
  })
}

export { scheduleQuestion }
