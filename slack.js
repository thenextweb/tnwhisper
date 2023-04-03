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
    });
    console.log(`Message sent: ${JSON.stringify(result)}`)
    return result
  } catch (error) {
    console.error(`Error sending message: ${error}`)
  }
}


// async function sendDM(userId, message) {
//   const conversation = await webClient.conversations.open({
//     users: userId,
//   })

//   await sendMessage(conversation.channel.id, message, userId)
//   return conversation.channel.id
// }
async function getDMHistory(channelId) {
  console.log('channelId in slack.js!!', channelId)
  try {
    const result = await app.client.conversations.history({
      token: process.env.SLACK_BOT_TOKEN,
      channel: channelId,
    });
    console.log('result', result)
    return result.messages
  } catch (error) {
    console.error(error)
  }
}

async function sendDM(userId, message) {
  try {
    const result = await app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: userId,
      text: message,
      as_user: true,
    })
    console.log('result', result)
    return result;
  } catch (error) {
    console.error(error);
  }
}

export { app, getUserId, getChannelId, sendMessage, sendDM, webClient, getDMHistory }