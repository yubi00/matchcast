import config from './config';
import app from './app';
import logger from './utils/logger';

app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Server started');
});
