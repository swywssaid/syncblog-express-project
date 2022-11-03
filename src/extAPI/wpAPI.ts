import { content } from 'googleapis/build/src/apis/content';
import { title } from 'process';
import config from '../../config';

const request = require('request');
const today = new Date();
const year = today.getFullYear();
const month = today.getMonth() + 1;
const day = `${today.getDate()}`.padStart(2, '0');
let pastMonth: string;
const getPastMonth = () => {
  if (month == 1) {
    pastMonth = `12`;
  } else {
    pastMonth = `${month - 1}`.padStart(2, '0');
  }
  return pastMonth;
};
const currentDateString = year + '-' + month + '-' + day;
const postDateString = year + '-' + getPastMonth() + '-' + day;

export function getWPToken(): Promise<any> {
  let options = {
    url: `${config.wp.apiUri}/jwt-auth/v1/token`,
    form: {
      username: config.wp.username,
      password: config.wp.password,
    },
  };

  return new Promise((resolve, reject) => {
    request.post(options, function (error: Error, response: any, body: any) {
      if (error) reject(error);
      else if (!error && response.statusCode == 200) {
        resolve(body);
      } else {
        reject(response.body);
      }
    });
  });
}

export function getWpPosts(token: string): Promise<any> {
  let options = {
    url: `${config.wp.apiUri}/wp/v2/posts?per_page=20&_fields=${encodeURIComponent(
      'id,title,content,tags,date,jetpack_featured_media_url'
    )}`,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    request.get(options, function (error: Error, response: any, body: any) {
      if (error) reject(error);
      else if (!error && response.statusCode == 200) {
        resolve(body);
      } else {
        reject(response.body);
      }
    });
  });
}
export function getWpMonoPost(token: string): Promise<any> {
  let options = {
    url: `${config.wp.apiUri}/wp/v2/posts?per_page=1&_fields=${encodeURIComponent(
      'id,title,tags,status,date,categories,link'
    )}`,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    request.get(options, function (error: Error, response: any, body: any) {
      if (error) reject(error);
      else if (!error && response.statusCode == 200) {
        resolve(body);
      } else {
        reject(response.body);
      }
    });
  });
}
export function getWpPostsAfter(token: string): Promise<any> {
  let options = {
    url: `${config.wp.apiUri}/wp/v2/posts?after=${postDateString}T09:00:00`,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    request.get(options, function (error: Error, response: any, body: any) {
      if (error) reject(error);
      else if (!error && response.statusCode == 200) {
        resolve(body);
      } else {
        reject(response.body);
      }
    });
  });
}

export function getWpPostWrite(token: string, title: string, content: string): Promise<any> {
  let options = {
    url: `${config.wp.apiUri}/wp/v2/posts?`,
    method: 'post',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    form: {
      title: title,
      content: content,
      status: `publish`,
    },
  };

  return new Promise((resolve, reject) => {
    request.post(options, function (error: Error, response: any, body: any) {
      if (error) reject(error);
      else if (!error && response.statusCode == 200) {
        resolve(body);
      } else {
        reject(response.body);
      }
      console.log(`wppost res: ${body}`);
      // return body;
    });
  });
}
