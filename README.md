# Escrow Contract

This project implements a contract for depositing / withdrawing funds .

- The **escrow** contract can have 3 states
    * **Active**: User can deposit and withdraw funds into contract
    * **Unstaking**: User can't deposit but can withdraw funds from contract
    * **Locked**: User can't deposit not withdraw

- **User** can deposit and withdraw tokens into contract

- **Owner** can withdraw deposited token amounts into himself 
- **Owner** can change contract state to enable disable operations
- **Owner** can perform an emergency exit draining all contract funds into himself




## Npx commands 


Run Tests
```shell
npx hardhat test
```

Compile project
```shell
npx hardhat compile
```
Generate Typescript
```shell
npx hardhat typechain
```
