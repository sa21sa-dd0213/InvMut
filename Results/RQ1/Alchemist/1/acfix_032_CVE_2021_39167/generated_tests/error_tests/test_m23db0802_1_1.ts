import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - m23db0802", function () {
  it("should revert when executeBatch is called with mismatched targets and values array lengths", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy TimelockController with required constructor arguments
    const minDelay = 3600; // 1 hour
    const proposers = [owner.address];
    const executors = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Prepare mismatched arrays for executeBatch
    const targets = [addr1.address, addr2.address]; // 2 targets
    const values = [ethers.parseEther("1.0")]; // 1 value (mismatched)
    const datas = ["0x", "0x"]; // 2 datas
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    
    // Schedule the operation first to make it ready for execution
    const batchId = await instance.hashOperationBatch(targets, values, datas, predecessor, salt);
    await instance.scheduleBatch(targets, values, datas, predecessor, salt, minDelay);
    
    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to execute with mismatched arrays - should revert in original but not in mutant
    await expect(
      instance.executeBatch(targets, values, datas, predecessor, salt, { value: ethers.parseEther("1.0") })
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});