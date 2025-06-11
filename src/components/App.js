import { Container } from "react-bootstrap";
import Info from "./Info";
import Navigation from "./Navigation";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import Buy from "./Buy";
import Loading from "./Loading";
import Progress from "./Progress";
// ABIs
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

    setCrowdsale(crowdsale);

    // Fetch accounts
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    const account = ethers.utils.getAddress(accounts[0]);
    setAccount(account);

    // Fetch account balance
    const accountBalance = ethers.utils.formatUnits(
      await token.balanceOf(account),
      18
    );
    setAccountBalance(accountBalance);

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
    if (isLoading) {
      loadBlockchainData();
    }
  }, [isLoading]);

  return (
    <Container>
      <Navigation />

      <h1 className="my-4 text-center">Introducing Shiba Snax Token!</h1>
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <p className="text-center">
            <strong>Current Price:</strong> {price} ETH
          </p>
          <Buy
            provider={provider}
            price={price}
            crowdsale={crowdsale}
            setIsLoading={setIsLoading}
          />
          <Progress tokensSold={tokensSold} maxTokens={maxTokens} />
        </>
      )}
      <hr />
      {account && <Info account={account} accountBalance={accountBalance} />}
    </Container>
  );
}

export default App;
