import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m63c8167a test", function () {
  it("should revert when scheduleBatch is called with mismatched targets and datas array lengths", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 86400; // 1 day in seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to the test caller
    const timelockAdminRole = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    const proposerRole = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    await instance.connect(owner).grantRole(proposerRole, proposer.address);
    
    // Prepare mismatched arrays: 2 targets, 2 values, but 3 data elements
    const targets = [executor.address, executor.address];
    const values = [0, 0];
    const datas = [
      "0x",
      "0x",
      "0x"
    ];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test_salt"));
    
    // This should revert on original but may not on mutant
    await expect(
      instance.connect(proposer).scheduleBatch(
        targets,
        values,
        datas,
        predecessor,
        salt,
        minDelay
      )
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});