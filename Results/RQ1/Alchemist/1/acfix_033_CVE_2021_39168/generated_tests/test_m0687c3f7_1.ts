import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - executeBatch off-by-one", function () {
  it("should revert on mutant when calling executeBatch with non-empty arrays due to out-of-bounds access", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant EXECUTOR_ROLE to executor and PROPOSER_ROLE to proposer
    const TIMELOCK_ADMIN_ROLE = ethers.id("TIMELOCK_ADMIN_ROLE");
    const PROPOSER_ROLE = ethers.id("PROPOSER_ROLE");
    const EXECUTOR_ROLE = ethers.id("EXECUTOR_ROLE");
    
    // Deployer has admin role, grant executor role to executor
    await instance.connect(owner).grantRole(EXECUTOR_ROLE, executor.address);
    
    // Prepare batch operation: schedule first, then execute
    const targets = [executor.address];
    const values = [0];
    const datas = ["0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.id("test");
    
    // Schedule the operation as proposer
    const delay = minDelay;
    await instance.connect(proposer).scheduleBatch(targets, values, datas, predecessor, salt, delay);
    
    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Execute - on original contract this succeeds, on mutant it reverts due to i <= targets.length
    await expect(
      instance.connect(executor).executeBatch(targets, values, datas, predecessor, salt, { value: 0 })
    ).to.be.reverted;
  });
});