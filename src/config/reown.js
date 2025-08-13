// Конфигурация Reown AppKit согласно документации
export const reownConfig = {
  projectId: '24290d0dec9f291cdba39d39f76c1c33',
  chains: [
    {
      id: 50312,
      name: 'Somnia Testnet',
      nativeCurrency: {
        name: 'Somnia Test Token',
        symbol: 'STT',
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: ['https://dream-rpc.somnia.network/'],
        },
        public: {
          http: ['https://dream-rpc.somnia.network/'],
        },
      },
      blockExplorers: {
        default: {
          name: 'Shannon Explorer',
          url: 'https://shannon-explorer.somnia.network/',
        },
      },
      testnet: true,
      chainNamespace: 'eip155',
    },
  ],
  metadata: {
    name: 'Dreava Launchpad',
    description: 'NFT Launchpad Platform for Somnia Blockchain',
    url: 'https://dreava.com',
    icons: ['/logo.svg'],
  },
  options: {
    enableAnalytics: false,
    enableExplorer: true,
    enableOnramp: false,
    enableSwap: false,
  },
  // Добавляем правильную структуру для новой версии
  walletConnectProjectId: '24290d0dec9f291cdba39d39f76c1c33',
  defaultChain: 50312,
};

export default reownConfig; 

export const somniaNetwork = reownConfig.chains[0];