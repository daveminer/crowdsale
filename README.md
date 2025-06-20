# Shiba Snax
This project demonstrates a crowdsale contract with a number of features:

- Purchases are limited to an owner-controlled list of allowed addresses, managed by a Merkle tree
- Purchases activate at a specified time
- Maximum and minimum purchase constraints


## Local Usage

### Start the Node

In a new terminal, run the following:
```
npx hardat node
```

### Deploy the contracts

TODOOOO: this should create the allowlist

In a second terminal, run the deployment script:
```
npx hardhat run scripts/deploy.js --network localhost
```

The contract is intially locked with an activation time in the future. To advance time past the activation threshold:
```
npx hardhat run scripts/advanceTime.js --network localhost
```

### Update the allowed address list
```

```