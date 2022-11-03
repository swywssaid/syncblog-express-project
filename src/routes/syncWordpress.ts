import express, { raw, Request, Response } from 'express';
import config from '../../config';
import logger from '../logger';
import { googleAPI } from '../extAPI/googleAPI';
import { getTstoryTokenToGsheet, tStoryList, tStoryRead } from '../extAPI/tStoryAPI';
import { getWPToken, getWpMonoPost } from '../extAPI/wpAPI';
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
let tistoryPostId: any;
let mysqlJSON: any;
let mysqlResult: any;
let title: string;
let strContent: string;
let checkTistory: Boolean;
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
 * 워드프레스의 글을 db에 업로드하게 된다.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
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

    // get wp info
    const wpTokenInfo = await getWPToken();
    const wpToken = JSON.parse(wpTokenInfo).token;
    const postsInfo = await getWpMonoPost(wpToken);
    const postsInfoJSON = JSON.parse(postsInfo);
    console.log(postsInfoJSON);
    const wpPostId = postsInfoJSON[0].id;
    const wpPostDate = postsInfoJSON[0].date;
    const wpPostStatus = postsInfoJSON[0].status;
    const wpPostLink = postsInfoJSON[0].link;

    // update mysql
    mysqlJSON.push({
      wordpress: postsInfoJSON[0],
    });
    await mysqlDB.query(
      `UPDATE blogmanage SET updated_at = '${dateString} ${timeString}', wordpress_post_id = '${wpPostId}',  wordpress_post_url = '${wpPostLink}', wordpress_post_status = '${wpPostStatus}', wordpress_post_created_at = '${wpPostDate}', json = '${JSON.stringify(
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
      res.redirect(`http://127.0.0.1:4000/mysql-gsheet?resource=tistory-wp`);
    }
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
