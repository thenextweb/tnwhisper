import './loadEnv.js'
import pkg from '@slack/bolt'
import { WebClient } from '@slack/web-api'

const { App } = pkg

const webClient = new WebClient(process.env.SLACK_BOT_TOKEN)

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  authorize: async () => {
    return {
      botToken: process.env.SLACK_BOT_TOKEN,
    }
  },
})

async function getChannelId(channelName) {
  const publicChannels = await webClient.conversations.list({ types: 'public_channel' })
  const privateChannels = await webClient.conversations.list({ types: 'private_channel' })

  const allChannels = [...publicChannels.channels, ...privateChannels.channels]
  const channel = allChannels.find((ch) => ch.name === channelName)
  return channel ? channel.id : null
}

async function getDMHistory(channelId, botUserId, botQuestionTimestamp) {
  const conversationHistory = []
  let cursor = ''

  do {
    const result = await webClient.conversations.history({
      channel: channelId,
      cursor,
      limit: 200,
    })

    cursor = result.response_metadata.next_cursor

    for (const message of result.messages) {
      // Check if the message is from the user and was sent after the bot's question
      if (message.user !== botUserId && parseFloat(message.ts) > parseFloat(botQuestionTimestamp)) {
        conversationHistory.push(message.text)
      }
      // Stop processing messages once we reach the bot's question
      if (message.user === botUserId && parseFloat(message.ts) === parseFloat(botQuestionTimestamp)) {
        break
      }
    }
  } while (cursor)

  // Join all the user's messages into a single response, in the order as the user entered them
  return conversationHistory.reverse().join(' ')
}

// Sends the DM from the bot to each user 
async function sendDM(userId, message) {
  try {
    const result = await app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: userId,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: message,
          },
        },
      ],
      as_user: true,
    })
    return result.ts; // Return the timestamp of the message
  } catch (error) {
    console.error(error)
  }
}

async function getBotUserId() {
  const authResult = await webClient.auth.test()
  return authResult.user_id
}

// Send final response from GPT to the chosen Slack channel
async function sendMessage(channelId, message, userId) {
  try {
    const result = await webClient.chat.postMessage({
      channel: channelId,
      text: message,
      as_user: true,
      user: userId
    })
    console.log(`Message sent: ${JSON.stringify(result)}`)
    return result
  } catch (error) {
    console.error(`Error sending message: ${error}`)
  }
}

export { app, getChannelId, sendMessage, sendDM, webClient, getDMHistory, getBotUserId }