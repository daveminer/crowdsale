import { Form, Button, Row, Col, Table } from "react-bootstrap";
import { useEffect, useState } from "react";

const AllowedAddresses = ({ provider, crowdsale }) => {
  const [allowedAddresses, setAllowedAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");

  useEffect(() => {
    const loadAllowedAddresses = async () => {
      try {
        const length = await crowdsale.allowedAddressesLength();

        // Fetch each address
        const addresses = [];
        for (let i = 0; i < length; i++) {
          const address = await crowdsale.allowedAddresses(i);
          if (address) addresses.push(address);
        }

        setAllowedAddresses(addresses);
      } catch (error) {
        console.error("Error loading addresses:", error);
      }
    };

    if (crowdsale) {
      loadAllowedAddresses();
    }
  }, [crowdsale]);

  const addAddressHandler = async (e) => {
    e.preventDefault();
    setIsWaiting(true);

    try {
      const transaction = await crowdsale.addAllowedAddress(newAddress);
      const receipt = await transaction.wait();

      const length = await crowdsale.allowedAddressesLength();

      const addresses = [];
      for (let i = 0; i < length; i++) {
        const address = await crowdsale.allowedAddresses(i);
        if (address) addresses.push(address);
      }

      setAllowedAddresses(addresses);
      setNewAddress(""); // Clear the input
    } catch (error) {
      window.alert("Error adding address: " + error.message);
    }

    setIsWaiting(false);
  };

  const removeAddressHandler = async () => {
    if (!selectedAddress) return;

    setIsWaiting(true);
    try {
      const signer = await provider.getSigner();
      const crowdsaleWithSigner = crowdsale.connect(signer);

      const transaction = await crowdsaleWithSigner.removeAllowedAddress(
        selectedAddress
      );

      // Reload addresses
      const length = await crowdsale.allowedAddressesLength();

      const addresses = [];
      for (let i = 0; i < length.toNumber(); i++) {
        const address = await crowdsale.allowedAddresses(i);
        if (address) addresses.push(address);
      }

      setAllowedAddresses(addresses);
      setSelectedAddress(""); // Clear selection
    } catch (error) {
      console.error("Error removing address:", error);
      window.alert("Error removing address: " + error.message);
    }
    setIsWaiting(false);
  };

  return (
    <>
      <div className="my-4 text-center">
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
        <Form.Group as={Row} className="my-4 justify-content-center">
          <Col xs={8} md={6}>
            <Form.Control
              type="text"
              placeholder="Enter Address"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              required
            />
          </Col>
          <Col xs="auto">
            <Button variant="primary" type="submit" disabled={isWaiting}>
              {isWaiting ? "Adding..." : "Add Address"}
            </Button>
          </Col>
        </Form.Group>
      </Form>

      <Form.Group as={Row} className="my-4 justify-content-center">
        <Col xs={8} md={6}>
          <Form.Select
            value={selectedAddress}
            onChange={(e) => setSelectedAddress(e.target.value)}
          >
            <option value="">Select an address to remove</option>
            {allowedAddresses.map((address) => (
              <option key={address} value={address}>
                {address}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col xs="auto">
          <Button
            variant="danger"
            onClick={removeAddressHandler}
            disabled={isWaiting || !selectedAddress}
          >
            {isWaiting ? "Removing..." : "Remove Address"}
          </Button>
        </Col>
      </Form.Group>
    </>
  );
};

export default AllowedAddresses;
