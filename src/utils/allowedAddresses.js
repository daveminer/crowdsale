const STORAGE_KEY = 'crowdsale_allowed_addresses'
const INITIAL_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

// Initialize localStorage with the first hardcoded address if it doesn't exist
export const initializeAllowedAddresses = () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    const initialData = {
      addresses: [INITIAL_ADDRESS],
      lastUpdated: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData))
    return initialData
  }
  return JSON.parse(stored)
}

// Get all allowed addresses from localStorage
export const getAllowedAddresses = () => {
  const data = initializeAllowedAddresses()
  return data.addresses || [INITIAL_ADDRESS]
}

// Add a new address to the allowed list
export const addAllowedAddress = (newAddress) => {
  const currentAddresses = getAllowedAddresses()

  // Check if address is already in the list
  if (currentAddresses.includes(newAddress)) {
    throw new Error('Address is already in the allowed list')
  }

  const updatedAddresses = [...currentAddresses, newAddress]
  const updatedData = {
    addresses: updatedAddresses,
    lastUpdated: new Date().toISOString(),
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData))
  return updatedAddresses
}

// Update the entire list of allowed addresses
export const setAllowedAddresses = (addresses) => {
  const updatedData = {
    addresses: addresses,
    lastUpdated: new Date().toISOString(),
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData))
  return addresses
}

// Clear all allowed addresses (reset to initial)
export const clearAllowedAddresses = () => {
  return initializeAllowedAddresses()
}
