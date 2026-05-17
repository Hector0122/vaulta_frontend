import Config from 'react-native-config';

const port = Config.PORT ? `:${Config.PORT}` : ''
export const BASE_URL = `${Config.BASE_URL || 'http://localhost'}${port}`;