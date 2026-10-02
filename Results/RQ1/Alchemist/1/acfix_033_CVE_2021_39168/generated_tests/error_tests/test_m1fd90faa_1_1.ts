import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - m1fd90faa", function () {
  it("should kill mutant with off-by-one error in scheduleBatch loop", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 86400; // 1 day in seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to proposer for scheduling
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    
    await instance.connect(owner).grantRole(PROPOSER_ROLE, proposer.address);
    
    // Prepare a simple batch with exactly one operation
    const targets = [owner.address];
    const values = [0];
    const datas = ["0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    
    // This should succeed on original but fail on mutant due to out-of-bounds access
    await expect(
      instance.connect(proposer).scheduleBatch(
        targets,
        values,
        datas,
        predecessor,
        salt,
        minDelay
      )
    ).to.not.be.reverted;
  });
});