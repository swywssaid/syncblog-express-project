import config from '../../config';
import logger from '../logger';
import { googleAPI } from '../extAPI/googleAPI';
import { getWPToken, getWpPosts } from '../extAPI/wpAPI';

async function WriteWpToGsheet() {
  try {
    const wpTokenInfo = await getWPToken();
    const wpToken = JSON.parse(wpTokenInfo).token;
    const postsInfo = await getWpPosts(wpToken);
    const postsINfo2 = JSON.parse(postsInfo);
    // console.log(postsINfo2);
    const googleSheets = await googleAPI(
      'https://www.googleapis.com/auth/spreadsheets',
      'sheets',
      'v4'
    );

    // set resource
    let values = [];
    for (let i = 0; i < postsINfo2.length; i++) {
      // let menuId = parseInt('1');
      // let subject = encodeURI(postsINfo2[i]['title']['rendered']);
      // let content = encodeURI(postsINfo2[i]['content']['rendered']);
      // let date = encodeURI(postsINfo2[i].date);
      // let id = parseInt(postsINfo2[i].id);
      // console.log(content)
      console.log(i, ' title ', postsINfo2[i]['title']['rendered']);
      // console.log(i, " all ", postsINfo2[i]);
      values.push([postsINfo2[i]['title']['rendered']]);
    }
    const body = {
      values: values,
    };

    // google sheet api: write
    let writeSheets = await googleSheets?.instance.spreadsheets.values.update({
      auth: googleSheets?.auth,
      spreadsheetId: config.google.sheetId,
      range: `${config.google.sheetName}!A2:A${postsINfo2.length + 1}`,
      valueInputOption: 'RAW',
      resource: body,
    });
  } catch (err) {
    logger.error(`WriteWpToGsheet() 에러 발생> ${err}`);
  }
}

WriteWpToGsheet();
