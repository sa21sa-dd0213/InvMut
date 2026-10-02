import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test for updateDelay", function () {
  it("should revert when unauthorized address calls updateDelay", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour in seconds
    const proposers: string[] = [owner.address];
    const executors: string[] = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Attempt to call updateDelay from an unauthorized address (addr1)
    // This should revert because only the timelock contract itself (address(this)) should be able to call it
    await expect(
      instance.connect(addr1).updateDelay(7200)
    ).to.be.revertedWith("TimelockController: caller must be timelock");
  });
});