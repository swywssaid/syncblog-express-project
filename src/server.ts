import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import config from '../config';
import logger from './logger';

const app = express();

const root = require('./routes/root');
const wpToNaver = require('./routes/wpToNaver');
const wpToTistory = require('./routes/wpToTistory');
const syncTistory = require('./routes/syncTistory');
const syncWordpress = require('./routes/syncWordpress');
const monoTistoryToNaver = require('./routes/monoTistoryToNaver');
const monoTistoryToWp = require('./routes/monoTistoryToWp');
const mysqlTogsheet = require('./routes/mysqlTogsheet');
const monoTistoryToOthers = require('./routes/monoTistoryToOthers');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// connectMongoDB()
//     .then(client => {
// app.use((req:Request, res:Response, next:NextFunction) => {
//     req.db = client.db(config.mongodb.dbName);
//     next();
// });

app.use('/', root);
app.use('/wp-naver', wpToNaver);
app.use('/wp-tistory', wpToTistory);
app.use('/sync-tistory', syncTistory);
app.use('/sync-wp', syncWordpress);
app.use('/tistory-naver', monoTistoryToNaver);
app.use('/tistory-wp', monoTistoryToWp);
app.use('/mysql-gsheet', mysqlTogsheet);
app.use('/tistory-others', monoTistoryToOthers);

app.listen(config.port, () => {
  logger.info(`Server is running on ${config.port}`);
});

// })
// .catch(err => {
// logger.error(`<DB 연결 중 에러> ${err}`);
// });
