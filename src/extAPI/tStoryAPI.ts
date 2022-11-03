import config from '../../config';
const request = require('request');

export function tStoryAuth(uri: string): Promise<any> {
  let options = {
    url: uri,
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

export function getTstoryTokenFromWp(code: any): Promise<any> {
  let options = {
    url: `${config.tStory.apiUri}/access_token?client_id=${config.tStory.appIdFromWp}&client_secret=${config.tStory.secretKeyFromWp}&redirect_uri=${config.tStory.redirectUriFromWp}&code=${code}&grant_type=authorization_code`,
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

export function getTstoryTokenToWp(code: any): Promise<any> {
  let options = {
    url: `${config.tStory.apiUri}/access_token?client_id=${config.tStory.appIdToWp}&client_secret=${config.tStory.secretKeyToWp}&redirect_uri=${config.tStory.redirectUriToWp}&code=${code}&grant_type=authorization_code`,
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

export function getTstoryTokenToNaver(code: any): Promise<any> {
  let options = {
    url: `${config.tStory.apiUri}/access_token?client_id=${config.tStory.appIdToNaver}&client_secret=${config.tStory.secretKeyToNaver}&redirect_uri=${config.tStory.redirectUriToNaver}&code=${code}&grant_type=authorization_code`,
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

export function getTstoryTokenToGsheet(code: any): Promise<any> {
  let options = {
    url: `${config.tStory.apiUri}/access_token?client_id=${config.tStory.appIdToGsheet}&client_secret=${config.tStory.secretKeyToGsheet}&redirect_uri=${config.tStory.redirectUriToGsheet}&code=${code}&grant_type=authorization_code`,
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

export function getTstoryTokenToOthers(code: any): Promise<any> {
  let options = {
    url: `${config.tStory.apiUri}/access_token?client_id=${config.tStory.appIdToOthers}&client_secret=${config.tStory.secretKeyToOthers}&redirect_uri=${config.tStory.redirectUriToOthers}&code=${code}&grant_type=authorization_code`,
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

export function tStoryPost(
  token: string,
  categoryId: number,
  title: string,
  content: string
): Promise<any> {
  let options = {
    url: `https://www.tistory.com/apis/post/write?`,
    method: 'post',
    form: {
      access_token: token,
      blogName: config.tStory.blogName,
      title: title,
      content: content,
      category: categoryId,
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

export function tStoryRead(token: any, postId: number): Promise<any> {
  let options = {
    url: `https://www.tistory.com/apis/post/read?access_token=${token}&blogName=${config.tStory.blogName}&postId=${postId}`,
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

export function tStoryList(token: any, page: number): Promise<any> {
  let options = {
    url: `https://www.tistory.com/apis/post/list?access_token=${token}&blogName=${config.tStory.blogName}&page=${page}`,
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
