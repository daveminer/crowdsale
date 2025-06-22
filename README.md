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

In a second terminal, run the deployment script:
```
npx hardhat run scripts/deploy.js --network localhost
```

The contract is intially locked with an activation time in the future. To advance time past the activation threshold:
```
npx hardhat run scripts/advanceTime.js --network localhost
```

### Update the allowed address list

The allowed list starts with only the deployer's address. To add another, browse to "Manage Addresses" and submit a new address with the form, using the deployer's account.

### Buy tokens with the newly allowed address

The newly allowed address can now purchase tokens; go back to the main page and token purchases will now succeed.
