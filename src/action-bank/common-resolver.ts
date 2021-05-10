import { UserToken } from "@dataTypes";
import { isRecord } from '@dataTypes/type-guards';

abstract class CommonResolver {
  getUserTokenFromContext(ctx: unknown): UserToken {
    if (!isRecord(ctx)
      || !isRecord(ctx.koaCtx)
      || !isRecord(ctx.koaCtx.state)
      || !isRecord(ctx.koaCtx.state.user)
    ) {
      throw new Error('Invalid Context State Data');
    }

    let requestingUser: UserToken;

    try {
      requestingUser = UserToken.fromJson(ctx.koaCtx.state.user);
    } catch(e) {
      throw new Error('Invalid User Data');
    }

    return requestingUser;
  }
}

export default CommonResolver;