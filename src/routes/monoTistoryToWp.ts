import express, { Request, Response } from 'express';
import config from '../../config';
import logger from '../logger';
import { getTstoryTokenToWp, tStoryRead } from '../extAPI/tStoryAPI';
import { getWPToken, getWpPostWrite } from '../extAPI/wpAPI';
import mysqlDB from '../db/connectMysql';

const convert = require('xml-js');
const router = express.Router();
const state = 'randomstate';
const { default: PQueue } = require('p-queue');
const queue = new PQueue({ concurrency: 1 });
const delay = require('delay');

// tistory required
let tistoryInfo: any = [];
const postIdStart = parseInt(config.tStory.postIdStart!);
const postIdEnd = parseInt(config.tStory.postIdEnd!);
let title: string;
let strContent: string;
let checkTistory: Boolean;
let tistoryPostId: any;

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
let pastMonth: string;
const getPastMonth = () => {
  if (postmonth == 1) {
    pastMonth = `12`;
  } else {
    pastMonth = `${postmonth - 1}`.padStart(2, '0');
  }
  return pastMonth;
};

/**
 * 특정 티스토리 글 id 으로 티스토리 글 정보를 불러오고, 해당 정보를 워드프레스에 글쓰기하고 db에 정보 갱신
 * mysql json 컬럼의 경우 티스토리, 네이버, 워드프레스 정보들을 모두 넣기 위해서
 * url마다 정보들 가져와 푸쉬해 새로 업로드하게 된다.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // login tistory
    tistoryPostId = req.query.tistory_post_id;
    const uriTistory = `${config.tStory.apiUri}/authorize?client_id=${
      config.tStory.appIdToWp
    }&redirect_uri=${encodeURI(config.tStory.redirectUriToWp!)}&response_type=code&state=${state}`;
    res.redirect(uriTistory);
  } catch (err) {
    logger.error(`<GET "/tistory-Wp"  tistory login 에러 발생> ${err}`);
    // slack send error message
    (async () => {
      const res = await web.chat.postMessage({
        channel: conversationId,
        text: `message: "/tistory-Wp"  tistory login 에러 발생, target: monoTistoryToWp, status: fail, error:${err}`,
      });
    })();
  }
});

router.get('/post', async (req: Request, res: Response): Promise<void> => {
  try {
    const writeTask = await async function tasks() {
      try {
        // get tistory information
        const tistoryTokenResponse = await getTstoryTokenToWp(req.query.code);
        const accessTokenTistory = tistoryTokenResponse.body.split('=')[1];
        console.log(accessTokenTistory, postIdStart, postIdEnd);

        const tistoryPostInfo = await tStoryRead(accessTokenTistory, tistoryPostId);
        let tistoryPostInfoJson = convert.xml2json(tistoryPostInfo.body, {
          compact: true,
          spaces: 4,
        });
        tistoryPostInfoJson = JSON.parse(tistoryPostInfoJson);
        checkTistory = Object.keys(tistoryPostInfoJson).includes('tistory');
        tistoryPostInfoJson = tistoryPostInfoJson.tistory.item;
        console.log(tistoryPostInfoJson);

        title = tistoryPostInfoJson.title._text;
        strContent = tistoryPostInfoJson.content._text;
        let tistoryInfoDetail = { postId: tistoryPostId, title: title, strContent: strContent };
        console.log(tistoryInfoDetail);
        tistoryInfo.push(tistoryInfoDetail);
        console.log(tistoryInfo);

        // get wordpress information
        const wpTokenInfo = await getWPToken();
        const wpToken = JSON.parse(wpTokenInfo).token;

        // post on wp from tistory
        async function postDelay() {
          try {
            for (let i = 0; i < tistoryInfo.length; i++) {
              let targetTitle = tistoryInfo[i].title;
              let targetContent = tistoryInfo[i].strContent;

              const subject = targetTitle;
              const content = targetContent;

              await delay(100); // change delayTime in development.env

              await getWpPostWrite(wpToken, subject, content);

              await delay(1000);
            }
          } catch (err) {
            logger.error(`<GET "/tistory-Wp/post" postDelay() 에러 발생> ${err}`);
            res.redirect(`http://127.0.0.1:4000/sync-wp?tistory_post_id=${tistoryPostId}`);
          }
        }
        postDelay();
        // res.send('finish');
      } catch (err) {
        logger.error(`<GET "/tistory-Wp/post" writeTask() 에러 발생> ${err}`);
      }
    };
    // Priority of operation. Operations with greater priority will be scheduled first.
    await queue.add(writeTask, { priority: 1 });
  } catch (err) {
    logger.error(`<GET "/tistory-Wp/post" p-queue 에러 발생> ${err}`);
  }
});

module.exports = router;
