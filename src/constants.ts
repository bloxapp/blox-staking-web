import Web3 from "web3";

export const DEPOSIT_AMOUNT_ETHER = '32';
export const DEPOSIT_AMOUNT_WEI = Web3.utils.toWei(DEPOSIT_AMOUNT_ETHER, 'ether');
export const DEPOSIT_AMOUNT_GWEI = Web3.utils.fromWei(DEPOSIT_AMOUNT_WEI, 'gwei');
