import config from '../../config';
import { naverAPIResponseType } from '../types';
const request = require('request');

const state = 'randomstate';

export function naverLogin(url: string): Promise<naverAPIResponseType> {
  let options = {
    url: url,
  };

  return new Promise((resolve, reject) => {
    request.post(options, function (error: Error, response: any, body: any) {
      if (error) reject(error);
      else if (!error && response.statusCode == 200) {
        resolve({
          body: body,
          statusCode: response.statusCode,
        });
      } else {
        reject(response.body);
      }
    });
  });
}

export function getNaverTokenFromWp(code: any): Promise<naverAPIResponseType> {
  let options = {
    url: `${config.naver.apiUri}/token?grant_type=authorization_code&client_id=${config.naver.clientIdFromWp}&client_secret=${config.naver.clientSecretFromWp}&code=${code}&state=${state}`,
    headers: {
      'X-Naver-Client-Id': config.naver.clientIdFromWp,
      'X-Naver-Client-Secret': config.naver.clientSecretFromWp,
    },
  };

  return new Promise((resolve, reject) => {
    request.get(options, function (error: Error, response: any, body: any) {
      if (error) reject(error);
      else if (!error && response.statusCode == 200) {
        resolve({
          body: body,
          statusCode: response.statusCode,
        });
      } else {
        reject(response.body);
      }
    });
  });
}

export function getNaverTokenFromTistory(code: any): Promise<naverAPIResponseType> {
  let options = {
    url: `${config.naver.apiUri}/token?grant_type=authorization_code&client_id=${config.naver.clientIdFromTistory}&client_secret=${config.naver.clientSecretFromTistory}&code=${code}&state=${state}`,
    headers: {
      'X-Naver-Client-Id': config.naver.clientIdFromTistory,
      'X-Naver-Client-Secret': config.naver.clientSecretFromTistory,
    },
  };

  return new Promise((resolve, reject) => {
    request.get(options, function (error: Error, response: any, body: any) {
      if (error) reject(error);
      else if (!error && response.statusCode == 200) {
        resolve({
          body: body,
          statusCode: response.statusCode,
        });
      } else {
        reject(response.body);
      }
    });
  });
}

export function naverPost(
  token: string,
  menuId: number,
  subject: string,
  content: string
): Promise<naverAPIResponseType> {
  let options = {
    url: `https://openapi.naver.com/v1/cafe/${config.naver.clubId}/menu/${menuId}/articles`,
    headers: { Authorization: `Bearer ${token}` },
    form: {
      subject: subject,
      content: content,
    },
  };

  return new Promise((resolve, reject) => {
    request.post(options, function (error: Error, response: any, body: any) {
      // console.log(response.body);
      if (error) reject(error);
      else if (!error && response.statusCode == 200) {
        resolve({
          body: body,
          statusCode: response.statusCode,
        });
      } else {
        reject(response.body);
      }
    });
  });
}
export function naverPostImage(
  token: string,
  menuId: number,
  subject: string,
  content: string,
  image: any
): Promise<naverAPIResponseType> {
  const url = `https://openapi.naver.com/v1/cafe/${config.naver.clubId}/menu/${menuId}/articles`;
  let _formData = {
    subject: subject,
    content: content,
    image: image,
    openyn: 'true',
  };

  return new Promise((resolve, reject) => {
    const _req = request.post(
      {
        url: url,
        formData: _formData,
        headers: { Authorization: `Bearer ${token}` },
      },
      function (error: Error, response: any, body: any) {
        // console.log(response.body);
        if (error) reject(error);
        else if (!error && response.statusCode == 200) {
          resolve({
            body: body,
            statusCode: response.statusCode,
          });
        } else {
          reject(response.body);
        }
        console.log(body);
        return body;
      }
    );
  });
}
