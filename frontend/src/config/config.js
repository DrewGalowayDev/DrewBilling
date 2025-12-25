// Use relative path for production (same domain as frontend)
// Use localhost for development
const PRODUCTION_URL = '';
const DEVELOPMENT_URL = 'http://localhost:5000';

export const API_URL = import.meta.env.PROD ? PRODUCTION_URL : DEVELOPMENT_URL;

const config = {
  API_URL,
  ENDPOINTS: {
    // Auth endpoints
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      ADMIN_LOGIN: '/api/auth/admin/login',
    },
    // MPESA endpoints
    MPESA: {
      STK_PUSH: '/api/mpesa/stkpush',
      CALLBACK: '/api/mpesa/callback',
      QUERY: '/api/mpesa/query',
    },
    // Other endpoints...
  }
};

export default config;
