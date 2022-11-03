import express, { Request, Response } from 'express';
import config from '../../config';
import logger from '../logger';
import { getNaverTokenFromTistory, naverPostImage } from '../extAPI/naverAPI';
import { getTstoryTokenToNaver, tStoryRead } from '../extAPI/tStoryAPI';
import parsing from '../utilities/parsing';
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
let categoryId: any;
let checkTistory: Boolean;
let tistoryPostId: any;

// mysql required
mysqlDB.connect();
let mysqlResult: any;
let mysqlJSON: any;

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
 * 특정 티스토리 글 id 으로 티스토리 글 정보를 불러오고, 해당 정보를 네이버에 글쓰기하고 db에 정보 갱신
 * mysql json 컬럼의 경우 티스토리, 네이버, 워드프레스 정보들을 모두 넣기 위해서
 * url마다 정보들 가져와 푸쉬해 새로 업로드하게 된다.
 *
 */
router.get(`/`, async (req: Request, res: Response): Promise<void> => {
  try {
    // get json in mysql
    tistoryPostId = req.query.tistory_post_id;
    await mysqlDB.query(
      `SELECT json FROM blogmanage WHERE tistory_post_id = ${tistoryPostId}`,
      (error: any, results: any, fields: any) => {
        if (error) {
          console.log(error);
        }
        mysqlJSON = results[0].json;
        console.log(results, typeof results, mysqlJSON, typeof mysqlJSON);
        mysqlJSON = JSON.parse(`${mysqlJSON}`);
      }
    );

    // login tistory
    const uriTistory = `${config.tStory.apiUri}/authorize?client_id=${
      config.tStory.appIdToNaver
    }&redirect_uri=${encodeURI(
      config.tStory.redirectUriToNaver!
    )}&response_type=code&state=${state}`;
    res.redirect(uriTistory);
  } catch (err) {
    logger.error(`<GET "/tistory-naver"  tistory login 에러 발생> ${err}`);
    // slack send error message
    (async () => {
      const res = await web.chat.postMessage({
        channel: conversationId,
        text: `message: "/tistory-naver"  tistory login 에러 발생, target: monoTistoryToNaver, status: fail, error:${err}`,
      });
    })();
  }
});

/**
 * 티스토리 정보를 변수들에 저장하고 네이버 로그인을 하게 됨.
 */
router.get(`/login`, async (req: Request, res: Response): Promise<void> => {
  try {
    // get tistory information
    const tistoryTokenResponse = await getTstoryTokenToNaver(req.query.code);
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
    categoryId = tistoryPostInfoJson.categoryId._text;
    let tistoryInfoDetail = {
      postId: tistoryPostId,
      title: title,
      strContent: strContent,
      categoryId: categoryId,
    };
    console.log(tistoryInfoDetail);
    tistoryInfo.push(tistoryInfoDetail);
    console.log(tistoryInfo);

    // login naver
    const uriNaver = `${config.naver.apiUri}/authorize?response_type=code&client_id=${
      config.naver.clientIdFromTistory
    }&redirect_uri=${encodeURI(config.naver.redirectUriFromTistory!)}&state=${state}`;
    res.redirect(uriNaver);
  } catch (err) {
    logger.error(`<GET "/tistory-naver/login" naver login 에러 발생> ${err}`);
    // slack send error message
    (async () => {
      const res = await web.chat.postMessage({
        channel: conversationId,
        text: `message: "/tistory-naver/login" naver login 에러 발생, target: monoTistoryToNaver, status: fail, error:${err}`,
      });
    })();
  }
});

/**
 * 네이버 정보를 가져오고 /login에서 저장된 티스토리 정보를 글쓰기하고 mysql에 업로드하게 된다.
 */
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
              let targetCategoryId = tistoryInfo[i].strContent;

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

              const naverPostInfo: any = await (
                await naverPostImage(tokenInfo.access_token, menuId, subject, content, image)
              ).body;
              const naverPostInfoJSON = JSON.parse(naverPostInfo);
              console.log(naverPostInfoJSON, typeof naverPostInfoJSON);
              const naverArticleId = naverPostInfoJSON.message.result.articleId;
              const naverArticleUrl = naverPostInfoJSON.message.result.articleUrl;
              console.log(naverArticleId, naverArticleUrl);
              mysqlJSON.push({
                naver: {
                  title: `${targetTitle}`,
                  id: naverArticleId,
                  url: naverArticleUrl,
                },
              });
              console.log(JSON.stringify(mysqlJSON), mysqlJSON, typeof mysqlJSON);
              // update mysql
              await mysqlDB.query(
                `UPDATE blogmanage SET updated_at = '${dateString} ${timeString}', naver_cafe_article_id = '${naverArticleId}', naver_cafe_article_url = '${naverArticleUrl}', naver_cafe_article_created_at = '${dateString} ${timeString}',naver_cafe_article_status='public', json = '${JSON.stringify(
                  mysqlJSON
                )}' WHERE tistory_post_id = ${tistoryPostId}`,
                (error: any, results: any, fields: any) => {
                  if (error) {
                    console.log(error);
                  }
                  console.log(results);
                  mysqlResult = results;
                }
              );

              await delay(1000);

              if (mysqlResult.changedRows == 1 && mysqlResult.warningCount == 0) {
                res.redirect(`http://127.0.0.1:4000/mysql-gsheet?resource=tistory-naver`); // sheet에 갱신
              }
            }
          } catch (err) {
            logger.error(`<GET "/tistory-naver/post" postDelay() 에러 발생> ${err}`);
            // slack send error message
            (async () => {
              const res = await web.chat.postMessage({
                channel: conversationId,
                text: `message: "/tistory-naver/post" postDelay() 에러 발생, target: monoTistoryToNaver, status: fail, error:${err}`,
              });
            })();
          }
        }
        postDelay();
        // res.send('글쓰기 요청 전송 완료');
      } catch (err) {
        logger.error(`<GET "/tistory-naver/post" writeTask() 에러 발생> ${err}`);
        // slack send error message
        (async () => {
          const res = await web.chat.postMessage({
            channel: conversationId,
            text: `message: "/tistory-naver/post" writeTask() 에러 발생, target: monoTistoryToNaver, status: fail, error:${err}`,
          });
        })();
      }
    };
    // Priority of operation. Operations with greater priority will be scheduled first.
    await queue.add(writeTask, { priority: 2 });
  } catch (err) {
    logger.error(`<GET "/tistory-naver/post" p-queue 에러 발생> ${err}`);
    // slack send error message
    (async () => {
      const res = await web.chat.postMessage({
        channel: conversationId,
        text: `message: "/tistory-naver/post" p-queue 에러 발생, target: monoTistoryToNaver, status: fail, error:${err}`,
      });
    })();
  }
});

module.exports = router;
