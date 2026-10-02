import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m2d98b6a1 - scheduleBatch length validation", function () {
  it("should revert when targets and values arrays have different lengths", async function () {
    const [owner, proposer] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to proposer
    const proposerRole = await instance.PROPOSER_ROLE();
    await instance.connect(owner).grantRole(proposerRole, proposer.address);
    
    // Prepare mismatched arrays: 2 targets but only 1 value
    const targets = [owner.address, proposer.address];
    const values = [ethers.parseEther("0.1")]; // Only 1 value for 2 targets
    const datas = ["0x", "0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;
    
    // This should revert in the original contract due to length mismatch
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