export const STEP_BOXES = [{
  number: 1, title: 'General', isActive: false, isDisabled: true,
},{
  number: 2, title: 'Service Fee', isActive: false, isDisabled: true,
},{
  number: 3, title: 'Validator Deposit', isActive: false, isDisabled: true,
}];

export const BUTTON_STATE = {
  DEPOSIT: {key: 'deposit', value: 'Deposit'},
  WAITING_FOR_CONFIRMATION: {key: 'waiting_for_confirmation', value: 'Wait for confirmation...'},
  PENDING: {key: 'pending', value: 'Depositing...'},
  DEPOSITED: {key: 'deposited', value: 'Deposited'},
  ERROR: {key: 'error', value: 'Failed To Deposit'},
}

export const NETWORKS = {
  '1': {
    name: 'mainnet',
    displayName: 'Mainnet',
    contract: process.env.REACT_APP_MAINNET_DEPOSIT_CONTRACT_ADDRESS,
    genesis_fork_version: process.env.REACT_APP_MAINNET_GENESIS_FORK_VERSION,
  },
  '5': {
    name: 'prater',
    displayName: 'Prater',
    contract: process.env.REACT_APP_PRATER_DEPOSIT_CONTRACT_ADDRESS,
    genesis_fork_version: process.env.REACT_APP_PRATER_GENESIS_FORK_VERSION,
  },
}