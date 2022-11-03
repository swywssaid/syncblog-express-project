import logger from '../logger';
import config from '../../config';

const { google } = require('googleapis');

export const googleAPI = async (
    scopes: string, 
    targetAPI: string, 
    version: string
) => {
    try {
        const googleAuth = new google.auth.JWT(
                                config.google.clientEmail,
                                null,
                                config.google.privateKey?.replace(/\\n/g, '\n'),
                                scopes
                            );

        const instance = await google[targetAPI]({ version: version, auth: googleAuth});

        return {
            auth: googleAuth,
            instance: instance
        };
    }
    catch(err) {
        logger.error('<Google API 에러>: ', err);
        return null;
    };
};