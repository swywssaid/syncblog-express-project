import logger from '../logger';
import config from '../../config';
import { artifactregistry_v1beta1 } from 'googleapis';
import { error } from 'console';

const cheerio = require('cheerio');
const fs = require('fs');
const client = require('https');
const path = require('path');
const rimraf = require('rimraf');

const parsing = {
  /**
   * delete tags, attributes & convert string to html
   * 콘텐츠플랫폼api에서 글작성시, 호환 안되는 tag attr 값들 파싱삭제함
   * @param  str 특정 태그, 속성을 삭제하고 싶은 글
   * @returns  html로 반환함
   */
  parseWriting: function (str: string): any {
    const $ = cheerio.load(str);

    // 삭제해야되는 tag - naver cafe 글작성 시 해당 tag 있으면 에러
    const unusableTags = [
      'img',
      'script',
      'iframe',
      'embed',
      'button',
      'figure',
      'a',
      'link',
      'style',
    ];

    // 삭제해야되는 attr - naver cafe 글작성 시 해당 tag 있으면 에러
    const unusableAttrs = [
      'style',
      'class',
      'id',
      `data-ke-size`,
      'data-ke-style',
      'data-ke-type',
      'data-ke-list-type',
      'contenteditable',
    ];

    // 사용가능한 태그 - 해당 태그에 있는 속성 제거
    const usableTags = ['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'hr', 'blockquote', 'ul'];

    // const img = $('img').get();
    for (let i = 0; i < unusableTags.length; i++) {
      while ($('html').find(unusableTags[i]).length !== 0) {
        $(unusableTags[i]).remove();
      }
    }

    for (let i = 0; i < unusableAttrs.length; i++) {
      usableTags.forEach((tag) => $(tag).removeAttr(unusableAttrs[i]));
    }
    return $.html();
  },
  /** 
  convert string to html
  @param  str html로 바꾸고 싶은 문자열
  @return  html 반환
  */
  ConvertStringToHTML: function (str: string) {
    const $ = cheerio.load(str);
    return $.html();
  },
  /**
  parseWriting()을 통해 특정 태그나 속성을 제거해 길이 조절
  @param  str 파싱하고 싶은 글
  @param  len 파싱하는 글의 길이, 해당 길이 이상이면 파싱
  @return 파싱된 글
  */
  limitLength: function (str: string, len: number): string {
    if (str.length >= len) {
      const parsedStr = this.parseWriting(str);
      console.log(parsedStr);
      return parsedStr;
    } else {
      const parsedStr = str;
      console.log(parsedStr);
      return parsedStr;
    }
  },
  /**
   * url을 통해 원하는 위치에 원하는 이름으로 이미지를 다운받는다.
   * @param url 다운 받을 이미지 url
   * @param filepath 다운 받을 이미지 위치 및 파일 명(e.g. 'image/image.jpg')
   */
  downloadImage: function (url: string, filepath: string) {
    return new Promise((resolve, reject) => {
      client.get(url, (res: any) => {
        if (res.statusCode === 200) {
          res
            .pipe(fs.createWriteStream(filepath))
            .on('error', reject)
            .once('close', () => resolve(filepath));
        } else {
          // Consume response data to free up memory
          res.resume();
          reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
        }
      });
    });
  },
  /**
   * 폴더 생성
   * @param dirpath 폴더를 만들 위치
   * @param dirname 만들 폴더명
   */
  makeDirectory: async function (dirpath: string, dirname: string) {
    try {
      await fs.mkdir(path.join(dirpath, dirname), { recursive: true }, (err: string) => {});
    } catch (err) {
      logger.error(`parsing.makeDirectory() 에러 발생 ${err}`);
    }
  },
  /**
   * 폴더 제거, 빈 폴더가 아니여도 제거 가능
   * @param dirpath 제거할 폴더가 있는 위치
   * @param dirname 제거할 폴더명
   */
  removeDirectory: async function (dirpath: string, dirname: string) {
    try {
      await rimraf(path.join(dirpath, dirname), { recursive: true }, (err: string) => {});
    } catch (err) {
      logger.error(`parsing.removeDirectory() 에러 발생 ${err}`);
    }
  },
  // /**
  //  * 글에 있는 이미지 태그를 아래와 같은 순서로 다운 받음
  //  * 1. 이미지를 다운 받을 폴더 생성
  //  * 2. 해당 폴더에 이미지 다운
  //  * @param writing 이미지 태그를 다운 받을 글
  //  * @param dirpath 이미지를 다운 받을 폴더 경로
  //  * @param dirname 이미지를 다운 받을 폴더명
  //  * @returns image의 정보가 담긴 배열
  //  */
  // downloadImageOfImgtag: async function (writing: string, dirpath: string, dirname: string) {
  //   const $ = cheerio.load(writing);
  //   let img = $('img').get();
  //   console.log(img, img.length, parseInt(`${config.naver.countImage}`));
  //   let image: Array<any> = [];
  //   // 글에 이미지 없을 시 중지
  //   if (img.length == 0) {
  //     Promise.reject('parsing.downloadImageOfImgtag(): There is no image!');
  //   }
  //   await this.makeDirectory(dirpath, dirname);

  //   // 특정 attr 값이 들어간 이미지만 추출되게 하면 될듯
  //   // 일단 publish=true 값이 들어간 이미지만 이용작성되게

  //   // 기본 3개 할건지, 몇개할건지 환경변수로 집어넣거나, request param으로 받아서 처리할수 있게?
  //   if (img.length < parseInt(`${config.naver.countImage}`)) {
  //     for (let k = 0; k < img.length; k++) {
  //       if (img[k].attribs.publish == undefined) {
  //         console.log(`img[${k}] does not have 'publish' attr!`);
  //       } else if (img[k].attribs.publish == 'true') {
  //         const imgSrc = String(img[k].attribs.src);
  //         console.log(`img${k} src:`, imgSrc);

  //         await this.downloadImage(imgSrc, `${dirpath}${dirname}/image${k}.jpeg`)
  //           .then((result: any) => {
  //             console.log(result);
  //             image.push({
  //               value: fs.createReadStream(`${dirpath}${dirname}/image${k}.jpeg`),
  //               options: { filename: `image${k}.jpeg`, contentType: 'image/jpeg' },
  //             });
  //           })
  //           .catch((err: any) => {
  //             logger.error(err);
  //             return Promise.reject(err);
  //           });
  //       } else {
  //         console.log(`img[${k}] does not have 'publish' attr!`);
  //       }
  //     }
  //   } else {
  //     for (let j = 0; j < parseInt(`${config.naver.countImage}`); j++) {
  //       if (img[j].attribs.publish == undefined) {
  //         console.log(`img[${j}] does not have 'publish' attr!`);
  //       } else if (img[j].attribs.publish == 'true') {
  //         const imgSrc = String(img[j].attribs.src);
  //         console.log(`img${j} src:`, imgSrc);

  //         await this.downloadImage(imgSrc, `${dirpath}${dirname}/image${j}.jpeg`)
  //           .then((result: any) => {
  //             console.log(result);
  //             image.push({
  //               value: fs.createReadStream(`${dirpath}${dirname}/image${j}.jpeg`),
  //               options: { filename: `image${j}.jpeg`, contentType: 'image/jpeg' },
  //             });
  //           })
  //           .catch((err: any) => {
  //             logger.error(err);
  //             return Promise.reject(err);
  //           });
  //       } else {
  //         console.log(`img[${j}] does not have 'publish' attr!`);
  //       }
  //     }
  //   }
  //   return Promise.resolve(image);
  // },

  // /**
  //  * 글에 있는 이미지 태그를 아래와 같은 순서로 다운 받음
  //  * 1. 이미지를 다운 받을 폴더 생성
  //  * 2. 해당 폴더에 이미지 다운
  //  * @param writing 이미지 태그를 다운 받을 글
  //  * @param dirpath 이미지를 다운 받을 폴더 경로
  //  * @param dirname 이미지를 다운 받을 폴더명
  //  * @returns image의 정보가 담긴 배열
  //  */
  // downloadImageOfImgtag: async function (writing: string, dirpath: string, dirname: string) {
  //   const $ = cheerio.load(writing);
  //   let img = $('img').get();
  //   console.log(img, img.length, parseInt(`${config.naver.countImage}`));
  //   let image: Array<any> = [];
  //   // 글에 이미지 없을 시 중지
  //   if (img.length == 0) {
  //     Promise.reject('parsing.downloadImageOfImgtag(): There is no image!');
  //   }
  //   await this.makeDirectory(dirpath, dirname);

  //   // 특정 attr 값이 들어간 이미지만 추출되게 하면 될듯
  //   // 일단 publish=true 값이 들어간 이미지만 이용작성되게

  //   // 기본 3개 할건지, 몇개할건지 환경변수로 집어넣거나, request param으로 받아서 처리할수 있게?
  //   for (let j = 0; j < parseInt(`${config.naver.countImage}`); j++) {
  //     if (img[j].attribs.publish == undefined) {
  //       console.log(`img[${j}] does not have 'publish' attr!`);
  //     } else if (img[j].attribs.publish == 'true') {
  //       const imgSrc = String(img[j].attribs.src);
  //       console.log(`img${j} src:`, imgSrc);

  //       await this.downloadImage(imgSrc, `${dirpath}${dirname}/image${j}.jpeg`)
  //         .then((result: any) => {
  //           console.log(result);
  //           image.push({
  //             value: fs.createReadStream(`${dirpath}${dirname}/image${j}.jpeg`),
  //             options: { filename: `image${j}.jpeg`, contentType: 'image/jpeg' },
  //           });
  //         })
  //         .catch((err: any) => {
  //           logger.error(err);
  //           return Promise.reject(err);
  //         });
  //     }
  //   }

  //   return Promise.resolve(image);
  // },
  // /**
  //  * 글에 있는 이미지 태그를 아래와 같은 순서로 다운 받음
  //  * 1. 이미지를 다운 받을 폴더 생성
  //  * 2. 해당 폴더에 이미지 다운
  //  * @param writing 이미지 태그를 다운 받을 글
  //  * @param dirpath 이미지를 다운 받을 폴더 경로
  //  * @param dirname 이미지를 다운 받을 폴더명
  //  * @returns image의 정보가 담긴 배열
  //  */
  // downloadImageOfImgtagFromTistory: async function (
  //   writing: string,
  //   dirpath: string,
  //   dirname: string,
  //   checkTistory: Boolean
  // ) {
  //   const $ = cheerio.load(writing);
  //   let img = $('img').get();
  //   console.log(img, img.length, parseInt(`${config.naver.countImage}`));
  //   let image: Array<any> = [];
  //   // 글에 이미지 없을 시 중지
  //   if (img.length == 0) {
  //     logger.error('parsing.downloadImageOfImgtag(): There is no image!');
  //     return console.log('parsing.downloadImageOfImgtag(): There is no image!');
  //   }
  //   await this.makeDirectory(dirpath, dirname);

  //   // 특정 attr 값이 들어간 이미지만 추출되게 하면 될듯
  //   // 일단 publish=true 값이 들어간 이미지만 이용작성되게

  //   // 기본 3개 할건지, 몇개할건지 환경변수로 집어넣거나, request param으로 받아서 처리할수 있게?
  //   for (let j = 0; j < parseInt(`${config.naver.countImage}`); j++) {
  //     if (img[j].attribs.publish == undefined) {
  //       console.log(`img[${j}] does not have 'publish' attr!`);
  //     } else if (img[j].attribs.publish == 'true') {
  //       const imgSrc = String(img[j].attribs.src);
  //       console.log(`img${j} src:`, imgSrc);

  //       await this.downloadImage(imgSrc, `${dirpath}${dirname}/image${j}.jpeg`)
  //         .then((result: any) => {
  //           console.log(result);
  //           image.push({
  //             value: fs.createReadStream(`${dirpath}${dirname}/image${j}.jpeg`),
  //             options: { filename: `image${j}.jpeg`, contentType: 'image/jpeg' },
  //           });
  //         })
  //         .catch((err: any) => {
  //           logger.error(err);
  //           return Promise.reject(err);
  //         });
  //     }
  //   }

  //   return Promise.resolve(image);
  // },
  /**
   * 글에 있는 이미지 태그를 아래와 같은 순서로 다운 받음
   * 1. 이미지를 다운 받을 폴더 생성
   * 2. 해당 폴더에 이미지 다운
   * @param writing 이미지 태그를 다운 받을 글
   * @param dirpath 이미지를 다운 받을 폴더 경로
   * @param dirname 이미지를 다운 받을 폴더명
   * @returns image의 정보가 담긴 배열
   */
  downloadImageOfImgtag: async function (
    writing: string,
    dirpath: string,
    dirname: string,
    checkTistory: Boolean
  ): Promise<any> {
    const $ = cheerio.load(writing);
    let img = $('img').get();
    console.log(img, img.length, parseInt(`${config.naver.countImage}`));
    let image: Array<any> = [];
    // 글에 이미지 없을 시 중지
    if (img.length == 0) {
      logger.error('parsing.downloadImageOfImgtag(): There is no image!');
      return console.log('parsing.downloadImageOfImgtag(): There is no image!');
    }
    await this.makeDirectory(dirpath, dirname);

    // 특정 attr 값이 들어간 이미지만 추출되게 하면 될듯
    // 일단 publish='true' 값이 들어간 이미지만 이용작성되게

    // 기본 3개 할건지, 몇개할건지 환경변수로 집어넣거나, request param으로 받아서 처리할수 있게?
    if (checkTistory == true) {
      if (img.length < parseInt(`${config.naver.countImage}`)) {
        for (let k = 0; k < img.length; k++) {
          const imgSrc = String(img[k].attribs.src);
          console.log(`img${k} src:`, imgSrc);

          await this.downloadImage(imgSrc, `${dirpath}${dirname}/image${k}.jpeg`)
            .then((result: any) => {
              console.log(result);
              image.push({
                value: fs.createReadStream(`${dirpath}${dirname}/image${k}.jpeg`),
                options: { filename: `image${k}.jpeg`, contentType: 'image/jpeg' },
              });
            })
            .catch((err: any) => {
              logger.error(err);
              return Promise.reject(err);
            });
        }
      } else {
        for (let j = 0; j < parseInt(`${config.naver.countImage}`); j++) {
          const imgSrc = String(img[j].attribs.src);
          console.log(`img${j} src:`, imgSrc);

          await this.downloadImage(imgSrc, `${dirpath}${dirname}/image${j}.jpeg`)
            .then((result: any) => {
              console.log(result);
              image.push({
                value: fs.createReadStream(`${dirpath}${dirname}/image${j}.jpeg`),
                options: { filename: `image${j}.jpeg`, contentType: 'image/jpeg' },
              });
            })
            .catch((err: any) => {
              logger.error(err);
              return Promise.reject(err);
            });
        }
      }
    } else {
      if (img.length < parseInt(`${config.naver.countImage}`)) {
        for (let k = 0; k < img.length; k++) {
          if (img[k].attribs.publish == undefined) {
            console.log(`img[${k}] does not have 'publish' attr!`);
          } else if (img[k].attribs.publish == 'true') {
            const imgSrc = String(img[k].attribs.src);
            console.log(`img${k} src:`, imgSrc);

            await this.downloadImage(imgSrc, `${dirpath}${dirname}/image${k}.jpeg`)
              .then((result: any) => {
                console.log(result);
                image.push({
                  value: fs.createReadStream(`${dirpath}${dirname}/image${k}.jpeg`),
                  options: { filename: `image${k}.jpeg`, contentType: 'image/jpeg' },
                });
              })
              .catch((err: any) => {
                logger.error(err);
                return Promise.reject(err);
              });
          } else {
            console.log(`img[${k}] does not have 'publish' attr!`);
          }
        }
      } else {
        for (let j = 0; j < parseInt(`${config.naver.countImage}`); j++) {
          if (img[j].attribs.publish == undefined) {
            console.log(`img[${j}] does not have 'publish' attr!`);
          } else if (img[j].attribs.publish == 'true') {
            const imgSrc = String(img[j].attribs.src);
            console.log(`img${j} src:`, imgSrc);

            await this.downloadImage(imgSrc, `${dirpath}${dirname}/image${j}.jpeg`)
              .then((result: any) => {
                console.log(result);
                image.push({
                  value: fs.createReadStream(`${dirpath}${dirname}/image${j}.jpeg`),
                  options: { filename: `image${j}.jpeg`, contentType: 'image/jpeg' },
                });
              })
              .catch((err: any) => {
                logger.error(err);
                return Promise.reject(err);
              });
          } else {
            console.log(`img[${j}] does not have 'publish' attr!`);
          }
        }
      }
    }
    return Promise.resolve(image).catch((err: any) => {
      logger.error(err);
      return Promise.reject(err);
    });
  },
};
export default parsing;
