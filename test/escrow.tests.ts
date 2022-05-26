
import { ethers } from "hardhat";
import { expect }  from "chai";
import { Signer , BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { smock , MockContract } from "@defi-wonderland/smock";
import { Escrow,  Escrow__factory, TestToken, TestToken__factory } from '../typechain';
describe("Escrow", function () {  
  
  let accounts: SignerWithAddress[];
  let testToken : MockContract<TestToken>;
  let owner: SignerWithAddress;
	let user: SignerWithAddress;
  let tokenOwner : SignerWithAddress;
  let escrowContract : Escrow;
  let userEscrowContractConnection : Escrow;
  beforeEach(async function () {
    [owner,user,tokenOwner,...accounts] = await ethers.getSigners();

		const TestToken = await smock.mock<TestToken__factory>("TestToken",tokenOwner) ;
		testToken = await TestToken.deploy();

    testToken.setVariable('_totalSupply',1000000000000);
    const EscrowFactory = (await ethers.getContractFactory("Escrow",owner)) as Escrow__factory;
    escrowContract = await EscrowFactory.deploy(testToken.address);

    (await ethers.getContractFactory("Escrow",owner))
    const userFActory =EscrowFactory.connect(user);
    userEscrowContractConnection = await userFActory.attach(escrowContract.address)

    
  });

  const initUserToken = async (userAmount :BigNumber,userAllowance:BigNumber = userAmount)=>{
    const userAddress = user.address;
    const contractaddress  = escrowContract.address;
    const tokenBalances = {
      [userAddress] : BigNumber.from(userAmount)
    };

    const allowances = {
      [userAddress] : { [contractaddress] : BigNumber.from(userAllowance)} 
    }
    await testToken.setVariable('_totalSupply',userAmount);
    await testToken.setVariable('_balances',tokenBalances);
    await testToken.setVariable('_allowances',allowances);
  }

  it("Should create unpaused contract assigned to owner", async function () {
   
    expect( await escrowContract.state() ).to.equal(0);
    expect( await escrowContract.owner() ).to.equal(owner.address);
 
  });



  it("[Deposit] - Should deposit if allowed", async function () {

      const initialUserBalance = BigNumber.from(2000000000000) ;
      const depositAmount = BigNumber.from(1000000000000) ;
      const userAddress = user.address;


      await initUserToken(initialUserBalance);


      const ownerAddress = owner.address;
      const contractaddress  = escrowContract.address;

      const tx=  await userEscrowContractConnection.deposit(depositAmount);

       const deposit = await escrowContract.depositsOf(userAddress);
       expect(deposit.toHexString()).to.equal(depositAmount.toHexString())

       //should set balance in token
       const contractTokenBalance = await testToken.balanceOf(contractaddress);
       expect(contractTokenBalance.toHexString()).to.equal(depositAmount.toHexString());

       const finalUserBalance = initialUserBalance.sub(depositAmount)  ;
       expect((await testToken.balanceOf(userAddress)).toHexString()).to.equal(finalUserBalance.toHexString());


  });


  it("[Deposit] - Should multiple deposit if allowed", async function () {

    const initialUserBalance = BigNumber.from(2000000000000) ;
    const depositAmount = BigNumber.from(1000000000000) ;
    const userAddress = user.address;


    await initUserToken(initialUserBalance);


    const ownerAddress = owner.address;
    const contractaddress  = escrowContract.address;

    await userEscrowContractConnection.deposit(depositAmount);
    await userEscrowContractConnection.deposit(depositAmount);

     const deposit = await escrowContract.depositsOf(userAddress);
     const finalUserBalance = initialUserBalance.sub(depositAmount).sub(depositAmount)  ;
     expect((await testToken.balanceOf(userAddress)).toHexString()).to.equal(finalUserBalance.toHexString());

     const contractTokenBalance = await testToken.balanceOf(contractaddress);
     expect(contractTokenBalance.toHexString()).to.equal(depositAmount.add(depositAmount).toHexString());
     expect(deposit.toHexString()).to.equal(depositAmount.add(depositAmount).toHexString())


});

  it("[Deposit] - Should  not deposit if not having token allowance", async function () {
    const initialUserBalance = BigNumber.from(2000000000000) ;
    const depositAmount = BigNumber.from(1000000000000) ;
    const userAddress = user.address;


    await initUserToken(initialUserBalance,BigNumber.from(0));
    const contractaddress  = escrowContract.address;

    await expect(   userEscrowContractConnection.deposit(depositAmount)).to.be.revertedWith('ERC20: transfer amount exceeds allowance');

     const deposit = await escrowContract.depositsOf(userAddress);
     expect(deposit.toNumber()).to.equal(0);

     //should set balance in token
     const contractTokenBalance = await testToken.balanceOf(contractaddress);
     expect(contractTokenBalance.toNumber()).to.equal(0);

     expect((await testToken.balanceOf(userAddress)).toHexString()).to.equal(initialUserBalance.toHexString());
});

it("[Deposit] - Should  not be able to deposit if lock", async function () {
  const amount : BigNumber = BigNumber.from('10000000000');
  await escrowContract.lock();
  await expect( escrowContract.deposit(amount)).to.be.revertedWith('Contract needs to be Active');
  const deposit = await escrowContract.depositsOf(owner.address);
  expect(deposit).not.to.equal(amount)
});

it("[Deposit] - Should  not be able to deposit if unstaking", async function () {
  const amount : BigNumber = BigNumber.from('10000000000');
  await escrowContract.unstaking();
  await expect( escrowContract.deposit(amount)).to.be.revertedWith('Contract needs to be Active');
  const deposit = await escrowContract.depositsOf(owner.address);
  expect(deposit).not.to.equal(amount)
});


it("[DrainToOwner ] - should withdraw single user", async function () {
  const initialUserBalance = BigNumber.from(2000000000000) ;
  const depositAmount = BigNumber.from(1000000000000) ;
  const userAddress = user.address;


  await initUserToken(initialUserBalance);


  const contractaddress  = escrowContract.address;

  const tx=  await userEscrowContractConnection.deposit(depositAmount);

   const deposit = await escrowContract.depositsOf(userAddress);
   expect(deposit.toHexString()).to.equal(depositAmount.toHexString())

   await expect(escrowContract.drainToOwner([ user.address] ));


   //should set balance in token
   const contractTokenBalance = await testToken.balanceOf(contractaddress);
   expect(contractTokenBalance.toNumber()).to.equal(0);

   expect((await testToken.balanceOf(owner.address)).toHexString()).to.equal(depositAmount.toHexString());

});

it("[DrainToOwner ] - should withdraw multiple user", async function () {
 const initialUserBalance = BigNumber.from(2000000000000) ;
 const depositAmount = BigNumber.from(1000000000000) ;
 const userAddress = user.address;


 await initUserToken(initialUserBalance);


 const contractaddress  = escrowContract.address;

 await userEscrowContractConnection.deposit(depositAmount);
 await userEscrowContractConnection.deposit(depositAmount);


  await expect(escrowContract.drainToOwner([ user.address,user.address] ));


  //should set balance in token
  const contractTokenBalance = await testToken.balanceOf(contractaddress);
  expect(contractTokenBalance.toNumber()).to.equal(0);

  expect((await testToken.balanceOf(owner.address)).toHexString()).to.equal(depositAmount.add(depositAmount).toHexString());

});

it("[EmergencyExit ] - fail if not owner", async function () {
  const initialUserBalance = BigNumber.from(2000000000000) ;
  const depositAmount = BigNumber.from(1000000000000) ;
  const userAddress = user.address;


  await initUserToken(initialUserBalance);


  const contractaddress  = escrowContract.address;

  await userEscrowContractConnection.deposit(depositAmount);
  await userEscrowContractConnection.deposit(depositAmount);


  const contractTokenBalanceBeforeEmergency = await testToken.balanceOf(contractaddress);

   await expect(userEscrowContractConnection.emergencyExit()).to.be.revertedWith('Ownable: caller is not the owner');



});


it("[EmergencyExit ] - fail if no balance", async function () {

  await   expect(  escrowContract.emergencyExit()).to.be.revertedWith('should have something to drain');



});

it("[EmergencyExit ] - should withdraw multiple user", async function () {
  const initialUserBalance = BigNumber.from(2000000000000) ;
  const depositAmount = BigNumber.from(1000000000000) ;
  const userAddress = user.address;


  await initUserToken(initialUserBalance);


  const contractaddress  = escrowContract.address;

  await userEscrowContractConnection.deposit(depositAmount);
  await userEscrowContractConnection.deposit(depositAmount);


  const contractTokenBalanceBeforeEmergency = await testToken.balanceOf(contractaddress);

   await escrowContract.emergencyExit();


   //should set balance in token
   const contractTokenBalance = await testToken.balanceOf(contractaddress);
   expect(contractTokenBalance.toNumber()).to.equal(0);

   expect((await testToken.balanceOf(owner.address)).toHexString()).to.equal(contractTokenBalanceBeforeEmergency.toHexString());

});

it('[State] Only ownwer should be able to change state',async function () {
  await expect( userEscrowContractConnection.lock() ).to.be.revertedWith('Ownable: caller is not the owner');
  await expect( userEscrowContractConnection.unstaking() ).to.be.revertedWith('Ownable: caller is not the owner');

})

it('[State] owner should change state to lock',async function () {
  await expect( escrowContract.lock() ).to.emit(escrowContract,'EscrowLocked');
  const status = await escrowContract.state();
  expect(status).to.equal(2);

})

it('[State] owner should change state to unstaking',async function () {
  await expect( escrowContract.unstaking() ).to.emit(escrowContract,'EscrowUnstaking');
  const status = await escrowContract.state();
  expect(status).to.equal(1);

})


it('[State] owner should change state to active',async function () {

  await expect( escrowContract.lock() ).to.emit(escrowContract,'EscrowLocked');
  await expect( escrowContract.activate() ).to.emit(escrowContract,'EscrowActivated');
  const status = await escrowContract.state();
  expect(status).to.equal(0);

})

it('[State] should not be able to activated already active contract',async function () {

  await expect( escrowContract.activate() ).to.be.revertedWith('Escrow is already active');

})


it('[Utilities] Should Init User Token Values',async function () {
  const supply =BigNumber.from(10000000);
  await initUserToken(supply);

  const tokenSupply = await testToken.totalSupply();
  expect(tokenSupply.toHexString()).to.equal(supply.toHexString());

  const userBalance = await testToken.balanceOf(user.address);
  expect(userBalance.toHexString()).to.equal(supply.toHexString());      

})


  it("[Withdraw | User ] - Should be able to withdraw", async function () {

    const initialUserBalance = BigNumber.from(2000000000000) ;
    const depositAmount = BigNumber.from(1000000000000) ;
    const userAddress = user.address;


    await initUserToken(initialUserBalance);


    const contractaddress  = escrowContract.address;

    const tx=  await userEscrowContractConnection.deposit(depositAmount);

     const deposit = await escrowContract.depositsOf(userAddress);
     expect(deposit.toHexString()).to.equal(depositAmount.toHexString())

     await userEscrowContractConnection.withdraw(depositAmount);

     //should set balance in token
     const contractTokenBalance = await testToken.balanceOf(contractaddress);
     expect(contractTokenBalance.toNumber()).to.equal(0);

     const finalUserBalance = initialUserBalance.sub(depositAmount).add(depositAmount)  ;
     expect((await testToken.balanceOf(userAddress)).toHexString()).to.equal(finalUserBalance.toHexString());


});


it("[Withdraw | User ] - Shouldnt be able to withdraw more than balance", async function () {

  const initialUserBalance = BigNumber.from(2000000000000) ;
  const depositAmount = BigNumber.from(1000000000000) ;
  const userAddress = user.address;

  await initUserToken(initialUserBalance);

  const contractaddress  = escrowContract.address;

  const tx=  await userEscrowContractConnection.deposit(depositAmount);

   const deposit = await escrowContract.depositsOf(userAddress);
   expect(deposit.toHexString()).to.equal(depositAmount.toHexString())

   await expect( userEscrowContractConnection.withdraw(initialUserBalance)).to.be.revertedWith('');

   //should set balance in token
   const contractTokenBalance = await testToken.balanceOf(contractaddress);
   expect(contractTokenBalance.toNumber()).to.equal(depositAmount.toNumber());


});


it("[Withdraw | User ] - Shouldnt be able to withdraw if no balance", async function () {

  const initialUserBalance = BigNumber.from(2000000000000) ;
  const depositAmount = BigNumber.from(1000000000000) ;
  const userAddress = user.address;

  await initUserToken(initialUserBalance);

  const contractaddress  = escrowContract.address;

  const balance = await userEscrowContractConnection.depositsOf(user.address);
  expect(balance.toNumber()).to.equal(0);
   await  expect( userEscrowContractConnection.withdraw(initialUserBalance) ).to.be.revertedWith('No valid balance Found for user');


});



it("[Withdraw | User ] - Should  not be able to withdraw if lock", async function () {
  const amount : BigNumber = BigNumber.from('10000000000');
  await escrowContract.lock();
  await expect( escrowContract.withdraw(amount)).to.be.revertedWith('Contract is locked');
  const deposit = await escrowContract.depositsOf(owner.address);
  expect(deposit).not.to.equal(amount)
});

it("[Withdraw | User ] - Should   be able to withdraw if unstaking", async function () {
  const initialUserBalance = BigNumber.from(2000000000000) ;
  const depositAmount = BigNumber.from(1000000000000) ;
  const userAddress = user.address;


  await initUserToken(initialUserBalance);


  const contractaddress  = escrowContract.address;

  const tx=  await userEscrowContractConnection.deposit(depositAmount);

   const deposit = await escrowContract.depositsOf(userAddress);
   expect(deposit.toHexString()).to.equal(depositAmount.toHexString())

   await escrowContract.unstaking();
   await userEscrowContractConnection.withdraw(depositAmount);

   //should set balance in token
   const contractTokenBalance = await testToken.balanceOf(contractaddress);
   expect(contractTokenBalance.toNumber()).to.equal(0);

   const finalUserBalance = initialUserBalance.sub(depositAmount).add(depositAmount)  ;
   expect((await testToken.balanceOf(userAddress)).toHexString()).to.equal(finalUserBalance.toHexString());
});


it("[WithdrawToOwner ] - Should   do nothing if no args", async function () {
   await expect(escrowContract.withdrawToOwner([] , [])).to.be.revertedWith('should specify at least one user');


});

it("[WithdrawToOwner ] - should have amount for each user", async function () {
   await expect(escrowContract.withdrawToOwner([ user.address] , [])).to.be.revertedWith('should have amount for each user');
});


it("[WithdrawToOwner ] - should withdraw single user", async function () {
  const initialUserBalance = BigNumber.from(2000000000000) ;
  const depositAmount = BigNumber.from(1000000000000) ;
  const userAddress = user.address;


  await initUserToken(initialUserBalance);


  const contractaddress  = escrowContract.address;

  const tx=  await userEscrowContractConnection.deposit(depositAmount);

   const deposit = await escrowContract.depositsOf(userAddress);
   expect(deposit.toHexString()).to.equal(depositAmount.toHexString())

   await expect(escrowContract.withdrawToOwner([ user.address] , [depositAmount]));


   //should set balance in token
   const contractTokenBalance = await testToken.balanceOf(contractaddress);
   expect(contractTokenBalance.toNumber()).to.equal(0);

   expect((await testToken.balanceOf(owner.address)).toHexString()).to.equal(depositAmount.toHexString());

});





it("[WithdrawToOwner ] - should withdraw multiple user", async function () {
  const initialUserBalance = BigNumber.from(2000000000000) ;
  const depositAmount = BigNumber.from(1000000000000) ;
  const userAddress = user.address;


  await initUserToken(initialUserBalance);


  const contractaddress  = escrowContract.address;

  await userEscrowContractConnection.deposit(depositAmount);
  await userEscrowContractConnection.deposit(depositAmount);


   await expect(escrowContract.withdrawToOwner([ user.address,user.address] , [depositAmount,depositAmount]));


   //should set balance in token
   const contractTokenBalance = await testToken.balanceOf(contractaddress);
   expect(contractTokenBalance.toNumber()).to.equal(0);

   expect((await testToken.balanceOf(owner.address)).toHexString()).to.equal(depositAmount.add(depositAmount).toHexString());

});





it("[WithdrawToOwner ] - should withdraw single user locked", async function () {
  const initialUserBalance = BigNumber.from(2000000000000) ;
  const depositAmount = BigNumber.from(1000000000000) ;
  const userAddress = user.address;


  await initUserToken(initialUserBalance);


  const contractaddress  = escrowContract.address;

  const tx=  await userEscrowContractConnection.deposit(depositAmount);

   const deposit = await escrowContract.depositsOf(userAddress);
   expect(deposit.toHexString()).to.equal(depositAmount.toHexString())

   await escrowContract.lock();
   await expect(escrowContract.withdrawToOwner([ user.address] , [depositAmount]));


   //should set balance in token
   const contractTokenBalance = await testToken.balanceOf(contractaddress);
   expect(contractTokenBalance.toNumber()).to.equal(0);

   expect((await testToken.balanceOf(owner.address)).toHexString()).to.equal(depositAmount.toHexString());

});


});
