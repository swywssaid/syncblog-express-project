import express, { raw, Request, Response } from 'express';
import config from '../../config';
import logger from '../logger';
import { googleAPI } from '../extAPI/googleAPI';
import { getWPToken, getWpPostsAfter } from '../extAPI/wpAPI';

const router = express.Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const wpTokenInfo = await getWPToken();
    const wpToken = JSON.parse(wpTokenInfo).token;
    const postsInfo = await getWpPostsAfter(wpToken);
    const postsInfoJSON = JSON.parse(postsInfo);
    console.log(postsInfoJSON);
    const googleSheets = await googleAPI(
      'https://www.googleapis.com/auth/spreadsheets',
      'sheets',
      'v4'
    );

    // set resource, write title to google sheet
    let titleValues = [];
    let idValues = [];
    for (let i = 0; i < postsInfoJSON.length; i++) {
      // let menuId = parseInt('1');
      // let subject = encodeURI(postsInfoJSON[i]['title']['rendered']);
      // let content = encodeURI(postsInfoJSON[i]['content']['rendered']);
      // let date = encodeURI(postsInfoJSON[i].date);
      // let id = parseInt(postsInfoJSON[i].id);
      console.log(i, [postsInfoJSON[i]['id']], postsInfoJSON[i]['title']['rendered']);
      titleValues.push([postsInfoJSON[i]['title']['rendered']]);
      idValues.push([postsInfoJSON[i]['id']]);
    }
    const titleBody = {
      values: titleValues,
    };
    const idBody = {
      values: idValues,
    };

    // google sheet api: write
    await googleSheets?.instance.spreadsheets.values.update({
      auth: googleSheets?.auth,
      spreadsheetId: config.google.sheetId,
      range: `${config.google.sheetName}!A2:A${postsInfoJSON.length + 1}`,
      valueInputOption: 'RAW',
      resource: titleBody,
    });

    await googleSheets?.instance.spreadsheets.values.update({
      auth: googleSheets?.auth,
      spreadsheetId: config.google.sheetId,
      range: `${config.google.sheetName}!B2:B${postsInfoJSON.length + 1}`,
      valueInputOption: 'RAW',
      resource: idBody,
    });

    res.send('글쓰기 요청 전송 완료');
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
