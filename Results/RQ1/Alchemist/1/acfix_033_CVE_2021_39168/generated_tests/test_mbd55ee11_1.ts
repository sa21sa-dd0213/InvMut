import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mbd55ee11 test", function () {
  it("should kill mutant by calling scheduleBatch with equal-length arrays and expecting success", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy TimelockController with required constructor arguments
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to proposer for testing
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    
    await instance.connect(owner).grantRole(PROPOSER_ROLE, proposer.address);
    
    // Prepare equal-length arrays for scheduleBatch
    const targets = [ethers.ZeroAddress, ethers.ZeroAddress];
    const values = [0, 0];
    const datas = ["0x", "0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay + 100; // Must be >= minDelay
    
    // This call should succeed on the original (equal lengths) 
    // but will revert on the mutant (which requires lengths != equal)
    await expect(
      instance.connect(proposer).scheduleBatch(
        targets,
        values,
        datas,
        predecessor,
        salt,
        delay
      )
    ).to.not.be.reverted;
  });
});