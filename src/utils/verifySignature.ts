import { verify } from '@chainsafe/bls';
import { ForkData, IncomingDepositData, SigningData } from './SSZ';
import { bufferHex } from './utils';

const DOMAIN_DEPOSIT = Buffer.from('03000000', 'hex');
const EMPTY_ROOT = Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex');

const computeForkDataRoot = (
  currentVersion: Uint8Array,
  genesisValidatorsRoot: Uint8Array
): Uint8Array => {
  const forkData: ForkData = {
    currentVersion: currentVersion as Uint8Array,
    genesisValidatorsRoot,
  };
  return ForkData.hashTreeRoot(forkData);
};

const computeDomain = (
  domainType: Buffer,
  forkVersion: Buffer | string,
  genesisValidatorsRoot: Buffer = EMPTY_ROOT
): Uint8Array => {
  const forkDataRoot = computeForkDataRoot(
    forkVersion as Uint8Array,
    genesisValidatorsRoot
  );
  const domain = new Uint8Array(32);
  domain.set(domainType);
  domain.set(forkDataRoot.subarray(0, 28), 4);
  return domain;
};

const computeSigningRoot = (
  sszObjectRoot: Uint8Array,
  domain: Uint8Array
): Uint8Array => {
  const signingData: SigningData = {
    objectRoot: sszObjectRoot,
    domain,
  };
  return SigningData.hashTreeRoot(signingData);
};

// Note: usage of this method requires awaiting the initBLS() method from "@chainsafe/bls";
export const verifySignature = (forkVersion: Buffer | string, depositDatum: IncomingDepositData, deposit_message_root: Uint8Array): boolean => {
  const pubkeyBuffer = bufferHex(depositDatum.pubkey);
  const signatureBuffer = bufferHex(depositDatum.signature);
  const depositMessageBuffer = Buffer.from(deposit_message_root.buffer);
  const domain = computeDomain(DOMAIN_DEPOSIT, forkVersion);
  const signingRoot = computeSigningRoot(depositMessageBuffer, domain);
  return verify(pubkeyBuffer, signingRoot, signatureBuffer);
};
