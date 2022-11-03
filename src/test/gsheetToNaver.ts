import express, { Request, Response } from 'express';
import config from '../../config';
import logger from '../logger';
import { googleAPI } from '../extAPI/googleAPI';
import sheetsToObject from '../utilities/sheetsToObject';
import { naverLogin, getNaverTokenWp, naverPost } from '../extAPI/naverAPI';

const router = express.Router();
const state = 'randomstate';

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const uri = `${config.naver.apiUri}/authorize?response_type=code&client_id=${
      config.naver.clientIdWp
    }&redirect_uri=${encodeURI(config.naver.redirectUriWp!)}&state=${state}`;
    await naverLogin(uri);
    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
    res.end(`<a href=${uri}>click here to get the code</a>`);
  } catch (err) {
    logger.error(`<GET "/naver" 에러 발생> ${err}`);
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
      (data) => data.checked === 'TRUE' && data.platform === 'naver'
    );

    const tokenResponse = await getNaverTokenWp(req.query.code);
    const tokenInfo = JSON.parse(tokenResponse.body!);

    const delayTime = parseInt(`${config.naver.postDelay}`);

    function delay(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    // upload time limit: 60sec
    async function unploadDelay() {
      for (let i = 0; i < checkedSheetsData.length; i++) {
        let menuId = parseInt(checkedSheetsData[i].menuId);
        let subject = encodeURI(checkedSheetsData[i].title);
        let content = encodeURI(checkedSheetsData[i].content);

        await delay(100);
        console.log(i, new Date(), checkedSheetsData[i].title);
        naverPost(tokenInfo.access_token, menuId, subject, content);
      }
    }
    unploadDelay();

    res.send('글쓰기 요청 전송 완료');
  } catch (err) {
    logger.error(`<GET "/naver/post" 에러 발생> ${err}`);
  }
});

module.exports = router;
