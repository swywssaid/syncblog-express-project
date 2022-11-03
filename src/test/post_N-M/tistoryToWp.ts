import express, { Request, Response } from 'express';
import config from '../../config';
import logger from '../logger';
import { getTstoryTokenToWp, tStoryRead } from '../extAPI/tStoryAPI';
import { getWPToken, getWpPostWrite } from '../extAPI/wpAPI';

const convert = require('xml-js');
const router = express.Router();
const state = 'randomstate';
const { default: PQueue } = require('p-queue');
const queue = new PQueue({ concurrency: 1 });
const delay = require('delay');
let tistoryInfo: any = [];
const postIdStart = parseInt(config.tStory.postIdStart!);
const postIdEnd = parseInt(config.tStory.postIdEnd!);
let title: string;
let strContent: string;
let checkTistory: Boolean;

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // login tistory
    const uriTistory = `${config.tStory.apiUri}/authorize?client_id=${
      config.tStory.appIdToWp
    }&redirect_uri=${encodeURI(config.tStory.redirectUriToWp!)}&response_type=code&state=${state}`;
    res.redirect(uriTistory);
  } catch (err) {
    logger.error(`<GET "/tistoryToWp"  tistory login 에러 발생> ${err}`);
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

        for (let postId = postIdStart; postId < postIdEnd + 1; postId++) {
          const tistoryPostInfo = await tStoryRead(accessTokenTistory, postId);
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
          let tistoryInfoDetail = { postId: postId, title: title, strContent: strContent };
          console.log(tistoryInfoDetail);
          tistoryInfo.push(tistoryInfoDetail);
          console.log(tistoryInfo);
        }
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

              getWpPostWrite(wpToken, subject, content);
            }
          } catch (err) {
            logger.error(`<GET "/tistoryToWp/post" postDelay() 에러 발생> ${err}`);
          }
        }
        postDelay();
        res.send('글쓰기 요청 전송 완료');
      } catch (err) {
        logger.error(`<GET "/tistoryToWp/post" writeTask() 에러 발생> ${err}`);
      }
    };
    // Priority of operation. Operations with greater priority will be scheduled first.
    await queue.add(writeTask, { priority: 1 });
  } catch (err) {
    logger.error(`<GET "/tistoryToWp/post" p-queue 에러 발생> ${err}`);
  }
});

module.exports = router;
