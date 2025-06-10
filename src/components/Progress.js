import { ProgressBar } from "react-bootstrap";

const Progress = ({ tokensSold, maxTokens }) => {
  return (
    <>
      <ProgressBar
        now={(tokensSold / maxTokens) * 100}
        label={`${(tokensSold / maxTokens) * 100}%`}
      />
      <p className="text-center my-3">
        {tokensSold} / {maxTokens} Tokens Sold
      </p>
    </>
  );
};

export default Progress;
