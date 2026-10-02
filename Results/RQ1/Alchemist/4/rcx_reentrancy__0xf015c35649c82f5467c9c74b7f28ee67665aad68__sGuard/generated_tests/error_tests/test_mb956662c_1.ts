import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant mb956662c test", function () {
  it("should kill mutant by verifying successful withdrawal when all conditions are met", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    const bankAddress = await instance.getAddress();
    
    // Get initial balance snapshot
    const initialBalance = await ethers.provider.getBalance(addr1.address);
    
    // Deposit 2 ether with unlock time = current block timestamp + 1 hour
    const depositAmount = ethers.parseEther("2");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    await instance.connect(addr1).Put(unlockTime, { value: depositAmount });
    
    // Verify balance is recorded
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Fast forward time past unlockTime
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to collect 1 ether (should succeed in original, fail in mutant)
    const collectAmount = ethers.parseEther("1");
    
    // Check if transaction succeeds or reverts
    try {
      const tx = await instance.connect(addr1).Collect(collectAmount);
      await tx.wait();
      
      // If we reach here, transaction succeeded (original behavior)
      // Verify balance decreased
      const updatedHolder = await instance.Acc(addr1.address);
      expect(updatedHolder.balance).to.equal(depositAmount - collectAmount);
      
      // Verify funds were transferred
      const finalBalance = await ethers.provider.getBalance(addr1.address);
      expect(finalBalance).to.be.gt(initialBalance);
      
      // This test passes on original, but would fail on mutant
      // because mutant would not execute the transfer
      console.log("Test passed - original behavior detected");
      
    } catch (error) {
      // If transaction reverts, it's the mutant behavior
      // The test should fail on mutant because conditions were met
      expect.fail("Mutant detected: withdrawal reverted even though all conditions were met");
    }
  });
});