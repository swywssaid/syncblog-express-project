import express, { Request, Response } from 'express';
import config from '../../config';
import logger from '../logger';
import { getTstoryTokenFromWp, tStoryAuth, tStoryPost } from '../extAPI/tStoryAPI';
import { getWPToken, getWpPosts } from '../extAPI/wpAPI';

const router = express.Router();
const state = 'randomstate';
const cheerio = require('cheerio');
const { default: PQueue } = require('p-queue');
const queue = new PQueue({ concurrency: 1 });

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const uri = `${config.tStory.apiUri}/authorize?client_id=${
      config.tStory.appIdFromWp
    }&redirect_uri=${encodeURI(
      config.tStory.redirectUriFromWp!
    )}&response_type=code&state=${state}`;
    res.redirect(uri);
  } catch (err) {
    logger.error(`<GET "/wpToTistory" 에러 발생> ${err}`);
  }
});

/**
 * 워드프레스 n개의 글 티스토리에 업로드
 * n값은 for문에서 수정해야함 -> 나중에 환경변수나 request param등으로 수정할 수 있게 하기
 */
router.get('/post', async (req: Request, res: Response): Promise<void> => {
  try {
    const writeTask = await async function tasks() {
      try {
        // get wordpress information
        const wpTokenInfo = await getWPToken();
        const wpToken = JSON.parse(wpTokenInfo).token;
        const postsInfo = await getWpPosts(wpToken);
        const postsInfoJSON = JSON.parse(postsInfo);

        // get tistory information
        const tokenResponse = await getTstoryTokenFromWp(req.query.code);
        const accessToken = tokenResponse.body.split('=')[1];

        // post on tistory blog from wordpress
        async function postDelay() {
          try {
            for (let i = 3; i < 4; i++) {
              // i: n개의 글
              const categoryId = parseInt('1');
              const $ = cheerio.load(postsInfoJSON[i]['title']['rendered']);
              const subject = $.text();
              const content = postsInfoJSON[i]['content']['rendered'];

              await tStoryPost(accessToken, categoryId, subject, content);
            }
          } catch (err) {
            logger.error(`<GET "/wpToTistory/post" postDelay() 에러 발생> ${err}`);
          }
        }
        postDelay();
        res.send('글쓰기 요청 전송 완료');
      } catch (err) {
        logger.error(`<GET "/wpToTistory/post" writeTask() 에러 발생> ${err}`);
      }
    };
    // Priority of operation. Operations with greater priority will be scheduled first.
    await queue.add(writeTask, { priority: 1 });
  } catch (err) {
    logger.error(`<GET "/wpToTistory/post" p-queue 에러 발생> ${err}`);
  }
});

module.exports = router;
