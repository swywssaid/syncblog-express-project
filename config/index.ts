import dotenv from 'dotenv';

let envFound;
if (process.env.NODE_ENV) {
  envFound = dotenv.config({ path: `${process.env.NODE_ENV}.env` });
} else {
  throw new Error('process.env.NODE_ENV를 설정하지 않았습니다.');
}

if (!envFound) throw new Error('Could not find any .env file.');

let config = {
  port: parseInt(process.env.PORT!, 10),
  env: process.env.NODE_ENV,
  logs: {
    level: process.env.LOG_LEVEL,
  },
  mongodb: {
    url: process.env.MONGODB_URL,
    dbName: process.env.MONGODB_DBNAME,
    productsCollection: process.env.PRODUCTS_COLLECTION,
    usersCollection: process.env.USERS_COLLECTION,
  },
  mysql: {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  },
  slack: {
    channelId: process.env.SLACK_CHANNEL_ID,
    appToken: process.env.SLACK_APP_TOKEN,
    apiUri: process.env.SLACK_API_URI,
    channelName: process.env.SLACK_CHANNEL_NAME,
  },
  google: {
    sheetId: process.env.GOOGLE_SHEET_ID,
    sheetName: process.env.GOOGLE_SHEET_NAME,
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY,
    projectId: process.env.GOOGLE_PROJECT_ID,
    keyFileName: process.env.GOOGLE_KEY_FILE_NAME,
  },
  naver: {
    apiUri: process.env.NAVER_API_URI,
    clientIdFromWp: process.env.NAVER_CLIENT_ID_FROM_WP,
    clientSecretFromWp: process.env.NAVER_CLIENT_SECRET_FROM_WP,
    redirectUriFromWp: process.env.NAVER_REDIRECT_URI_FROM_WP,
    clientIdFromTistory: process.env.NAVER_CLIENT_ID_FROM_TISTORY,
    clientSecretFromTistory: process.env.NAVER_CLIENT_SECRET_FROM_TISTORY,
    redirectUriFromTistory: process.env.NAVER_REDIRECT_URI_FROM_TISTORY,
    clubId: process.env.NAVER_CLUB_ID,
    menuId: process.env.NAVER_MENU_ID,
    postDelay: process.env.NAVER_POST_DELAY,
    countImage: process.env.NAVER_IMAGE_COUNT,
  },
  tStory: {
    apiUri: process.env.T_STORY_API_URI,
    appIdFromWp: process.env.T_STORY_APP_ID_FROM_WP,
    secretKeyFromWp: process.env.T_STORY_SECRET_KEY_FROM_WP,
    redirectUriFromWp: process.env.T_STORY_REDIRECT_URI_FROM_WP,
    appIdToNaver: process.env.T_STORY_APP_ID_TO_NAVER,
    secretKeyToNaver: process.env.T_STORY_SECRET_KEY_TO_NAVER,
    redirectUriToNaver: process.env.T_STORY_REDIRECT_URI_TO_NAVER,
    appIdToWp: process.env.T_STORY_APP_ID_TO_WP,
    secretKeyToWp: process.env.T_STORY_SECRET_KEY_TO_WP,
    redirectUriToWp: process.env.T_STORY_REDIRECT_URI_TO_WP,
    appIdToGsheet: process.env.T_STORY_APP_ID_TO_GSHEET,
    secretKeyToGsheet: process.env.T_STORY_SECRET_KEY_TO_GSHEET,
    redirectUriToGsheet: process.env.T_STORY_REDIRECT_URI_TO_GSHEET,
    appIdToOthers: process.env.T_STORY_APP_ID_TO_OTHERS,
    secretKeyToOthers: process.env.T_STORY_SECRET_KEY_TO_OTHERS,
    redirectUriToOthers: process.env.T_STORY_REDIRECT_URI_TO_OTHERS,
    blogName: process.env.T_STORY_BLOG_NAME,
    postIdStart: process.env.T_STORY_POST_ID_START,
    postIdEnd: process.env.T_STORY_POST_ID_END,
  },
  wp: {
    apiUri: process.env.WP_API_URI,
    username: process.env.WP_USERNAME,
    password: process.env.WP_PASSWORD,
  },
};

export default config;
