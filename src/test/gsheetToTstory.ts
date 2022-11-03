import express, { Request, Response } from 'express';
import config from '../../config';
import logger from '../logger';
import { googleAPI } from '../extAPI/googleAPI';
import sheetsToObject from '../utilities/sheetsToObject';
import { getTstoryTokenWp, tStoryAuth, tStoryPost } from '../extAPI/tStoryAPI';

const router = express.Router();
const state = 'randomstate';

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const uri = `${config.tStory.apiUri}/authorize?client_id=${
      config.tStory.appIdWp
    }&redirect_uri=${encodeURI(config.tStory.redirectUriWp!)}&response_type=code&state=${state}`;
    await tStoryAuth(uri);
    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
    res.end(`<a href=${uri}>click here to get the code</a>`);
  } catch (err) {
    logger.error(`<GET "/t-story" 에러 발생> ${err}`);
  }
});

router.get('/post', async (req: Request, res: Response): Promise<void> => {
  try {
    const googleSheets = await googleAPI(
      'https://www.googleapis.com/auth/spreadsheets',
      'sheets',
      'v4'
    );

    let sheets = await googleSheets?.instance.spreadsheets.values.get({
      auth: googleSheets?.auth,
      spreadsheetId: config.google.sheetId,
      range: `${config.google.sheetName}`,
    });

    let sheetsDataObject = sheetsToObject(sheets.data.values);
    let checkedSheetsData = sheetsDataObject.filter(
      (data) => data.checked === 'TRUE' && data.platform === 't-story'
    );

    const tokenResponse = await getTstoryTokenWp(req.query.code);
    const accessToken = tokenResponse.body.split('=')[1];

    for (let i = 0; i < checkedSheetsData.length; i++) {
      let subject = encodeURI(checkedSheetsData[i].title);
      let content = checkedSheetsData[i].content;
      let categoryId = parseInt(checkedSheetsData[i].categoryId);
      console.log(content);
      await tStoryPost(accessToken, categoryId, subject, content);
    }

    res.send('글쓰기 요청 전송 완료');
  } catch (err) {
    logger.error(`<GET "/t-story/post" 에러 발생> ${err}`);
  }
});

module.exports = router;
