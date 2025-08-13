// 🔧 Безопасная работа с Viem для избежания ошибок BigInt
import { createPublicClient, http, parseEther, formatEther, parseUnits, formatUnits } from 'viem';

// 🔧 Безопасный клиент Viem
export const createSafeViemClient = (rpcUrl) => {
  try {
    return createPublicClient({
      chain: {
        id: 50312, // Somnia Testnet
        name: 'Somnia Testnet',
        network: 'somnia_testnet',
        nativeCurrency: {
          name: 'Somnia Test Token',
          symbol: 'STT',
          decimals: 18,
        },
        rpcUrls: {
          default: { http: [rpcUrl] },
          public: { http: [rpcUrl] },
        },
        blockExplorers: {
          default: {
            name: 'Shannon Explorer',
            url: 'https://shannon-explorer.somnia.network/',
          },
        },
      },
      transport: http(rpcUrl, {
        timeout: 30000,
        retryCount: 3,
        retryDelay: 1000,
      }),
    });
  } catch (error) {
    console.warn('Failed to create Viem client:', error);
    return null;
  }
};

// 🔧 Безопасное преобразование в Wei
export const safeParseEther = (value) => {
  try {
    if (typeof value === 'bigint') {
      return value;
    }
    if (typeof value === 'string') {
      // Убираем 'n' в конце если есть
      const cleanValue = value.replace(/n$/, '');
      return parseEther(cleanValue);
    }
    if (typeof value === 'number') {
      return parseEther(value.toString());
    }
    throw new Error('Invalid value type for parseEther');
  } catch (error) {
    console.warn('parseEther error:', error);
    // Возвращаем безопасное значение
    return parseEther('0');
  }
};

// 🔧 Безопасное преобразование из Wei
export const safeFormatEther = (value) => {
  try {
    if (typeof value === 'bigint') {
      return formatEther(value);
    }
    if (typeof value === 'string') {
      // Убираем 'n' в конце если есть
      const cleanValue = value.replace(/n$/, '');
      return formatEther(BigInt(cleanValue));
    }
    if (typeof value === 'number') {
      return formatEther(BigInt(value));
    }
    throw new Error('Invalid value type for formatEther');
  } catch (error) {
    console.warn('formatEther error:', error);
    return '0';
  }
};

// 🔧 Безопасное преобразование в Units
export const safeParseUnits = (value, decimals) => {
  try {
    if (typeof value === 'bigint') {
      return value;
    }
    if (typeof value === 'string') {
      const cleanValue = value.replace(/n$/, '');
      return parseUnits(cleanValue, decimals);
    }
    if (typeof value === 'number') {
      return parseUnits(value.toString(), decimals);
    }
    throw new Error('Invalid value type for parseUnits');
  } catch (error) {
    console.warn('parseUnits error:', error);
    return parseUnits('0', decimals);
  }
};

// 🔧 Безопасное преобразование из Units
export const safeFormatUnits = (value, decimals) => {
  try {
    if (typeof value === 'bigint') {
      return formatUnits(value, decimals);
    }
    if (typeof value === 'string') {
      const cleanValue = value.replace(/n$/, '');
      return formatUnits(BigInt(cleanValue), decimals);
    }
    if (typeof value === 'number') {
      return formatUnits(BigInt(value), decimals);
    }
    throw new Error('Invalid value type for formatUnits');
  } catch (error) {
    console.warn('formatUnits error:', error);
    return '0';
  }
};

// 🔧 Безопасное преобразование BigInt в число
export const safeBigIntToNumber = (value) => {
  try {
    if (typeof value === 'bigint') {
      const stringValue = value.toString();
      const cleanValue = stringValue.replace(/n$/, '');
      const num = parseFloat(cleanValue);
      return isNaN(num) ? 0 : num;
    }
    if (typeof value === 'string') {
      const cleanValue = value.replace(/n$/, '');
      const num = parseFloat(cleanValue);
      return isNaN(num) ? 0 : num;
    }
    if (typeof value === 'number') {
      return value;
    }
    return 0;
  } catch (error) {
    console.warn('BigInt to number conversion error:', error);
    return 0;
  }
};

// 🔧 Безопасное преобразование числа в BigInt
export const safeNumberToBigInt = (value) => {
  try {
    if (typeof value === 'bigint') {
      return value;
    }
    if (typeof value === 'string') {
      const cleanValue = value.replace(/n$/, '');
      const num = parseFloat(cleanValue);
      if (isNaN(num)) {
        throw new Error('Invalid number string');
      }
      return BigInt(Math.floor(num));
    }
    if (typeof value === 'number') {
      return BigInt(Math.floor(value));
    }
    throw new Error('Invalid value type for numberToBigInt');
  } catch (error) {
    console.warn('Number to BigInt conversion error:', error);
    return BigInt(0);
  }
};

// 🔧 Безопасная проверка BigInt значения
export const safeValidateBigInt = (value) => {
  try {
    if (typeof value === 'bigint') {
      return true;
    }
    if (typeof value === 'string') {
      const cleanValue = value.replace(/n$/, '');
      const num = parseFloat(cleanValue);
      return !isNaN(num);
    }
    if (typeof value === 'number') {
      return !isNaN(value) && isFinite(value);
    }
    return false;
  } catch (error) {
    console.warn('BigInt validation error:', error);
    return false;
  }
};

// 🔧 Безопасное округление BigInt
export const safeRoundBigInt = (value, decimals = 0) => {
  try {
    if (typeof value === 'bigint') {
      if (decimals === 0) {
        return value;
      }
      // Простое округление для BigInt
      const divisor = BigInt(10 ** decimals);
      const remainder = value % divisor;
      const halfDivisor = divisor / BigInt(2);
      
      if (remainder >= halfDivisor) {
        return value + (divisor - remainder);
      } else {
        return value - remainder;
      }
    }
    return value;
  } catch (error) {
    console.warn('BigInt rounding error:', error);
    return value;
  }
}; 