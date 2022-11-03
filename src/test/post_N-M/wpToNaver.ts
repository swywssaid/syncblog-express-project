import express, { Request, Response } from 'express';
import config from '../../config';
import logger from '../logger';
import { naverLogin, getNaverTokenFromWp, naverPostImage } from '../extAPI/naverAPI';
import { getWPToken, getWpPosts } from '../extAPI/wpAPI';
import parsing from '../test/parsing';

const router = express.Router();
const state = 'randomstate';
const { default: PQueue } = require('p-queue');
const queue = new PQueue({ concurrency: 1 });
const delay = require('delay');
let checkTistory: Boolean;

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const uri = `${config.naver.apiUri}/authorize?response_type=code&client_id=${
      config.naver.clientIdFromWp
    }&redirect_uri=${encodeURI(config.naver.redirectUriFromWp!)}&state=${state}`;
    res.redirect(uri);
  } catch (err) {
    logger.error(`<GET "/wpToNaver" 에러 발생> ${err}`);
  }
});

router.get('/post', async (req: Request, res: Response): Promise<void> => {
  // word
  const fromWordpressPostId = req.query.wordpress_post_id;

  //

  try {
    const writeTask = await async function tasks() {
      try {
        // get wordpress information
        const wpTokenInfo = await getWPToken();
        const wpToken = JSON.parse(wpTokenInfo).token;
        const postsInfo = await getWpPosts(wpToken);
        const postsInfoJSON = JSON.parse(postsInfo);
        console.log(postsInfoJSON);
        // get naver information
        const tokenResponse = await getNaverTokenFromWp(req.query.code);
        const tokenInfo = JSON.parse(tokenResponse.body!);
        const menuId = parseInt(`${config.naver.menuId}`);
        const delayTime = parseInt(`${config.naver.postDelay}`);

        // post on naver cafe from wordpress
        // postsInfoJSON.length
        async function postDelay() {
          try {
            for (let i = 0; i < 1; i++) {
              const title = String(postsInfoJSON[i]['title']['rendered']);
              const strContent = String(postsInfoJSON[i]['content']['rendered']);
              const parsedContent = await parsing.parseWriting(strContent);

              const subject = encodeURI(postsInfoJSON[i]['title']['rendered']);

              const content = encodeURI(parsedContent);
              const dirpath = `image/`;
              const dirName = title.substring(0, 5);
              const image = await parsing.downloadImageOfImgtag(
                strContent,
                dirpath,
                dirName,
                checkTistory
              );

              await delay(30); // change delayTime in development.env

              naverPostImage(tokenInfo.access_token, menuId, subject, content, image);
            }
          } catch (err) {
            logger.error(`<GET "/wpToNaver/post" postDelay() 에러 발생> ${err}`);
          }
        }
        postDelay();
        res.send('글쓰기 요청 전송 완료');
      } catch (err) {
        logger.error(`<GET "/wpToNaver/post" writeTask() 에러 발생> ${err}`);
      }
    };
    // Priority of operation. Operations with greater priority will be scheduled first.
    await queue.add(writeTask, { priority: 1 });
  } catch (err) {
    logger.error(`<GET "/wpToNaver/post" p-queue 에러 발생> ${err}`);
  }
});

module.exports = router;
