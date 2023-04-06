import schedule from 'node-schedule';
import { DateTime } from 'luxon';
import config from './config.js';
import { getChannelId, getBotUserId, sendMessage, sendDM, app, webClient, getDMHistory } from './slack.js';
import { sendToGPT } from './gpt.js';

function anonymizeMessage(text) {
  // Implement anonymization logic here
  return text;
}

async function scheduleQuestion() {
  const ptOnlyChannelId = await getChannelId(config.ptOnlyChannel);
  const ptLeadsChannelId = await getChannelId(config.ptLeadsChannel);

  if (!ptOnlyChannelId) {
    console.error("ptOnlyChannel not found");
    return;
  }

  const members = await webClient.conversations.members({
    channel: ptOnlyChannelId,
  });

  const questionDate = DateTime.local()
    .set({
      hour: parseInt(config.defaultTime.split(":")[0]),
      minute: parseInt(config.defaultTime.split(":")[1]),
    })
    .setZone(config.defaultTimezone);
  schedule.scheduleJob(questionDate.toJSDate(), async () => {
    const botUserId = await getBotUserId();
    const membersWithoutBot = members.members.filter(
      (userId) => userId !== botUserId
    );

    const userResponses = new Map();

    app.action("end_conversation", async ({ ack, body }) => {
      await ack();
      const userId = body.user.id;
      if (!userResponses.has(userId)) {
        const channelId = body.channel.id;
        const messages = await getDMHistory(channelId, botUserId);
        userResponses.set(userId, anonymizeMessage(messages));
      }
    });

    const responsePromises = membersWithoutBot.map(async (userId) => {
      const dmConversation = await webClient.conversations.open({
        users: userId,
      });
      const channelId = dmConversation.channel.id;

      await sendDM(userId, config.defaultQuestion);

      return new Promise(async (resolve) => {
        setTimeout(async () => {
          if (!userResponses.has(userId)) {
            const messages = await getDMHistory(channelId, botUserId);
            resolve(anonymizeMessage(messages));
          } else {
            resolve(userResponses.get(userId));
          }
        }, 60000); // wait for 60 seconds
      });
    });

    const responses = await Promise.all(responsePromises);
    console.log("responses pre-prompt", responses);

    const prompt = `The following is a list of answers from different employees to the question "${config.defaultQuestion}".
      \n\n${responses.join(
        '\n'
      )}\n\nYour reply should be a single concise yet complete summary of all these answers, your goal is to give a summary of the team's overall mood, and finish your response giving a score from 1 to 10 (where 1 means that overall people are not feeling good or positive at all, while 10 means that people are feeling very good or positive). Make sure to anonymize any personal name that is mentioned, replacing it with the literal text "employee_name". This is ESSENTIAL.`
    const summary = await sendToGPT(prompt);
    console.log('summary of GPT', summary);
    await sendMessage(ptLeadsChannelId, summary);
  });
}

export { scheduleQuestion };
