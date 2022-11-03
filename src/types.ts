declare module 'express' {
  export interface Request {
    db?: any;
    payload?: any;
  }
}

export interface mongoClientType {
  db?: any;
}

export interface naverAPIResponseType {
  body?: string;
  statusCode: number;
}

declare global {
  const accessTokenTistory: any;
}
