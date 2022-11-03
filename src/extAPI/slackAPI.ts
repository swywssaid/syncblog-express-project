import config from '../../config';

const request = require('request');

export function getSlackChannels(token: string): Promise<any> {
  let options = {
    url: `${config.slack.apiUri}/conversations.list`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  return new Promise((resolve, reject) => {
    request.get(options, function (error: Error, response: any, body: any) {
      if (error) reject(error);
      else if (!error && response.statusCode == 200) {
        resolve(body);
      } else {
        reject(response.body);
      }
    });
  });
}

export function postSlackMessage(token: string, channelId: any, message: any): Promise<any> {
  let options = {
    url: `${config.wp.apiUri}/chat.postMessage`,
    token: token,
    channel: channelId,
    text: message,
  };

  return new Promise((resolve, reject) => {
    request.post(options, function (error: Error, response: any, body: any) {
      if (error) reject(error);
      else if (!error && response.statusCode == 200) {
        resolve(body);
      } else {
        reject(response.body);
      }
    });
  });
}
