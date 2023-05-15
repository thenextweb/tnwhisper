import schedule from 'node-schedule'
import { DateTime } from 'luxon'
import config from './config.js'
import { getChannelId, getBotUserId, sendMessage, sendDM, app, webClient, getDMHistory } from './slack.js'
import { sendToGPT } from './gpt.js'

async function scheduleQuestion() {
  const finalSummaryChannelId = await getChannelId(config.finalSummaryChannel)
  const questionRecipientsChannelId = await getChannelId(config.questionRecipientsChannel)

  if (!finalSummaryChannelId) {
    console.error("finalSummaryChannel not found")
    return
  }

  const members = await webClient.conversations.members({
    channel: finalSummaryChannelId,
  })

  const questionDate = DateTime.local()
    .set({
      hour: parseInt(config.defaultTime.split(":")[0]),
      minute: parseInt(config.defaultTime.split(":")[1]),
    })
    .setZone(config.defaultTimezone)
  schedule.scheduleJob(questionDate.toJSDate(), async () => {
    const botUserId = await getBotUserId()
    const membersWithoutBot = members.members.filter(
      (userId) => userId !== botUserId
    )

    const userResponses = new Map()

    app.action("end_conversation", async ({ ack, body }) => {
      await ack()
      const userId = body.user.id
      if (!userResponses.has(userId)) {
        const channelId = body.channel.id
        const messages = await getDMHistory(channelId, botUserId)
        userResponses.set(userId, messages)
      }
    })

    const responsePromises = membersWithoutBot.map(async (userId) => {
      const dmConversation = await webClient.conversations.open({
        users: userId,
      })
      const channelId = dmConversation.channel.id
  
      const botMessageTimestamp = await sendDM(userId, config.defaultQuestion)
  
      return new Promise(async (resolve) => {
        setTimeout(async () => {
          if (!userResponses.has(userId)) {
            const messages = await getDMHistory(channelId, botUserId, botMessageTimestamp)
            resolve(messages)
          } else {
            resolve(userResponses.get(userId))
          }
        }, config.defaultResponseTime) // wait for 60 seconds
      })
    })

    const responses = await Promise.all(responsePromises)

    const prompt = `The following is a list of answers from different employees to the question "${config.defaultQuestion}".
      \n\n${responses.join(
        '\n'
      )}\n\nYour reply should be a single complete summary of all these answers. 
      Your goal is to give a complete summary of the team's overall mood, summarize the
      employees mood in the best and most complete way as possible, and finish your response giving 
      a score from 1 to 10 (where 1 means that overall people are not feeling good or positive at all, 
      while 10 means that people are feeling very good or positive). 
      Make sure to anonymize any personal name that is mentioned. 
      You also need to anonymize any colleague or team-member name or surname
      that is mentioned anywhere in the prompt. Some people 
      might have names or surnames that sound like existing words or objects (for example the name 'olive'), plus sometimes
      people write personal names without capitalizing the first letter, so make
      sure not to get tricked by this, you need to anonymize all these personal names as well! 
      Anonymization of ALL personal names is ESSENTIAL.`
    const summary = await sendToGPT(prompt)
    await sendMessage(questionRecipientsChannelId, summary)
  })
}

export { scheduleQuestion }
