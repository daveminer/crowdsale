import { useState, useEffect } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Spinner from "react-bootstrap/Spinner";
import { ethers } from "ethers";

const Buy = ({ provider, price, crowdsale, setIsLoading }) => {
  const [activeTimestamp, setActiveTimestamp] = useState(0);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [amount, setAmount] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);

  const buyHandler = async (e) => {
    e.preventDefault();
    setIsWaiting(true);

    try {
      console.log("buying tokens...", amount);
      const signer = await provider.getSigner();

      const value = ethers.utils.parseUnits(
        (amount * price).toString(),
        "ether"
      );
      const formattedAmount = ethers.utils.parseUnits(
        amount.toString(),
        "ether"
      );

      const transaction = await crowdsale
        .connect(signer)
        .buyTokens(formattedAmount, { value });
      await transaction.wait();
    } catch (error) {
      window.alert(`User rejected or transaction reverted: ${error.message}`);
    }

    setIsWaiting(false);
    setIsLoading(true);
  };

  useEffect(() => {
    const updateTimestamps = async () => {
      if (crowdsale) {
        const activeTimestamp = await crowdsale.activeOn();
        setActiveTimestamp(activeTimestamp);
      }
      if (provider) {
        const block = await provider.getBlock("latest");
        setCurrentTimestamp(block.timestamp);
      }
    };

    updateTimestamps();
    const interval = setInterval(updateTimestamps, 1000);
    return () => clearInterval(interval);
  }, [crowdsale, provider]);

  const getTimeRemaining = () => {
    if (!activeTimestamp || !currentTimestamp) return "";

    const timeRemaining = activeTimestamp - currentTimestamp;
    console.log(
      "Active timestamp:",
      new Date(activeTimestamp * 1000).toLocaleString()
    );
    console.log(
      "Current timestamp:",
      new Date(currentTimestamp * 1000).toLocaleString()
    );
    console.log("Time remaining (seconds):", timeRemaining);

    if (timeRemaining <= 0) return "Buy Tokens";

    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);

    return `Token unlocks in ${hours} hours, ${minutes} minutes`;
  };

  return (
    <Form
      onSubmit={buyHandler}
      style={{ maxWidth: "800px", margin: "50px auto" }}
    >
      <Form.Group as={Row}>
        <Col>
          <Form.Control
            type="number"
            placeholder="Enter amount"
            onChange={(e) => setAmount(e.target.value)}
          />
        </Col>
        <Col className="text-center">
          {isWaiting ? (
            <Spinner animation="border" />
          ) : (
            <Button
              variant="primary"
              type="submit"
              style={{ width: "100%" }}
              disabled={currentTimestamp < activeTimestamp}
            >
              {getTimeRemaining()}
            </Button>
          )}
        </Col>
      </Form.Group>
    </Form>
  );
};

export default Buy;
