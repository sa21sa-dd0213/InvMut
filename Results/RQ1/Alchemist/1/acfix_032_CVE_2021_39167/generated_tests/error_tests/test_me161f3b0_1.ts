import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - me161f3b0", function () {
  it("should kill the mutant by detecting PROPOSER_ROLE hash mismatch", async function () {
    const [owner, proposer] = await ethers.getSigners();
    
    // Deploy with proposer role granted to proposer address
    const minDelay = 86400; // 1 day in seconds
    const proposers = [proposer.address];
    const executors = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Attempt to schedule a transaction from the proposer address
    // This should work in the original but fail in the mutant because
    // the PROPOSER_ROLE hash is different
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.randomBytes(32);
    const delay = minDelay;
    
    await expect(
      instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay)
    ).to.be.revertedWith(
      "AccessControl: account " + proposer.address.toLowerCase() + " is missing role"
    );
  });
});