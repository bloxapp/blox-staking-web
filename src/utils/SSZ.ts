import {
    NumberUintType,
    ByteVector,
    ByteVectorType,
    ContainerType,
} from '@chainsafe/ssz';
import { bufferHex } from './utils';

const DepositMessage = new ContainerType({
    fields: {
        pubkey: new ByteVectorType({
            length: 48,
        }),
        withdrawalCredentials: new ByteVectorType({
            length: 32,
        }),
        amount: new NumberUintType({
            byteLength: 8,
        }),
    },
});

interface DepositMessage {
    pubkey: ByteVector;
    withdrawalCredentials: ByteVector;
    amount: Number;
}

const DepositData = new ContainerType({
    fields: {
        pubkey: new ByteVectorType({
            length: 48,
        }),
        withdrawalCredentials: new ByteVectorType({
            length: 32,
        }),
        amount: new NumberUintType({
            byteLength: 8,
        }),
        signature: new ByteVectorType({
            length: 96,
        }),
    },
});

interface DepositData {
    pubkey: ByteVector;
    withdrawalCredentials: ByteVector;
    amount: Number;
    signature: ByteVector;
}

export interface IncomingDepositData {
    pubkey: string;
    withdrawal_credentials: string;
    amount: number;
    signature: string;
    // deposit_message_root: string;
    deposit_data_root: string;
}

export const verifyDepositRoots = (
    depositDatum: IncomingDepositData
): {depositMessageRoot: Uint8Array, valid: boolean} => {
    const depositMessage: DepositMessage = {
        pubkey: bufferHex(depositDatum.pubkey),
        withdrawalCredentials: bufferHex(depositDatum.withdrawal_credentials),
        amount: Number(depositDatum.amount),
    };
    const depositMessageRoot = DepositMessage.hashTreeRoot(depositMessage);

    const depositData: DepositData = {
        pubkey: bufferHex(depositDatum.pubkey),
        withdrawalCredentials: bufferHex(depositDatum.withdrawal_credentials),
        amount: Number(depositDatum.amount),
        signature: bufferHex(depositDatum.signature),
    };
    if (
        // bufferHex(depositDatum.deposit_message_root).compare(
        //     DepositMessage.hashTreeRoot(depositMessage)
        // ) === 0 &&
        bufferHex(depositDatum.deposit_data_root).compare(
            DepositData.hashTreeRoot(depositData)
        ) === 0
    ) {
        return {depositMessageRoot, valid: true};
    }
    return {depositMessageRoot, valid: false};
};

export const SigningData = new ContainerType({
    fields: {
        objectRoot: new ByteVectorType({
            length: 32,
        }), // Ideally this would be a RootType, but AFIK, there is no generic expanded type for roots in @chainsafe/ssz
        domain: new ByteVectorType({
            length: 32,
        }),
    },
});

export interface SigningData {
    objectRoot: ByteVector;
    domain: ByteVector;
}

export const ForkData = new ContainerType({
    fields: {
        currentVersion: new ByteVectorType({
            length: 4,
        }),
        genesisValidatorsRoot: new ByteVectorType({
            length: 32,
        }),
    },
});

export interface ForkData {
    currentVersion: ByteVector;
    genesisValidatorsRoot: ByteVector;
}
