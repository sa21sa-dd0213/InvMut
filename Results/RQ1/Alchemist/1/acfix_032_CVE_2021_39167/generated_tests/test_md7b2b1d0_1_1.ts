import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant md7b2b1d0 - updateDelay authorization", function () {
  it("should revert when updateDelay is called by an address other than the timelock contract itself", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy TimelockController with minimal constructor arguments
    const minDelay = 86400; // 1 day in seconds
    const proposers: string[] = [owner.address];
    const executors: string[] = [owner.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    const newDelay = 172800; // 2 days in seconds

    // Attempt to call updateDelay from an unauthorized address (not the timelock contract itself)
    // In the original contract this should revert because msg.sender != address(this)
    // In the mutant (which removes the require check), this call would succeed
    await expect(
      instance.connect(attacker).updateDelay(newDelay)
    ).to.be.revertedWith("TimelockController: caller must be timelock");
  });
});