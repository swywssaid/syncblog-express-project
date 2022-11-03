import config from '../../config';
import { mongoClientType } from '../types';
const { MongoClient } = require('mongodb');

const connectMongoDB: () => Promise<mongoClientType> = () => {
    return new Promise((resolve, reject) => {
      MongoClient.connect(
        config.mongodb.url,
        {
          // connectTimeoutMS: 30000,
          // keepAlive: 1,
          useUnifiedTopology: true,
          useNewUrlParser: true,
        },
        (err: Error, client: mongoClientType) => {
          if(err) {
            reject(err);
            return;
          }
      
          resolve(client);
        }
      );
    });
};

export default connectMongoDB;