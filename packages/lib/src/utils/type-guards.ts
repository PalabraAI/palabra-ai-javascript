import { ClientCredentialsAuth, UserTokenAuth } from '~/PalabraClient.model';

export function isClientCredentialsAuth(
  auth: ClientCredentialsAuth | UserTokenAuth,
): auth is ClientCredentialsAuth {
  return 'clientId' in auth && 'clientSecret' in auth;
}
