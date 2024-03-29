import { useState } from 'react';
import styled from 'styled-components';
import * as icons from './images';

const Wrapper = styled.div<{isDisabled: boolean}>`
  width: 182px;
  height: 32px;
  font-size: 14px;
  font-weight: 900;
  border-radius: 4px;
  border: solid 1px ${({theme}) => theme.gray400};
  color:${({theme, isDisabled}) => theme[isDisabled ? 'gray400' : 'primary600']};  
  position:relative;
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
   &:hover {
    color:${({theme, isDisabled}) => isDisabled ? null : theme.primary400};
  }
  &:active{
    color:${({theme, isDisabled}) => isDisabled ? null : theme.primary800};
  }
`;

const Menu = styled.div`
  width: 240px;
  height: 150px;
  padding: 16px 12px;
  border-radius: 4px;
  box-shadow: 0 2px 4px 0 ${({theme}) => theme.gray80015};
  border: solid 1px ${({theme}) => theme.gray300};
  background-color: #ffffff;
  position:absolute;
  left:0;
  bottom:-150px;
  z-index:2;
`;

const Row = styled.div`
  width:100%;
  height:38px;
  display:flex;
  align-items:center;
  font-size: 14px;
  font-weight: 500;
  color:${({theme}) => theme.gray800};
  &:hover {
    color:${({theme}) => theme.primary600};
  }  
`;

const Image = styled.img`
  width:24px;
  height:24px;
  margin-right:5px;
`;

const ConnectWalletButton = ({ onWalletProviderClick, disable}: Props) => {
  const [ showMenu, setMenuStatus ] = useState(false);

  const ITEMS = [
    // { label: 'portis', displayName: 'Portis', icon: icons.PortisImage, onClick: () => onWalletProviderClick('portis') },
    { label: 'metamask', displayName: 'MetaMask', icon: icons.MetamaskImage, onClick: () => onWalletProviderClick('metaMask') },
    { label: 'ledger', displayName: 'Ledger via MetaMask', icon: icons.LedgerImage, onClick: () => onWalletProviderClick('ledger') },
    { label: 'trezor', displayName: 'Trezor via MetaMask', icon: icons.TrezorImage, onClick: () => onWalletProviderClick('trezor') },
  ];

  return (
    <Wrapper isDisabled={disable} onClick={() => disable ? null : setMenuStatus(!showMenu)}>
      Connect Wallet
      {showMenu && (
        <Menu>
          {ITEMS.map((item, index) => (
              <Row key={index} onClick={item.onClick}>
                <Image src={item.icon}/>
                {item.displayName}
              </Row>
            ))}
        </Menu>
      )}
    </Wrapper>
  );
};

type Props = {
  onWalletProviderClick: (type:string) => void;
  disable: boolean;
};

export default ConnectWalletButton;
