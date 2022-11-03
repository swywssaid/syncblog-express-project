import express, { Request, Response } from 'express';
import config from '../../../config';
import logger from '../../logger';
import { getNaverTokenFromTistory, naverPostImage } from '../../extAPI/naverAPI';
import { getTstoryTokenToNaver, tStoryRead } from '../../extAPI/tStoryAPI';
import parsing from '../parsing';
import { analytics } from 'googleapis/build/src/apis/analytics';
import del from 'del';

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

router.get(`/`, async (req: Request, res: Response): Promise<void> => {
  try {
    // login tistory
    const uriTistory = `${config.tStory.apiUri}/authorize?client_id=${
      config.tStory.appIdToNaver
    }&redirect_uri=${encodeURI(
      config.tStory.redirectUriToNaver!
    )}&response_type=code&state=${state}`;
    res.redirect(uriTistory);
  } catch (err) {
    logger.error(`<GET "/tistoryToNaver"  tistory login 에러 발생> ${err}`);
  }
});

router.get(`/login`, async (req: Request, res: Response): Promise<void> => {
  try {
    // get tistory information
    const tistoryTokenResponse = await getTstoryTokenToNaver(req.query.code);
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

    // login naver
    const uriNaver = `${config.naver.apiUri}/authorize?response_type=code&client_id=${
      config.naver.clientIdFromTistory
    }&redirect_uri=${encodeURI(config.naver.redirectUriFromTistory!)}&state=${state}`;
    res.redirect(uriNaver);
  } catch (err) {
    logger.error(`<GET "/tistoryToNaver" naver login 에러 발생> ${err}`);
  }
});

router.get(`/post`, async (req: Request, res: Response): Promise<void> => {
  try {
    const writeTask = await async function tasks() {
      try {
        // get naver information
        const naverTokenResponse = await getNaverTokenFromTistory(req.query.code);
        const tokenInfo = JSON.parse(naverTokenResponse.body!);
        console.log(tokenInfo);
        const menuId = parseInt(`${config.naver.menuId}`);
        const delayTime = parseInt(`${config.naver.postDelay}`);

        // post on naver cafe from tistory
        async function postDelay() {
          try {
            for (let i = 0; i < tistoryInfo.length; i++) {
              let targetTitle = tistoryInfo[i].title;
              let targetContent = tistoryInfo[i].strContent;
              const parsedContent = await parsing.parseWriting(targetContent);
              const subject = encodeURI(targetTitle);
              const content = encodeURI(parsedContent);
              const dirpath = `image/`;
              const dirName = targetTitle.substring(0, 5);
              const image = await parsing.downloadImageOfImgtag(
                targetContent,
                dirpath,
                dirName,
                checkTistory
              );

              await delay(100); // change delayTime in development.env

              naverPostImage(tokenInfo.access_token, menuId, subject, content, image, true);
            }
          } catch (err) {
            logger.error(`<GET "/tistoryToNaver/post" postDelay() 에러 발생> ${err}`);
          }
        }
        postDelay();
        res.send('글쓰기 요청 전송 완료');
      } catch (err) {
        logger.error(`<GET "/tistoryToNaver/post" writeTask() 에러 발생> ${err}`);
      }
    };
    // Priority of operation. Operations with greater priority will be scheduled first.
    await queue.add(writeTask, { priority: 1 });
  } catch (err) {
    logger.error(`<GET "/tistoryToNaver/post" p-queue 에러 발생> ${err}`);
  }
});

module.exports = router;
