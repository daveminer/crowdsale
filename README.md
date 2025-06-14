# Shiba Snax
This project demonstrates a crowdsale contract with a number of features:

- Purchases are limited to an owner-controlled list of allowed addresses
- Purchases activate at a specified time
- Maximum and minimum purchase constraints


## Local Deployment

To deploy:
```
npx hardhat run scripts/deploy.js --network localhost
```

To advance time past the activation time in the deployed contract:
```
npx hardhat run scripts/advanceTime.js --network localhost
```
