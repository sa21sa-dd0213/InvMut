import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mc5ed8dbf test", function () {
  it("should revert when non-EXECUTOR_ROLE address tries to execute without open role", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with proposers and executors that do NOT include address(0)
    // Only owner gets EXECUTOR_ROLE, address(0) is not granted any role
    const minDelay = 3600; // 1 hour
    const proposers = [addr1.address];
    const executors = [owner.address]; // Only owner has EXECUTOR_ROLE
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Schedule an operation as a proposer
    const target = addr2.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;
    
    await instance.connect(addr1).schedule(target, value, data, predecessor, salt, delay);
    
    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to execute from addr2 (who does NOT have EXECUTOR_ROLE)
    // In the original contract this should revert because address(0) doesn't have EXECUTOR_ROLE
    // In the mutant it would incorrectly succeed because the check is bypassed
    await expect(
      instance.connect(addr2).execute(target, value, data, predecessor, salt, { value: 0 })
    ).to.be.reverted;
  });
});