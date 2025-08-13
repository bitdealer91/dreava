export const SOMNIA_CHAIN_ID_DEC = 50312;
export const SOMNIA_CHAIN_ID_HEX = '0xc488';

export const SOMNIA_NETWORK_PARAMS = {
  chainId: SOMNIA_CHAIN_ID_HEX,
  chainName: 'Somnia Testnet',
  rpcUrls: ['https://dream-rpc.somnia.network/'],
  nativeCurrency: {
    name: 'Somnia Test Token',
    symbol: 'STT',
    decimals: 18,
  },
  blockExplorerUrls: ['https://shannon-explorer.somnia.network/'],
};

// Ensures the connected wallet is on Somnia Testnet. Returns true if ensured, throws on hard failure.
export async function ensureSomniaNetwork() {
  console.log('[Network] ensureSomniaNetwork invoked');
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Wallet not detected');
  }

  // WalletConnect v2 and some mobile providers require explicit permissions
  try {
    if (typeof window.ethereum.request === 'function') {
      console.log('[Network] requesting permissions: wallet_requestPermissions');
      await window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
    }
  } catch {}

  const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
  console.log('[Network] current chainId:', currentChainId);
  if (currentChainId === SOMNIA_CHAIN_ID_HEX) {
    console.log('[Network] already on Somnia');
    return true;
  }

  try {
    console.log('[Network] trying wallet_switchEthereumChain to', SOMNIA_CHAIN_ID_HEX);
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SOMNIA_CHAIN_ID_HEX }],
    });
    console.log('[Network] switchEthereumChain success');
    return true;
  } catch (switchError) {
    console.warn('[Network] switchEthereumChain error:', switchError?.code, switchError?.message || switchError);
    // 4902 = Unrecognized chain; try to add it
    if (switchError && (switchError.code === 4902 || String(switchError.message || '').toLowerCase().includes('unrecognized'))) {
      console.log('[Network] trying wallet_addEthereumChain');
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [SOMNIA_NETWORK_PARAMS],
      });
      console.log('[Network] addEthereumChain success');
      return true;
    }
    throw switchError;
  }
}


