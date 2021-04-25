import jwt = require("koa-jwt");

function useRouteProtection() {
  const secret = process.env.jwt_secret ?? 'default_secret';
  // console.log('route protection', secret);
  return jwt({secret});
}

export {
  useRouteProtection,
};