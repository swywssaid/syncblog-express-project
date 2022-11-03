import express, { raw, Request, Response } from 'express';
import config from '../../config';
import logger from '../logger';
import { googleAPI } from '../extAPI/googleAPI';
import mysqlDB from '../db/connectMysql';
import { getSlackChannels, postSlackMessage } from '../extAPI/slackAPI';
import delay from 'delay';
const router = express.Router();
const state = 'randomstate';

// tistory required
let mysqlInfo: any = [];
const postIdStart = parseInt(config.tStory.postIdStart!);
const postIdEnd = parseInt(config.tStory.postIdEnd!);
let title: string;
let strContent: string;
let tistoryMysql: any[] = [];

// slack required
const { WebClient } = require('@slack/web-api');
let slackChannelId: any;
const slackToken = config.slack.appToken!;
const web = new WebClient(slackToken);
const conversationId = config.slack.channelId;

// check time
const today = new Date();
const year = today.getFullYear();
const month = ('0' + (today.getMonth() + 1)).slice(-2);
const day = ('0' + today.getDate()).slice(-2);
const hours = ('0' + today.getHours()).slice(-2);
const minutes = ('0' + today.getMinutes()).slice(-2);
const seconds = ('0' + today.getSeconds()).slice(-2);
const dateString = year + '-' + month + '-' + day;
const timeString = hours + ':' + minutes + ':' + seconds;
const postmonth = today.getMonth() + 1;
const postday = today.getDate();
let resource: any;
let pastMonth: string;
const getPastMonth = () => {
  if (postmonth == 1) {
    pastMonth = `12`;
  } else {
    pastMonth = `${postmonth - 1}`.padStart(2, '0');
  }
  return pastMonth;
};
const postDateString = year + '-' + getPastMonth() + '-' + day;

/**
 * mysql에 저장된 최근 한달치 글을 구글 시트의 기존 sheet정보를 삭제 후 업로드
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // get resource for slack
    resource = req.query.resource;
    let slackChannels = await getSlackChannels(slackToken);
    slackChannels = [slackChannels];
    console.log(`slackChannels: ${slackChannels}`);
    let slackChannelName = config.slack.channelName;

    for (let channel = 0; channel < slackChannels.length; channel++) {
      if (slackChannels[channel].name == slackChannelName) {
        slackChannelId = slackChannels[channel].id;
      }
    }
    console.log(`slackChannelId: ${slackChannelId}!!!!!!!!!!!!!`);
    // get mysql data
    await mysqlDB.query(
      `SELECT created_at,updated_at,tistory_post_id,tistory_post_syncURL,tistory_post_status,tistory_url,tistory_post_url,wordpress_post_id,wordpress_post_syncURL,wordpress_post_status,wordpress_url,wordpress_post_url,wordpress_post_created_at,naver_cafe_article_id,naver_cafe_article_syncURL,naver_cafe_article_status,naver_cafe_url,naver_cafe_article_url,naver_cafe_article_created_at,json  FROM blogmanage WHERE created_at BETWEEN '${postDateString} ${timeString}' AND '${dateString} ${timeString}'`,
      (error: any, results: any, fields: any) => {
        if (error) {
          console.log(error);
        }
        mysqlInfo = results;
        console.log(results);
      }
    );
    // reset gsheet
    const googleSheets = await googleAPI(
      'https://www.googleapis.com/auth/spreadsheets',
      'sheets',
      'v4'
    );
    await googleSheets?.instance.spreadsheets.values.clear({
      auth: googleSheets?.auth,
      spreadsheetId: config.google.sheetId,
      range: `${config.google.sheetName}!A2:T${1000}`,
    });

    // mysql to gsheet
    let updateTogsheet: any[] = [];
    await mysqlInfo.forEach((element: any) => {
      updateTogsheet.push(Object.values(element));
    });
    console.log(updateTogsheet);
    const updateTogsheetBody = {
      values: updateTogsheet,
    };
    await googleSheets?.instance.spreadsheets.values.update({
      auth: googleSheets?.auth,
      spreadsheetId: config.google.sheetId,
      range: `${config.google.sheetName}!A2:T${mysqlInfo.length + 1}`,
      valueInputOption: 'RAW',
      resource: updateTogsheetBody,
    });

    delay(2000);
    // slack send message
    (async () => {
      const res = await web.chat.postMessage({
        channel: conversationId,
        text: `message: ${resource} 동기화에 성공했습니다, target: ${resource}, status: success`,
      });
      console.log('Message sent: ', res.ts);
    })();

    res.send('최근 한달치 mysql 데이터 google sheet에 동기화 완료');
  } catch (err) {
    logger.error(`<GET "/mysqlTogsheet" post 에러 발생> ${err}`);
    // slack send error message
    const conversationId = config.slack.channelId;
    (async () => {
      const res = await web.chat.postMessage({
        channel: conversationId,
        text: `message: ${resource} 동기화에 실패했습니다, target: ${resource}, status: fail, error:${err}`,
      });
    })();
  }
});

module.exports = router;
