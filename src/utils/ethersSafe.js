// 🔧 Безопасная работа с Ethers для избежания ошибок BigInt
import { ethers } from 'ethers';

// 🔧 Безопасный провайдер Ethers
export const createSafeEthersProvider = (rpcUrl) => {
  try {
    return new ethers.JsonRpcProvider(rpcUrl, {
      name: 'Somnia Testnet',
      chainId: 50312,
    });
  } catch (error) {
    console.warn('Failed to create Ethers provider:', error);
    return null;
  }
};

// 🔧 Безопасное преобразование в Wei
export const safeEthersParseEther = (value) => {
  try {
    if (ethers.BigNumber.isBigNumber(value)) {
      return value;
    }
    if (typeof value === 'bigint') {
      return ethers.BigNumber.from(value.toString());
    }
    if (typeof value === 'string') {
      const cleanValue = value.replace(/n$/, '');
      return ethers.parseEther(cleanValue);
    }
    if (typeof value === 'number') {
      return ethers.parseEther(value.toString());
    }
    throw new Error('Invalid value type for parseEther');
  } catch (error) {
    console.warn('Ethers parseEther error:', error);
    return ethers.parseEther('0');
  }
};

// 🔧 Безопасное преобразование из Wei
export const safeEthersFormatEther = (value) => {
  try {
    if (ethers.BigNumber.isBigNumber(value)) {
      return ethers.formatEther(value);
    }
    if (typeof value === 'bigint') {
      return ethers.formatEther(ethers.BigNumber.from(value.toString()));
    }
    if (typeof value === 'string') {
      const cleanValue = value.replace(/n$/, '');
      return ethers.formatEther(ethers.BigNumber.from(cleanValue));
    }
    if (typeof value === 'number') {
      return ethers.formatEther(ethers.BigNumber.from(value));
    }
    throw new Error('Invalid value type for formatEther');
  } catch (error) {
    console.warn('Ethers formatEther error:', error);
    return '0';
  }
};

// 🔧 Безопасное преобразование в Units
export const safeEthersParseUnits = (value, decimals) => {
  try {
    if (ethers.BigNumber.isBigNumber(value)) {
      return value;
    }
    if (typeof value === 'bigint') {
      return ethers.BigNumber.from(value.toString());
    }
    if (typeof value === 'string') {
      const cleanValue = value.replace(/n$/, '');
      return ethers.parseUnits(cleanValue, decimals);
    }
    if (typeof value === 'number') {
      return ethers.parseUnits(value.toString(), decimals);
    }
    throw new Error('Invalid value type for parseUnits');
  } catch (error) {
    console.warn('Ethers parseUnits error:', error);
    return ethers.parseUnits('0', decimals);
  }
};

// 🔧 Безопасное преобразование из Units
export const safeEthersFormatUnits = (value, decimals) => {
  try {
    if (ethers.BigNumber.isBigNumber(value)) {
      return ethers.formatUnits(value, decimals);
    }
    if (typeof value === 'bigint') {
      return ethers.formatUnits(ethers.BigNumber.from(value.toString()), decimals);
    }
    if (typeof value === 'string') {
      const cleanValue = value.replace(/n$/, '');
      return ethers.formatUnits(ethers.BigNumber.from(cleanValue), decimals);
    }
    if (typeof value === 'number') {
      return ethers.formatUnits(ethers.BigNumber.from(value), decimals);
    }
    throw new Error('Invalid value type for formatUnits');
  } catch (error) {
    console.warn('Ethers formatUnits error:', error);
    return '0';
  }
};

// 🔧 Безопасное преобразование BigNumber в число
export const safeBigNumberToNumber = (value) => {
  try {
    if (ethers.BigNumber.isBigNumber(value)) {
      return value.toNumber();
    }
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
    console.warn('BigNumber to number conversion error:', error);
    return 0;
  }
};

// 🔧 Безопасное преобразование числа в BigNumber
export const safeNumberToBigNumber = (value) => {
  try {
    if (ethers.BigNumber.isBigNumber(value)) {
      return value;
    }
    if (typeof value === 'bigint') {
      return ethers.BigNumber.from(value.toString());
    }
    if (typeof value === 'string') {
      const cleanValue = value.replace(/n$/, '');
      const num = parseFloat(cleanValue);
      if (isNaN(num)) {
        throw new Error('Invalid number string');
      }
      return ethers.BigNumber.from(Math.floor(num));
    }
    if (typeof value === 'number') {
      return ethers.BigNumber.from(Math.floor(value));
    }
    throw new Error('Invalid value type for numberToBigNumber');
  } catch (error) {
    console.warn('Number to BigNumber conversion error:', error);
    return ethers.BigNumber.from(0);
  }
};

// 🔧 Безопасная проверка BigNumber значения
export const safeValidateBigNumber = (value) => {
  try {
    if (ethers.BigNumber.isBigNumber(value)) {
      return true;
    }
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
    console.warn('BigNumber validation error:', error);
    return false;
  }
};

// 🔧 Безопасное округление BigNumber
export const safeRoundBigNumber = (value, decimals = 0) => {
  try {
    if (ethers.BigNumber.isBigNumber(value)) {
      if (decimals === 0) {
        return value;
      }
      // Округление для BigNumber
      const divisor = ethers.BigNumber.from(10 ** decimals);
      const remainder = value.mod(divisor);
      const halfDivisor = divisor.div(2);
      
      if (remainder.gte(halfDivisor)) {
        return value.add(divisor.sub(remainder));
      } else {
        return value.sub(remainder);
      }
    }
    return value;
  } catch (error) {
    console.warn('BigNumber rounding error:', error);
    return value;
  }
};

// 🔧 Безопасное создание контракта
export const createSafeContract = (address, abi, provider) => {
  try {
    if (!provider) {
      throw new Error('Provider is required');
    }
    if (!address) {
      throw new Error('Contract address is required');
    }
    if (!abi) {
      throw new Error('Contract ABI is required');
    }
    
    return new ethers.Contract(address, abi, provider);
  } catch (error) {
    console.warn('Failed to create contract:', error);
    return null;
  }
}; 