import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mbd8c9112", function () {
  it("should revert when unauthorized address calls execute without EXECUTOR_ROLE", async function () {
    const [owner, proposer, unauthorized] = await ethers.getSigners();
    
    // Deploy with proposers but NO executors (so EXECUTOR_ROLE is not open to address(0))
    const minDelay = 86400; // 1 day in seconds
    const proposers = [proposer.address];
    const executors: string[] = []; // Empty array - no executors assigned
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();
    
    // Grant PROPOSER_ROLE to proposer so they can schedule
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    await timelock.connect(owner).grantRole(TIMELOCK_ADMIN_ROLE, proposer.address);
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    await timelock.connect(owner).grantRole(PROPOSER_ROLE, proposer.address);
    
    // Proposer schedules a simple call to selfdestruct or just a no-op
    const target = timelock.target;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.randomBytes(32);
    
    await timelock.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      minDelay
    );
    
    // Fast forward time past the delay
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Unauthorized user tries to execute - should revert on original but succeed on mutant
    await expect(
      timelock.connect(unauthorized).execute(
        target,
        value,
        data,
        predecessor,
        salt
      )
    ).to.be.reverted;
  });
});