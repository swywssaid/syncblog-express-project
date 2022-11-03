import express, { Request, Response } from 'express';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
  res.sendFile(__dirname + '/index.html');
});

module.exports = router;
