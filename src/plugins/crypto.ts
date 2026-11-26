import CryptoJS from 'crypto-js'

// 数据加密
export const encryptData = (data: unknown) => {
  try {
    const jsonStr = JSON.stringify(data)
    return CryptoJS.AES.encrypt(jsonStr, __APP_NAME__).toString()
  } catch (error) {
    console.error('数据加密失败:', error)
    return null
  }
}

// 数据解密
export const decryptData = (encryptedData: string): unknown => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, __APP_NAME__)
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8)
    return JSON.parse(decryptedStr)
  } catch (error) {
    console.error('数据解密失败:', error)
    return null
  }
}