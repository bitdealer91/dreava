import { uploadFile, uploadMetadata } from '../utils/web3storage';

const uploadToBackend = async (file) => {
  try {
    const result = await uploadFile(file);
    return result.url;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

const uploadMetadataJSON = async (metadata) => {
  try {
    const result = await uploadMetadata(metadata);
    return result.url;
  } catch (error) {
    console.error('Error uploading metadata:', error);
    throw error;
  }
}; 