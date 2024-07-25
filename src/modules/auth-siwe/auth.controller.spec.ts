import { IApiResponseFormat } from '@/interfaces';
import { setTimeout } from 'timers/promises';
import { Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bscTestnet } from 'viem/chains';
import { LoginPayloadDto } from './dto/login-payload.dto';
import { SiweMessagePayload } from './dto/siwe-message-payload.dto';

const BASE_URL = 'http://localhost:3000/v1/auth';

const CHAIN = bscTestnet;

describe('Auth-SIWE', () => {
  async function generateSiweMessage(wallet_address: Address) {
    const getURL = new URL(`${BASE_URL}/siweMessage`);
    getURL.searchParams.set('wallet_address', wallet_address);
    getURL.searchParams.set('chain_id', CHAIN.id.toString());

    const response = await (await fetch(getURL)).json();
    console.log(JSON.stringify(response, undefined, 4));

    return response as IApiResponseFormat<SiweMessagePayload>;
  }

  it.skip('Generate SIWE message', async function () {
    console.log(
      await generateSiweMessage('0x2B19dd6d68aD8b2Dc8c2343b6723422e2Eb9814D'),
    );
  });

  it('Login/Logout', async function () {
    const wallet_address = '0x2B19dd6d68aD8b2Dc8c2343b6723422e2Eb9814D';
    const private_key =
      '0x23eaf3d9ac2d8a081c38d19f93bcb19c8d2c87a6ff02c876b3a745cf9066a6a5';

    // generate SIWE message
    const {
      data: { message },
    } = await generateSiweMessage(wallet_address);

    // sign message
    const signature = await privateKeyToAccount(private_key).signMessage({
      message,
    });

    console.log('done sign');
    await setTimeout(2000);

    // login
    const login_resp = await fetch(`${BASE_URL}/login`, {
      body: new URLSearchParams({
        signature,
        wallet_address,
        chain_id: CHAIN.id.toString(),
      }),
      method: 'post',
    });

    const login_payload =
      (await login_resp.json()) as IApiResponseFormat<LoginPayloadDto>;

    console.log(login_payload);

    const accessToken: string = login_payload.data.token.accessToken;
    console.log('accessToken:', accessToken);

    // wait for 2 seconds
    await setTimeout(2000);

    // logout
    const logout_resp = await fetch(`${BASE_URL}/logout`, {
      method: 'post',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    console.log(await logout_resp.json());

    // wait for 3 seconds
    await setTimeout(3000);

    // re-logout  (should fail w/ UnauthorizedException)
    console.log(
      await (
        await fetch(`${BASE_URL}/logout`, {
          method: 'post',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      ).json(),
    );
  }, 100000);
});
