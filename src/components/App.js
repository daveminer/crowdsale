import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import Navigation from "./Navigation";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AllowedAddresses from "./AllowedAddresses";
import Home from "./Home";

import CROWDSALE_ABI from "../abis/Crowdsale.json";
import TOKEN_ABI from "../abis/Token.json";
import config from "../config.json";

function App() {
  const [provider, setProvider] = useState(null);
  const [crowdsale, setCrowdsale] = useState(null);
  const [account, setAccount] = useState(null);
  const [accountBalance, setAccountBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [price, setPrice] = useState(null);
  const [maxTokens, setMaxTokens] = useState(0);
  const [tokensSold, setTokensSold] = useState(0);

  const loadBlockchainData = async () => {
    // Initiate provider
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    setProvider(provider);

    const { chainId } = await provider.getNetwork();

    // Initiate contracts
    const token = new ethers.Contract(
      config[chainId].token.address,
      TOKEN_ABI,
      provider
    );
    const crowdsale = new ethers.Contract(
      config[chainId].crowdsale.address,
      CROWDSALE_ABI,
      provider
    );

    const signer = await provider.getSigner();

    const crowdsaleWithSigner = crowdsale.connect(signer);

    setCrowdsale(crowdsaleWithSigner);

    // Fetch accounts
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    const account = ethers.utils.getAddress(accounts[0]);
    setAccount(account);
    try {
      let balance = await token.balanceOf(account);
      // Fetch account balance
      const accountBalance = ethers.utils.formatUnits(balance, 18);
      setAccountBalance(accountBalance);
    } catch (error) {
      console.error("Error fetching balance:", error);
    }

    const price = ethers.utils.formatUnits(await crowdsale.price(), 18);
    setPrice(price);

    const maxTokens = ethers.utils.formatUnits(await crowdsale.maxTokens(), 18);
    setMaxTokens(maxTokens);

    const tokensSold = ethers.utils.formatUnits(
      await crowdsale.tokensSold(),
      18
    );
    setTokensSold(tokensSold);

    setIsLoading(false);
  };

  useEffect(() => {
    loadBlockchainData();
  }, []);

  return (
    <Container>
      <Navigation />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Home
                provider={provider}
                price={price}
                crowdsale={crowdsale}
                account={account}
                accountBalance={accountBalance}
                setIsLoading={setIsLoading}
                tokensSold={tokensSold}
                maxTokens={maxTokens}
              />
            }
          />
          <Route
            path="/allowed-addresses"
            element={
              <AllowedAddresses provider={provider} crowdsale={crowdsale} />
            }
          />
        </Routes>
      </BrowserRouter>
    </Container>
  );
}

export default App;
