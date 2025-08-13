import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { createConfig } from 'wagmi';
import { reownConfig } from './reown';

// Build a single wagmi config reused across app and actions
export const wagmiAdapter = new WagmiAdapter({
  networks: reownConfig.chains,
  projectId: reownConfig.projectId,
});

export const wagmiConfig = createConfig({
  chains: reownConfig.chains,
  connectors: wagmiAdapter.connectors,
  transports: wagmiAdapter.transports,
});

export default wagmiConfig;



