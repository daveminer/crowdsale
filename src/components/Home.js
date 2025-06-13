import Buy from "./Buy";
import Info from "./Info";
import Progress from "./Progress";

const Home = ({
  provider,
  price,
  crowdsale,
  account,
  accountBalance,
  setIsLoading,
  tokensSold,
  maxTokens,
}) => {
  return (
    <>
      <h1 className="my-4 text-center">Introducing Shiba Snax Token!</h1>
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
      <hr />
      {account && <Info account={account} accountBalance={accountBalance} />}
    </>
  );
};

export default Home;
