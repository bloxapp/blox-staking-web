import axios from 'axios';
import {notification} from 'antd';
// import jwtDecode from 'jwt-decode';
import styled from 'styled-components';
import {observer} from "mobx-react-lite";
import {useContext, useEffect, useState} from 'react';
import {Icon} from 'common/components';
import {NETWORK_IDS} from 'service/WalletProviders/Metamask/constants';
import ModalsManager from '../ModalsManager';
import {Spinner} from "../../common/components";
import useModals from '../ModalsManager/useModals';
import {STEP_BOXES, BUTTON_STATE} from './constants';
import {MODAL_TYPES} from '../ModalsManager/constants';
import {AppStoreContext} from "../../common/stores/AppStore";
import {doubleDepositProtection, getAccounts, prefix0x} from "../UploadDepositFile/helper";
import {UploadDepositStoreContext} from '../../common/stores/UploadDepositStore';
import {StrategyError} from "../../service/WalletProviders/Metamask/MetaMaskStrategy";
import WalletProvidersContext from "../../service/WalletProviders/WalletProvidersContext";
import {
    Wrapper, Section, Title, SubTitle, ErrorMessage, StepsBoxes,
    ConnectedWallet, NeedGoETH, DepositMethod, ConnectWalletButton, Faq, SecurityNotification
} from './components';


const initialWalletInfoState = {
    networkVersion: '',
    networkName: '',
    selectedAddress: '',
    balance: '',
};

const NotificationContent = styled.div`
  width: 350px;
  display: flex;
  flex-direction: column;
`;

const Loading = styled.div`
  display: flex;
  color: ${({theme}) => theme.primary900};
  width: 320px;
  height: 16px;
  margin-top: 8px;
  font-size: 11px;
  font-weight: 500;
`;

const SpinnerWrapper = styled.div`
  position: absolute;
  left: 47%;
  top: 50%;
`;

const NotificationContentInnerWrapper = styled.div`
  display: flex;
`;

const Span = styled.span`
  width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DepositConfirmed = styled.div`
  width: 858px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const GoBackButton = styled.button<{ disabled?: boolean }>`
  border: none;
  background: none;
  color: ${({ disabled }) => disabled ? 'gray': 'blue'};
  cursor: ${({ disabled }) => disabled ? 'normal': 'pointer'};
`

const ReloadPageButton = styled.button`
  width: 182px;
  height: 32px;
  font-size: 14px;
  font-weight: 900;
  border-radius: 4px;
  border: solid 1px ${({theme}) => theme.gray400};
  color: ${({theme}) => 'white'};
  background-color: ${({theme}) => theme.primary900};
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    color: ${({theme}) => theme.primary600};
    background-color: transparent;
  }

  &:active {
    color: ${({theme}) => theme.primary600};
    background-color: transparent;
  }
`;

const StakingDeposit = observer(() => {
    const appStore = useContext(AppStoreContext)
    const uploadDepositStore = useContext(UploadDepositStoreContext)
    const [txHash, setTxHash] = useState(null);
    const [stepsData, setStepsData] = useState(STEP_BOXES);
    const [bloxAccounts, setBloxAccounts] = useState(null);
    const [isTermsChecked, setTermsCheck] = useState(false);
    const [loadingWallet, setLoadingWallet] = useState(false);
    const [walletProvider, setWalletProvider] = useState(null);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [walletInfo, setWalletInfo] = useState(initialWalletInfoState);
    const [error, setError] = useState({type: '', message: ''});
    const [isShowingReloadButton, showReloadButton] = useState(false);
    const [loadingDeposit, setDepositLoadingStatus] = useState(false);
    const [oneTimeWrongNetworkModal, setOneTimeWrongNetworkModal] = useState(false);
    const [showSecurityNotification, setSecurityNotificationDisplay] = useState(true);
    const {depositFileData} = uploadDepositStore
    const {isTransactionsInProgress, depositContract, genesisForkVersion, analytics, queryParams, successfullyDeposited, addDepositedValidator, setTransactionInProgress} = appStore

    const DEPOSIT_THERSHOLD = 32.01;
    const etherscanLink = queryParams['network_id'] === '1' ? 'https://etherscan.io/tx/' : 'https://goerli.etherscan.io/tx/';


    const {showModal, hideModal, modal} = useModals();

    const areNetworksEqual = queryParams['network_id'] === walletInfo.networkVersion;

    useEffect(() => {
        console.warn('🧧️ DEPOSIT CONTRACT ADDRESS: ', depositContract);
        document.title = 'Blox Staking - Transfers Hub';
        const placement = 'bottomRight';
        notification.config({placement});
        getAccounts(queryParams['id_token'], queryParams['account_id']).then((accounts) => {
            let hashedAccounts = accounts.reduce((obj, item) => Object.assign(obj, {[item.publicKey]: item}), {});
            // @ts-ignore
            const notDepositedAccounts = Object.fromEntries(Object.entries(hashedAccounts).filter(([key, val]) => !val.deposited));
            doubleDepositProtection(queryParams['id_token'], queryParams['network_id'], Object.keys(notDepositedAccounts)).then((depositedHash) => {
                Object.keys(depositedHash).forEach((key: string) => {
                    const account = hashedAccounts[`0x${key}`]
                    if (account) {
                        sendAccountUpdate(true, account.id, depositedHash[key], () => {
                            account.status = 'deposited';
                            account.depositTxHash = depositedHash[key];
                            addDepositedValidator(account.id)
                        }, () => {
                            account.status = 'deposited';
                            account.depositTxHash = depositedHash[key];
                            addDepositedValidator(account.id)
                        });
                    }
                })
                setLoadingAccounts(false)
                setBloxAccounts(Object.values(hashedAccounts))
            });
        });
        const timeout = setTimeout(() => setSecurityNotificationDisplay(false), 5000);
        return () => {
            clearTimeout(timeout);
        };
    }, []);

    useEffect(() => {
        if (queryParams['network_id'] && walletInfo.networkVersion && !areNetworksEqual) {
            setError({type: 'networksNotEqual', message: `Please change to ${NETWORK_IDS[queryParams['network_id']]}`,});
            if (!oneTimeWrongNetworkModal) {
                setOneTimeWrongNetworkModal(true);
                showModal({show: true, type: MODAL_TYPES.WRONG_NETWORK, params: {networkType: queryParams['network_id'].toString()}});
            }
        } else if (walletInfo.balance !== '' && Number(walletInfo.balance) < DEPOSIT_THERSHOLD) {
            setError({type: 'lowBalance', message: 'Insufficient balance in selected wallet'});
        } else {
            setError({type: '', message: ''});
        }
    }, [queryParams['network_id'], walletInfo]);

    useEffect(() => {
        if (walletProvider == null) return;
        const neededModal = walletProvider.getWarningModal();
        if (neededModal !== undefined) {
            setWalletProvider(null);
            showModal({show: true, type: neededModal});
            return
        }

        setSecurityNotificationDisplay(false);
        if (walletProvider.showLoader()) setLoadingWallet(true);
        connectWallet(walletProvider.providerType);
    }, [walletProvider]);

    const onWalletProviderClick = async (type: string) => {
        if (type === 'ledger' || type === 'trezor') {
            showModal({
                    show: true, type: MODAL_TYPES[`${type.toUpperCase()}`], params: {
                        onClick: () => {
                            hideModal();
                            setWalletProvider(new WalletProvidersContext(type, queryParams['network_id']));
                        },
                        onClose: () => {
                            hideModal();
                        }
                    }
                }
            );
            return
        }
        setWalletProvider(new WalletProvidersContext(type, queryParams['network_id']));
    };

    const connectWallet = async (type) => {
        await walletProvider.connect()
            .then(async () =>  {
                const valid = await walletProvider.verifyDepositRootsAndSignature(genesisForkVersion, queryParams['tx_data']);
                if(!valid) {
                    notification.error({
                        message: 'Deposit data invalid',
                        description: `Please contact support on Discord!`,
                        duration: 10,
                    });
                    console.log('Deposit data is invalid');
                    setLoadingWallet(false);
                    return;
                }
                console.log('Deposit data is valid');

                notification.success({
                    message: '',
                    description: `Successfully connected to ${type.charAt(0).toUpperCase() + type.slice(1)}`
                });
                setLoadingWallet(false);
                walletProvider.subscribeToUpdate(onInfoUpdate);
                walletProvider.subscribeToLogout(onLogout);
                walletProvider.getInfo().then((info) => {
                    updateWalletInfo(info)
                });
            }, null)
            .catch((error) => {
                console.log(error)
                if (error.code === StrategyError.ERROR_CODE_NOT_CONNECTED) {
                    showReloadButton(true);
                    setError({type: 'disconnected', message: error.message});
                }
                console.log('Wallet provider connect error - ', error);
                disconnect();
            });
    };

    const updateWalletInfo = (info) => {
        const {networkName, networkVersion, selectedAddress, balance} = info;
        setWalletInfo((prevState) => ({
            ...prevState,
            networkName,
            networkVersion,
            selectedAddress: selectedAddress,
            balance
        }));
    };

    const onInfoUpdate = async () => updateWalletInfo(await walletProvider.getInfo());
    const onLogout = async () => disconnect();


    const setValidatorStatus = (accountId: string, status: string, txHash?: string) => {
        const newAccounts = [...bloxAccounts];
        newAccounts.forEach((account) => {
            if (account.id === accountId) {
                account.status = status
                if (txHash) account.depositTxHash = txHash
            }
        });
        setBloxAccounts(newAccounts);
    };

    const onDepositStart = async (sendAll: boolean = false, publicKey?: string) => {
        const accounts = sendAll ? [...bloxAccounts] : bloxAccounts.filter((account) => {
            return account.publicKey === publicKey
        });

        if (queryParams['tx_data']) {
            setTransactionInProgress(accounts[0].id, true);
            await walletProvider.sendSignTransaction(genesisForkVersion, depositContract, accounts[0].id, queryParams['tx_data'], onStart, onSuccess, onError);
        } else {
            await handleMultipleTransactions(accounts);
        }
    };

    const handleMultipleTransactions = async (accounts) => {
        const remainingTxs = accounts.filter(key => key.status === 'waiting' || key.status === 'deposit');
        const nextTransaction = remainingTxs.shift();
        if (nextTransaction === undefined) {
            return;
        }
        let depositData = null;
        if(depositFileData) depositData = depositFileData.filter(deposit => prefix0x(deposit.pubkey) === nextTransaction.publicKey)[0];

        if (!depositData) {
            return;
        }

        setValidatorStatus(nextTransaction.id, BUTTON_STATE.WAITING_FOR_CONFIRMATION.key);
        setTransactionInProgress(accounts[0].id, true);
        await walletProvider.sendSignTransaction(genesisForkVersion, depositContract, nextTransaction.id, '', onStart, onSuccess, onError, depositData);
        await handleMultipleTransactions(remainingTxs)
    };


    const onStart = async (txHash, accountId) => {
        console.log('deposit start---------', txHash);
        await sendAccountUpdate(false, accountId, txHash, () => {
            setValidatorStatus(accountId, BUTTON_STATE.PENDING.key);
            notification.success({
                message: '', description: notificationPlain('Transaction hash', txHash)
            });
            return;
        }, () => {
            setValidatorStatus(accountId, BUTTON_STATE.DEPOSIT.key);
            return;
        });
    };

    const onSuccess = async (error, txReceipt, accountId) => {
        console.log('deposit end---------', error, txReceipt);
        if (error || !txReceipt?.status) {
            setDepositLoadingStatus(false);
            setTransactionInProgress(accountId, false);
            setValidatorStatus(accountId, BUTTON_STATE.ERROR.key, txReceipt.transactionHash);
            setTimeout(() => {
                setValidatorStatus(accountId, BUTTON_STATE.DEPOSIT.key);
            },2000)
            return notification.error({message: 'failed to deposit', duration: 0});
        }
        if (queryParams['tx_data']) setTxHash(txReceipt.transactionHash);
        await sendAccountUpdate(true, accountId, txReceipt.transactionHash, () => {
            setValidatorStatus(accountId, BUTTON_STATE.DEPOSITED.key, txReceipt.transactionHash);
            addDepositedValidator(accountId)
            setTransactionInProgress(accountId, false);
        }, () => {
            setValidatorStatus(accountId, BUTTON_STATE.DEPOSIT.key, txReceipt.transactionHash);
        });
        notification.success({
            message: '', description: notificationPlain('Successfully deposited 32 ETH to', txReceipt.transactionHash)
        });
    };

    const onError = (walletProviderError, accountId) => {
        setDepositLoadingStatus(false);
        setTransactionInProgress(accountId, false);
        setValidatorStatus(accountId, BUTTON_STATE.ERROR.key);

        setTimeout(()=>{
            setValidatorStatus(accountId, BUTTON_STATE.DEPOSIT.key);
        },2000)

        if (walletProviderError.message) {
            return showError(walletProviderError.message);
        }

        const enableContractDataMessage = 'Failed to send transaction. Please enable contract data on your Ledger and try again.';
        let errorMessage = 'Failed to send transaction. Please report us about this issue.';
        const errorMessageString = String(walletProviderError.message);

        if (errorMessageString.indexOf('EnableContractData') > -1) {
            errorMessage = enableContractDataMessage;
        } else {
            const errorPrefix = 'Error: ';
            const errorParts = errorMessageString.split(errorPrefix);
            if (errorParts.length > 1) {
                errorParts.shift();
                if (errorParts.length > 1) {
                    errorMessage = errorParts.join('. ');
                } else {
                    errorMessage = errorParts[0];
                }
            }
        }

        showError(errorMessage);
    };

    const showError = (message) => {
        notification.error({
            message: message,
            duration: 0
        });
        console.error(message)
        console.error('deposit to', depositContract, 'fails with following tx data', queryParams['tx_data'])
    }

    const notificationPlain = (text, txReceipt) => {
        return <NotificationContent>
            {text}<br/>
            <NotificationContentInnerWrapper>
                <Span>{depositContract}</Span>
                <Icon name={'icons-export'} color={'primary900'} fontSize={'16px'}
                      onClick={() => window.open(`${etherscanLink}${txReceipt.transactionHash}`, '_blank')}/>
            </NotificationContentInnerWrapper>
        </NotificationContent>
    };

    const disconnect = () => {
        setWalletInfo(initialWalletInfoState);
        setLoadingWallet(false);
        if (walletProvider != null) {
            walletProvider.disconnect();
            setWalletProvider(null);
        }
    };

    const sendAccountUpdate = async (deposited, accountId, txHash, onSuccess, onFailure) => {
        // const userProfile: any = jwtDecode(queryParams['id_token']);
        // deposited && analytics.identify(userProfile.sub);
        try {
            const res = await axios({
                url: `${process.env.REACT_APP_API_URL}/accounts/${accountId}`,
                method: 'patch',
                data: {deposited: deposited, depositTxHash: txHash},
                responseType: 'json',
                headers: {Authorization: `Bearer ${queryParams['id_token']}`},
            });
            onSuccess(res.data);
            deposited && walletProvider && analytics.track('validator-deposited', {
                provider: walletProvider.providerType,
                network: queryParams['network_id'] === '1' ? 'mainnet' : 'prater'
            });
        } catch (error) {
            console.log(`Error updating account - ${error}`);
            onFailure(error);
            deposited && walletProvider && analytics.track('error-occurred', {
                reason: 'validator-deposited-failed',
                provider: walletProvider.providerType
            });
        }
    };

    if (bloxAccounts && (queryParams['tx_data'] || depositFileData)) {
        let desktopAppLink = ''
        if (queryParams['tx_data']) {
            desktopAppLink = `blox-live://tx_hash=${txHash}&account_id=${successfullyDeposited.join(',')}&network_id=${queryParams['network_id']}&deposit_to=${depositContract};`
        } else {
            desktopAppLink = `blox-live://account_id=${successfullyDeposited.join(',')}`;
        }

        const onGoBackClick = () => {
            const root = document.getElementById('root');
            const newIframe = document.createElement('iframe');
            newIframe.src = desktopAppLink;
            newIframe.width = '0px';
            newIframe.height = '0px';
            root.appendChild(newIframe);
        }

        if(window.location.host != 'app.stage.bloxstaking.com' && window.location.host != 'localhost:3000') {
            return <Wrapper>Unexpected Error</Wrapper>;
        }

        return (
            <Wrapper>
                <Title>{queryParams['network_id'] === "1" ? 'Mainnet' : 'Testnet'} Staking Deposit</Title>
                <Section>
                    <SubTitle>Deposit Method</SubTitle>
                    <DepositMethod>
                        {/* TODO extract to wallet button component */}
                        {(!loadingWallet && (walletInfo.balance && walletInfo.networkName && walletInfo.networkVersion && walletInfo.selectedAddress)) ?
                            (<ConnectedWallet walletInfo={walletInfo} areNetworksEqual={areNetworksEqual} error={error} onDisconnect={disconnect}/>) :
                            (<ConnectWalletButton onWalletProviderClick={onWalletProviderClick} disable={loadingWallet}/>)
                        }
                        {queryParams['network_id'] === "5" && <NeedGoETH href={'https://discord.gg/wXxuQwY'} target={'_blank'}>Need GoETH?</NeedGoETH>}
                    </DepositMethod>
                    {error.type && <ErrorMessage>{error.message}</ErrorMessage>}
                    {isShowingReloadButton && (
                        <>
                            <br/>
                            <ReloadPageButton onClick={() => window.location.reload()}>Reload Page</ReloadPageButton>
                        </>
                    )}
                    {loadingWallet &&
                    <Loading> <Spinner width={'17px'} margin-right={'12px'}/> Waiting
                        for {walletProvider.providerType.charAt(0).toUpperCase() + walletProvider.providerType.slice(1)} wallet
                        to be connected</Loading>}

                </Section>
                <Section>
                    <SubTitle>Plan and Summary</SubTitle>
                    <StepsBoxes stepsData={stepsData}
                                depositTo={depositContract}
                                network_id={queryParams['network_id']}
                                walletInfo={walletInfo}
                                inProgress={isTransactionsInProgress}
                                setStepsData={setStepsData}
                                bloxAccounts={bloxAccounts}
                                onDepositStart={onDepositStart}
                                isLoadingDeposit={loadingDeposit}
                                checkedTerms={isTermsChecked} error={error}
                                setCheckedTermsStatus={() => setTermsCheck(!isTermsChecked)}
                    />
                </Section>
                <Faq networkId={queryParams['network_id']}/>
                <ModalsManager modal={modal} onClose={hideModal}/>
                {showSecurityNotification &&
                <SecurityNotification hide={() => setSecurityNotificationDisplay(false)}/>}
                <DepositConfirmed>
                    <GoBackButton disabled={isTransactionsInProgress} onClick={() => onGoBackClick()}>Go back to app</GoBackButton>
                </DepositConfirmed>
                {(successfullyDeposited.length === bloxAccounts.length) && (
                    <iframe title={'depositSuccess'} width={'0px'} height={'0px'} src={desktopAppLink}/>
                )}
            </Wrapper>
        );
    }
    return (loadingAccounts && <SpinnerWrapper><Spinner position={'absolute'} width={'50px'} margin-right={'50px'}/></SpinnerWrapper>)
});

export default StakingDeposit;
