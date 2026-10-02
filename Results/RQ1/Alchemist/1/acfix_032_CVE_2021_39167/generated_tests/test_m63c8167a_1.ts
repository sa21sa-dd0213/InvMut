import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m63c8167a", function () {
  it("should revert when scheduleBatch is called with mismatched targets and datas array lengths", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy TimelockController with proposers and executors
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to proposer
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    
    // The owner is already the admin, so they can grant roles
    await instance.connect(owner).grantRole(PROPOSER_ROLE, proposer.address);
    
    // Prepare mismatched arrays: 2 targets, 2 values, but only 1 data element
    const targets = [owner.address, executor.address];
    const values = [0, 0];
    const datas = [
      ethers.toUtf8Bytes("0x")
    ]; // Only 1 data element, but 2 targets
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;
    
    // This should revert on original due to length mismatch, but pass on mutant
    await expect(
      instance.connect(proposer).scheduleBatch(
        targets,
        values,
        datas,
        predecessor,
        salt,
        delay
      )
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});