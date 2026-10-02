import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant test for Collect function (m2f76b2fd)", function () {
  it("should kill the mutant by showing that a user with balance > _am cannot collect when condition is incorrectly changed to <= _am", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy DEP_BANK - no constructor arguments needed
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy LogFile separately (required for DEP_BANK to function)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Initialize the contract
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).SetMinSum(ethers.parseEther("1"));
    await instance.connect(owner).Initialized();
    
    // User deposits 2 ETH
    const depositAmount = ethers.parseEther("2");
    await instance.connect(user).Deposit({ value: depositAmount });
    
    // User tries to collect 1.5 ETH (balance is 2 ETH, which is > 1.5 ETH)
    // Original: should succeed (balance >= MinSum and balance >= _am)
    // Mutant: should fail (balance >= MinSum but balance <= _am is false since 2 > 1.5)
    const collectAmount = ethers.parseEther("1.5");
    
    // On the original this would succeed, but on the mutant it should revert
    // We expect the transaction to succeed (original behavior), 
    // but the mutant will cause it to revert, thus killing the mutant
    await expect(
      instance.connect(user).Collect(collectAmount)
    ).to.not.be.reverted;
    
    // Verify the balance decreased correctly
    const finalBalance = await instance.balances(user.address);
    expect(finalBalance).to.equal(ethers.parseEther("0.5"));
  });
});