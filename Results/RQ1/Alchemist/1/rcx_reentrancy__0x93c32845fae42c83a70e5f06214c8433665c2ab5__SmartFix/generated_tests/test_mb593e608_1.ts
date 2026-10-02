import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET - Kill mutant mb593e608 (block.prevrandao vs block.timestamp)", function () {
  it("should detect mutant by using _unlockTime between block.prevrandao and block.timestamp", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Get current block timestamp and prevrandao (via a dummy transaction)
    const blockBefore = await ethers.provider.getBlock("latest");
    const currentTimestamp = blockBefore!.timestamp;
    const currentPrevRandao = blockBefore!.prevrandao;
    
    // Ensure we have a scenario where _unlockTime is between prevrandao and timestamp
    // If prevrandao < timestamp, we can use a value in between
    // If prevrandao >= timestamp, we need to mine a new block to change values
    let unlockTime: bigint;
    if (currentPrevRandao !== null && currentPrevRandao < currentTimestamp) {
      // Use a value strictly between prevrandao and timestamp
      unlockTime = currentPrevRandao + 1n;
    } else {
      // Mine a new block to create the desired relationship
      await ethers.provider.send("evm_mine", []);
      const newBlock = await ethers.provider.getBlock("latest");
      const newTimestamp = newBlock!.timestamp;
      const newPrevRandao = newBlock!.prevrandao;
      
      if (newPrevRandao !== null && newPrevRandao < newTimestamp) {
        unlockTime = newPrevRandao + 1n;
      } else {
        // Force by mining with specific timestamp
        await ethers.provider.send("evm_setNextBlockTimestamp", [newTimestamp + 100]);
        await ethers.provider.send("evm_mine", []);
        const forcedBlock = await ethers.provider.getBlock("latest");
        unlockTime = (forcedBlock!.prevrandao !== null ? forcedBlock!.prevrandao : 0n) + 1n;
      }
    }
    
    // Ensure unlockTime is less than current block.timestamp (so original would use block.timestamp)
    const currentBlock = await ethers.provider.getBlock("latest");
    expect(unlockTime).to.be.lessThan(currentBlock!.timestamp);
    
    // Call Put with value and unlockTime
    const putValue = ethers.parseEther("1");
    await instance.connect(addr1).Put(unlockTime, { value: putValue });
    
    // Check the unlockTime stored for addr1
    const holder = await instance.Acc(addr1.address);
    const storedUnlockTime = holder.unlockTime;
    
    // In the original contract, unlockTime should be block.timestamp (since _unlockTime < block.timestamp)
    // In the mutant, unlockTime might be _unlockTime if _unlockTime > block.prevrandao
    // We can verify by attempting to collect before the original's expected unlock time
    const minSum = await instance.MinSum();
    const collectAmount = ethers.parseEther("1");
    
    // Try to collect immediately - should revert in original (locked until timestamp)
    // In mutant it might succeed if unlockTime was set incorrectly
    const tx = instance.connect(addr1).Collect(collectAmount);
    
    // The test expects a revert because the mutant would incorrectly allow early withdrawal
    // If mutant is present, tx may succeed (killing the mutant)
    // If original is present, tx will revert (test passes)
    await expect(tx).to.be.reverted;
  });
});