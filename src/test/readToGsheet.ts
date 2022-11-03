import express, { raw, Request, Response } from 'express';
import config from '../../config';
import logger from '../logger';
import { googleAPI } from '../extAPI/googleAPI';
import { getTstoryTokenToGsheet, tStoryList, tStoryRead } from '../extAPI/tStoryAPI';
import { getWPToken, getWpPostsAfter } from '../extAPI/wpAPI';

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
const today = new Date();
const year = today.getFullYear();
const month = today.getMonth() + 1;
const day = today.getDate();
let pastMonth: string;
const getPastMonth = () => {
  if (month == 1) {
    pastMonth = `12`;
  } else {
    pastMonth = `${month - 1}`.padStart(2, '0');
  }
  return pastMonth;
};

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // login tistory
    const uriTistory = `${config.tStory.apiUri}/authorize?client_id=${
      config.tStory.appIdToGsheet
    }&redirect_uri=${encodeURI(
      config.tStory.redirectUriToGsheet!
    )}&response_type=code&state=${state}`;
    res.redirect(uriTistory);
  } catch (err) {
    logger.error(`<GET "/tistoryToWp"  tistory login 에러 발생> ${err}`);
  }
});

router.get('/post', async (req: Request, res: Response): Promise<void> => {
  try {
    // get tistory information
    const tistoryTokenResponse = await getTstoryTokenToGsheet(req.query.code);
    const accessTokenTistory = tistoryTokenResponse.body.split('=')[1];
    console.log(accessTokenTistory, postIdStart, postIdEnd);

    for (let page = 1; page < 2; page++) {
      const tistoryPostInfo = await tStoryList(accessTokenTistory, page);
      let tistoryPostInfoJson = convert.xml2json(tistoryPostInfo.body, {
        compact: true,
        spaces: 4,
      });
      tistoryPostInfoJson = JSON.parse(tistoryPostInfoJson);
      checkTistory = Object.keys(tistoryPostInfoJson).includes('tistory');
      tistoryPostInfoJson = tistoryPostInfoJson.tistory.item.posts.post;

      console.log(tistoryPostInfoJson);
      for (let post = 0; post < tistoryPostInfoJson.length; post++) {
        let date = tistoryPostInfoJson[post].date._text.split(' ')[0].split(`-`);
        let postMonth = date[1];
        let postDay = date[2];
        console.log(
          date,
          postMonth,
          postDay,
          typeof postDay,
          parseInt(postDay),
          typeof parseInt(postDay),
          day
        );
        let tistoryInfoDetail = {
          page: page,
          id: tistoryPostInfoJson[post].id._text,
          title: tistoryPostInfoJson[post].title._text,
          date: tistoryPostInfoJson[post].date._text,
        };
        tistoryInfo.push(tistoryInfoDetail);

        if (postMonth == getPastMonth() && postDay < day) {
          break;
        }
      }
    }

    // get wp info
    const wpTokenInfo = await getWPToken();
    const wpToken = JSON.parse(wpTokenInfo).token;
    const postsInfo = await getWpPostsAfter(wpToken);
    const postsInfoJSON = JSON.parse(postsInfo);
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
      range: `${config.google.sheetName}!A2:E${1000}`,
    });

    // set wp resource, write title to google sheet
    let wpTitleValues: any[] = [];
    let wpTitleStringValues: any[] = [];
    let wpIdValues = [];
    let checkWpTitle: any[] = [];
    for (let i = 0; i < postsInfoJSON.length; i++) {
      // let menuId = parseInt('1');
      // let subject = encodeURI(postsInfoJSON[i]['title']['rendered']);
      // let content = encodeURI(postsInfoJSON[i]['content']['rendered']);
      // let date = encodeURI(postsInfoJSON[i].date);
      // let id = parseInt(postsInfoJSON[i].id);
      console.log(i, [postsInfoJSON[i]['id']], postsInfoJSON[i]['title']['rendered']);
      wpTitleValues.push([postsInfoJSON[i]['title']['rendered']]);
      wpTitleStringValues.push(postsInfoJSON[i]['title']['rendered']);
      wpIdValues.push([postsInfoJSON[i]['id']]);
      checkWpTitle.push({
        title: postsInfoJSON[i]['title']['rendered'],
        id: postsInfoJSON[i]['id'],
      });
    }
    console.log(wpTitleValues, wpIdValues);
    const wpTitleBody = {
      values: wpTitleValues,
    };
    const wpIdBody = {
      values: wpIdValues,
    };

    // google sheet api: write
    await googleSheets?.instance.spreadsheets.values.update({
      auth: googleSheets?.auth,
      spreadsheetId: config.google.sheetId,
      range: `${config.google.sheetName}!A2:A${postsInfoJSON.length + 1}`,
      valueInputOption: 'RAW',
      resource: wpTitleBody,
    });

    await googleSheets?.instance.spreadsheets.values.update({
      auth: googleSheets?.auth,
      spreadsheetId: config.google.sheetId,
      range: `${config.google.sheetName}!B2:B${postsInfoJSON.length + 1}`,
      valueInputOption: 'RAW',
      resource: wpIdBody,
    });

    // set tistory resource, write title to google sheet
    let tistoryTitleValues: any[] = [];
    let tistoryIdValues = [];
    let checkTistoryTitle = [];
    console.log(tistoryInfo);
    for (let post = 0; post < tistoryInfo.length; post++) {
      tistoryIdValues.push([parseInt(tistoryInfo[post].id)]);
      tistoryTitleValues.push([tistoryInfo[post].title]);
      checkTistoryTitle.push({
        title: tistoryInfo[post].title,
        id: parseInt(tistoryInfo[post].id),
      });
    }
    console.log(tistoryTitleValues, tistoryIdValues);
    const tistoryTitleBody = {
      values: tistoryTitleValues,
    };
    const tistoryIdBody = {
      values: tistoryIdValues,
    };

    // tistory to gsheet
    await googleSheets?.instance.spreadsheets.values.update({
      auth: googleSheets?.auth,
      spreadsheetId: config.google.sheetId,
      range: `${config.google.sheetName}!C2:C${tistoryInfo.length + 1}`,
      valueInputOption: 'RAW',
      resource: tistoryTitleBody,
    });
    await googleSheets?.instance.spreadsheets.values.update({
      auth: googleSheets?.auth,
      spreadsheetId: config.google.sheetId,
      range: `${config.google.sheetName}!D2:D${tistoryInfo.length + 1}`,
      valueInputOption: 'RAW',
      resource: tistoryIdBody,
    });

    // find something to post
    let checkValues: any[] = [];
    function checkPosting() {
      for (let post = 0; post < wpTitleValues.length; post++) {
        console.log(
          wpTitleStringValues,
          typeof wpTitleStringValues[post],
          typeof wpTitleValues[post][0]
        );
        if (wpTitleStringValues.includes(wpTitleValues[post][0]) == true) {
          console.log(`${wpTitleValues[post]} already existed`);
        } else {
          checkValues.push(wpTitleValues[post]);
        }
      }
    }
    checkPosting();
    const checkBody = {
      values: checkValues,
    };
    console.log(checkBody);

    await googleSheets?.instance.spreadsheets.values.update({
      auth: googleSheets?.auth,
      spreadsheetId: config.google.sheetId,
      range: `${config.google.sheetName}!E2:E${checkValues.length + 1}`,
      valueInputOption: 'RAW',
      resource: checkBody,
    });

    res.send('글쓰기 요청 전송 완료');
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
