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

async function getUserId(username) {
  const users = await webClient.users.list()
  const user = users.members.find((member) => member.name === username)
  return user ? user.id : null
}

async function getChannelId(channelName) {
  const publicChannels = await webClient.conversations.list({ types: 'public_channel' })
  const privateChannels = await webClient.conversations.list({ types: 'private_channel' })

  const allChannels = [...publicChannels.channels, ...privateChannels.channels]
  const channel = allChannels.find((ch) => ch.name === channelName)
  return channel ? channel.id : null
}


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

async function getDMHistory(channelId, botUserId) {
  try {
    const result = await app.client.conversations.history({
      token: process.env.SLACK_BOT_TOKEN,
      channel: channelId,
    })
    const replies = result.messages
    .filter((message) => message.user !== botUserId)
    .map((msg) => msg.text)
    console.log('replies[0]', replies[0])
  return replies[0]
  } catch (error) {
    console.error(error)
  }
}

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
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: "End Conversation",
            },
            value: "end_conversation",
            action_id: "end_conversation",
          },
        },
      ],
      as_user: true,
    })
    return result
  } catch (error) {
    console.error(error)
  }
}
async function getBotUserId() {
  const authResult = await webClient.auth.test();
  return authResult.user_id;
}

app.action("end_conversation", async ({ ack, body, client }) => {
  try {
    // Acknowledge the button click
    await ack()

    // Get the user's response from the conversation
    const channelId = body.channel.id
    const messages = await getDMHistory(channelId)

    // Handle the user's response
    // Process the response using GPT as needed

    // Send a response message
    await client.chat.postMessage({
      channel: channelId,
      text: "Thanks for your feedback!",
    })

    // Close the conversation
    await client.chat.update({
      channel: channelId,
      ts: body.message.ts,
      blocks: [],
      text: "This conversation has ended.",
    })
  } catch (error) {
    console.error(error)
  }
})

export { app, getUserId, getChannelId, sendMessage, sendDM, webClient, getDMHistory, getBotUserId }