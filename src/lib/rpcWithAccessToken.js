/** Run one RPC with the access token captured when its owning action began. */
export function rpcWithAccessToken(client, functionName, args = {}, accessToken = '') {
  if (!accessToken) {
    return Promise.resolve({ data: null, error: new Error('An authenticated session is required for this RPC.') });
  }
  if (typeof client?.rpcWithAccessToken === 'function') {
    return client.rpcWithAccessToken(functionName, args, accessToken);
  }
  try {
    const request = client?.rpc?.(functionName, args);
    return typeof request?.setHeader === 'function'
      ? request.setHeader('Authorization', `Bearer ${accessToken}`)
      : request;
  } catch (error) {
    return Promise.resolve({ data: null, error });
  }
}
