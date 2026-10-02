import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant test - kill m9b11bc4b (division instead of subtraction)", function () {
  it("should detect when Collect uses division instead of subtraction for balance update", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with the Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    const walletAddress = await instance.getAddress();
    
    // Fund addr1 with some ether for testing
    const depositAmount = ethers.parseEther("10");
    const withdrawAmount = ethers.parseEther("3");
    
    // Step 1: addr1 deposits 10 ether using Put function
    const putTx = await instance.connect(addr1).Put(
      Math.floor(Date.now() / 1000) + 3600, // unlock time 1 hour from now
      { value: depositAmount }
    );
    await putTx.wait();
    
    // Check initial balance
    const holderInfo = await instance.Acc(addr1.address);
    expect(holderInfo.balance).to.equal(depositAmount);
    
    // Step 2: Fast forward time past unlock time so Collect is allowed
    await ethers.provider.send("evm_increaseTime", [7200]); // 2 hours
    await ethers.provider.send("evm_mine", []);
    
    // Step 3: addr1 calls Collect with 3 ether
    const collectTx = await instance.connect(addr1).Collect(withdrawAmount);
    await collectTx.wait();
    
    // Step 4: Check the balance after Collect
    // In original: balance should be 10 - 3 = 7 ether
    // In mutant: balance would be 10 / 3 = 3.333... ether (truncated)
    const updatedHolderInfo = await instance.Acc(addr1.address);
    const expectedBalance = depositAmount - withdrawAmount; // 7 ether
    
    // This assertion will pass on original but fail on mutant
    expect(updatedHolderInfo.balance).to.equal(expectedBalance);
  });
});