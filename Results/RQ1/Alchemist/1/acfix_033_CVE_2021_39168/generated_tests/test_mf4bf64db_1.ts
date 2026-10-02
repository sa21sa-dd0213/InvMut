import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - mf4bf64db", function () {
  it("should detect mutant where proposers are not assigned due to loop condition change from < to >", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    
    // Verify the proposer was NOT granted the role (mutant behavior)
    const hasRole = await instance.hasRole(PROPOSER_ROLE, proposer.address);
    expect(hasRole).to.equal(false);
    
    // Attempt to schedule from proposer address - should fail because proposer doesn't have the role
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const delay = minDelay;
    
    const id = await instance.hashOperation(target, value, data, predecessor, salt);
    
    await expect(
      instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay)
    ).to.be.revertedWith(
      "AccessControl: account " + proposer.address.toLowerCase().slice(2) + 
      " is missing role " + PROPOSER_ROLE.slice(2)
    );
  });
});