import express, { raw, Request, Response } from 'express';
import config from '../../config';
import logger from '../logger';
import { googleAPI } from '../extAPI/googleAPI';
import { getTstoryTokenToGsheet, tStoryList, tStoryRead } from '../extAPI/tStoryAPI';
import { getWPToken, getWpPostsAfter } from '../extAPI/wpAPI';
import mysqlDB from '../db/connectMysql';

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
let tistoryMysql: any[] = [];
let tistoryPostIdMysql: any[] = [];
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
 * 최초 글 작성 시 해당 글은 디비에 정보가 없고 그러므로 디비에 글 데이터 인서트됨
 * 해당 row 1개의 글정보를 sync시키는게 아닌, 특정기간 사이의(sync서버설정별 다름)의 글정보를 동기화시키는 trigger url임
 * (티스토리 글과 1대1 대응 아님)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // get tistory_post_id in mysql
    await mysqlDB.query(
      `SELECT tistory_post_id, created_at from blogmanage`,
      (error: any, results: any, fields: any) => {
        if (error) {
          console.log(error);
        }
        tistoryMysql = results;
        console.log(results);
      }
    );

    // login tistory
    const uriTistory = `${config.tStory.apiUri}/authorize?client_id=${
      config.tStory.appIdToGsheet
    }&redirect_uri=${encodeURI(
      config.tStory.redirectUriToGsheet!
    )}&response_type=code&state=${state}`;
    res.redirect(uriTistory);
  } catch (err) {
    logger.error(`<GET "/sync-tistory"  tistory login 에러 발생> ${err}`);
  }
});

/**
 * tistory redirecturi
 * 최초 글 작성 시 해당 글은 디비에 정보가 없고 그러므로 디비에 글 데이터 인서트됨 (티스토리 글과 1대1 대응 아님)
 */
router.get('/post', async (req: Request, res: Response): Promise<void> => {
  try {
    // get tistory information
    tistoryInfo = [];
    const tistoryTokenResponse = await getTstoryTokenToGsheet(req.query.code);
    const accessTokenTistory = tistoryTokenResponse.body.split('=')[1];
    console.log(accessTokenTistory, postIdStart, postIdEnd);

    for (let page = 1; page < 3; page++) {
      const tistoryPostInfo = await tStoryList(accessTokenTistory, page);
      let tistoryPostInfoJson = convert.xml2json(tistoryPostInfo.body, {
        compact: true,
        spaces: 4,
      });
      tistoryPostInfoJson = JSON.parse(tistoryPostInfoJson);
      tistoryPostInfoJson = tistoryPostInfoJson.tistory.item.posts.post;
      console.log(tistoryPostInfoJson);

      for (let post = 0; post < tistoryPostInfoJson.length; post++) {
        let tistoryInfoDetail = {
          page: page,
          id: tistoryPostInfoJson[post].id._text,
          title: tistoryPostInfoJson[post].title._text,
          date: tistoryPostInfoJson[post].date._text,
          visibility: tistoryPostInfoJson[post].visibility._text,
          categoryId: tistoryPostInfoJson[post].categoryId._text,
        };
        tistoryInfo.push(tistoryInfoDetail);
      }
    }
    console.log(tistoryInfo);

    // console.log(postsInfoJSON);
    const googleSheets = await googleAPI(
      'https://www.googleapis.com/auth/spreadsheets',
      'sheets',
      'v4'
    );

    // reset gsheet
    await googleSheets?.instance.spreadsheets.values.clear({
      auth: googleSheets?.auth,
      spreadsheetId: config.google.sheetId,
      range: `${config.google.sheetName}!A2:U${1000}`,
    });

    // compare tistory with mysql
    function checkTistory(arr: any, val: any) {
      return arr.some(function (arrVal: any) {
        return val == arrVal;
      });
    }
    tistoryPostIdMysql = [];
    let toBeInsertTitle: any[] = [];
    let toBeInsertId: any[] = [];
    let toBeInsertDate: any[] = [];
    let toBeInsertVisibility: any[] = [];
    let toBeInsertCategoryId: any[] = [];

    /**
     * 신규 동기화될 글 정보와, db에서 기존 티스토리_id가 있는지 중복글정보 검사 후
     * 중복글정보가 아니라면 insert list로 집어넣는로직
     */
    function compareTistoryMysql() {
      for (let post = 0; post < tistoryMysql.length; post++) {
        tistoryPostIdMysql.push(tistoryMysql[post].tistory_post_id);
      }
      console.log(tistoryPostIdMysql);
      for (let post = 0; post < tistoryInfo.length; post++) {
        if (checkTistory(tistoryPostIdMysql, tistoryInfo[post].id)) {
          console.log(`${tistoryInfo[post].id} already existed!`);
        } else {
          toBeInsertTitle.push(tistoryInfo[post].title);
          toBeInsertId.push(tistoryInfo[post].id);
          toBeInsertDate.push(tistoryInfo[post].date);
          toBeInsertVisibility.push(tistoryInfo[post].visibility);
          toBeInsertCategoryId.push(tistoryInfo[post].categoryId);
        }
      }
      console.log(toBeInsertId, typeof tistoryInfo[0].id, typeof tistoryPostIdMysql[0]);
    }
    await compareTistoryMysql();

    // update mysql
    // compareTistoryMysql 에서 통과된 신규 티스토리 글정보list를 db에 인서트
    for (let post = 0; post < toBeInsertId.length; post++) {
      await mysqlDB.query(
        `INSERT INTO blogmanage (created_at, updated_at, tistory_post_id, tistory_post_status, tistory_post_url, wordpress_post_syncURL, naver_cafe_article_syncURL, json) VALUES ('${toBeInsertDate[post]}','${dateString} ${timeString}', ${toBeInsertId[post]}, '${toBeInsertVisibility[post]}', 'https://autoblogtest.tistory.com/${toBeInsertId[post]}', 'http://127.0.0.1:4000/tistory-wp?tistory_post_id=${toBeInsertId[post]}', 'http://127.0.0.1:4000/tistory-naver?tistory_post_id=${toBeInsertId[post]}', '[{"tistory":{"title":"${toBeInsertTitle[post]}", "id":${toBeInsertId[post]}, "categoryId":${toBeInsertCategoryId[post]}}}]')`,
        (error: any, results: any, fields: any) => {
          if (error) {
            console.log(error);
          }
          console.log(results);
        }
      );
    }
    await delay(5000);
    console.log(`redirect to '/mysql-gsheet'`);
    res.redirect(`http://127.0.0.1:4000/mysql-gsheet?resource=sync-tistory`);
  } catch (err) {
    logger.error(`<GET "/sync-tistory" 에러 발생> ${err}`);
  }
});

module.exports = router;
