import { IApiResponseFormat } from '@/interfaces';
import { LoginPayloadDto } from '@/modules/auth-siwe/dto/login-payload.dto';
import { SiweMessagePayload } from '@/modules/auth-siwe/dto/siwe-message-payload.dto';
import dotenv from 'dotenv';
import { setTimeout } from 'timers/promises';
import { Address, Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hardhat } from 'viem/chains';

dotenv.config();

async function run() {
  // generate SIWE message
  const BASE_URL = 'http://localhost:3000/v1/auth';
  const getURL = new URL(`${BASE_URL}/siweMessage`);
  const chain = hardhat;
  const wallet_address = process.env['TEST_WALLET_ADDRESS'] as Address;

  getURL.searchParams.set('wallet_address', wallet_address);
  getURL.searchParams.set('chain_id', chain.id.toString());

  const response = (await (
    await fetch(getURL)
  ).json()) as IApiResponseFormat<SiweMessagePayload>;
  console.log(JSON.stringify(response, undefined, 4));

  // sign message
  const signature = await privateKeyToAccount(
    process.env['TEST_WALLET_KEY'] as Hex,
  ).signMessage({
    message: response.data.message,
  });

  await setTimeout(2000);

  // login
  const login_resp = await fetch(`${BASE_URL}/login`, {
    body: new URLSearchParams({
      signature,
      wallet_address,
      chain_id: chain.id.toString(),
    }),
    method: 'post',
  });

  const login_payload =
    (await login_resp.json()) as IApiResponseFormat<LoginPayloadDto>;

  console.log(login_payload);

  const accessToken: string = login_payload.data.token.accessToken;
  console.log('accessToken:', accessToken);
}

run().catch((err) => console.error(err));
