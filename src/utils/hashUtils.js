import { keccak256, solidityPacked, getAddress } from 'ethers';
import { MerkleTree } from 'merkletreejs';

/**
 * Нормализует адрес к EIP-55 формату
 * @param {string} address - Адрес для нормализации
 * @returns {string} Нормализованный адрес
 */
export const normalizeAddress = (address) => {
  try {
    return getAddress(address.trim());
  } catch (error) {
    console.warn('Invalid address:', address, error);
    return address.trim().toLowerCase();
  }
};

/**
 * Создает хеш для адреса в формате, совместимом с Solidity
 * @param {string} address - Адрес для хеширования
 * @returns {Buffer} Хеш адреса
 */
export const hashAddress = (address) => {
  const normalizedAddress = normalizeAddress(address);
  return keccak256(solidityPacked(['address'], [normalizedAddress]));
};

/**
 * Генерирует Merkle дерево и данные для верификации
 * @param {string[]} addresses - Массив адресов
 * @returns {Object} Объект с root, proofs и tree
 */
export const generateMerkleData = (addresses) => {
  console.log('🔧 === GENERATE MERKLE DATA DEBUG ===');
  console.log('Original addresses:', addresses);
  
  // Нормализуем адреса
  const normalizedAddresses = addresses.map(normalizeAddress);
  console.log('Normalized addresses:', normalizedAddresses);
  
  // Создаем листья
  const leaves = normalizedAddresses.map(hashAddress);
  console.log('Generated leaves:', leaves);
  
  // Создаем дерево
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = tree.getHexRoot();
  const proofs = {};
  
  // Генерируем доказательства для каждого адреса
  console.log('Generating proofs for each address:');
  normalizedAddresses.forEach(addr => {
    const leaf = hashAddress(addr);
    const proof = tree.getHexProof(leaf);
    proofs[addr] = proof;
    console.log(`  ${addr}:`, proof);
  });
  
  console.log('Final root:', root);
  console.log('Final proofs object:', proofs);
  console.log('🔧 === END GENERATE MERKLE DATA DEBUG ===');
  
  return { root, proofs, tree };
};

/**
 * Проверяет, находится ли адрес в whitelist
 * @param {string} address - Адрес для проверки
 * @param {string} root - Merkle root
 * @param {string[]} proof - Доказательство
 * @returns {boolean} True если адрес в whitelist
 */
export const verifyWhitelist = (address, root, proof) => {
  try {
    const normalizedAddress = normalizeAddress(address);
    const leaf = hashAddress(normalizedAddress);
    const tree = new MerkleTree([leaf], keccak256, { sortPairs: true });
    return tree.verify(proof, leaf, root);
  } catch (error) {
    console.error('Error verifying whitelist:', error);
    return false;
  }
};

/**
 * Валидирует адрес Ethereum
 * @param {string} address - Адрес для валидации
 * @returns {boolean} True если адрес валиден
 */
export const isValidAddress = (address) => {
  try {
    getAddress(address);
    return true;
  } catch {
    return false;
  }
};

/**
 * Фильтрует и валидирует массив адресов
 * @param {string[]} addresses - Массив адресов
 * @returns {Object} Объект с валидными и невалидными адресами
 */
export const validateAddresses = (addresses) => {
  const valid = [];
  const invalid = [];
  
  addresses.forEach(addr => {
    if (isValidAddress(addr)) {
      valid.push(normalizeAddress(addr));
    } else {
      invalid.push(addr);
    }
  });
  
  return { valid, invalid };
}; 