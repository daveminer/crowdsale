import { Form, Button, Row, Col, Table } from 'react-bootstrap'
import { useEffect, useState } from 'react'
import { StandardMerkleTree } from '@openzeppelin/merkle-tree'
import allowedAddressesData from '../allowedAddresses.json'

const AllowedAddresses = ({ provider, crowdsale }) => {
  const [allowedAddresses, setAllowedAddresses] = useState([])
  const [newAddress, setNewAddress] = useState('')
  const [isWaiting, setIsWaiting] = useState(false)

  useEffect(() => {
    const loadAllowedAddresses = async () => {
      try {
        // Load addresses from the JSON file instead of contract
        const addresses = allowedAddressesData.addresses || []
        setAllowedAddresses(addresses)
      } catch (error) {
        console.error('Error loading addresses:', error)
      }
    }

    if (crowdsale) {
      loadAllowedAddresses()
    }
  }, [crowdsale])

  const addAddressHandler = async (e) => {
    e.preventDefault()
    setIsWaiting(true)

    try {
      // Get the signer
      const signer = await provider.getSigner()

      // Load current addresses from JSON file
      const currentAddresses = allowedAddressesData.addresses || []

      // Check if address is already in the list
      if (currentAddresses.includes(newAddress)) {
        window.alert('Address is already in the allowed list')
        setIsWaiting(false)
        return
      }

      // Create new array with the new address
      const updatedAddresses = [...currentAddresses, newAddress]
      const values = updatedAddresses.map((address) => [address])
      const tree = StandardMerkleTree.of(values, ['address'])

      // Update the Merkle root first
      const updateRootTransaction = await crowdsale
        .connect(signer)
        .setMerkleRoot(tree.root)
      await updateRootTransaction.wait()

      console.log('Merkle root updated to:', tree.root)

      // Now generate proof for the new address using the updated tree
      const userValue = [newAddress]
      const proof = tree.getProof(userValue)

      console.log('Generated Merkle proof for new address:', newAddress)
      console.log('Merkle proof:', proof)

      // Approve the address with proof
      const approveTransaction = await crowdsale
        .connect(signer)
        .approveAddressWithProof(newAddress, proof)
      await approveTransaction.wait()

      console.log('Address approved with proof')

      // Update local state
      setAllowedAddresses(updatedAddresses)
      setNewAddress('') // Clear the input

      // Log the updated data for manual JSON file update
      const updatedData = {
        ...allowedAddressesData,
        addresses: updatedAddresses,
        merkleRoot: tree.root,
        lastUpdated: new Date().toISOString(),
      }

      console.log('=== MANUAL UPDATE REQUIRED ===')
      console.log(
        'Please update src/allowedAddresses.json with the following data:'
      )
      console.log(JSON.stringify(updatedData, null, 2))
      console.log('=== END MANUAL UPDATE ===')

      console.log('New addresses list:', updatedAddresses)
      console.log('New Merkle root:', tree.root)
    } catch (error) {
      window.alert('Error adding address: ' + error.message)
    }

    setIsWaiting(false)
  }

  return (
    <>
      <div className='my-4 text-center'>
        <h1>Allowed Addresses</h1>
        <Table>
          <tbody>
            {allowedAddresses.map((address) => (
              <tr key={address}>
                <td>{address}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <Form onSubmit={addAddressHandler}>
        <Form.Group as={Row} className='my-4 justify-content-center'>
          <Col xs={8} md={6}>
            <Form.Control
              type='text'
              placeholder='Enter Address'
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              required
            />
          </Col>
          <Col xs='auto'>
            <Button variant='primary' type='submit' disabled={isWaiting}>
              {isWaiting ? 'Adding...' : 'Add Address'}
            </Button>
          </Col>
        </Form.Group>
      </Form>
    </>
  )
}

export default AllowedAddresses
