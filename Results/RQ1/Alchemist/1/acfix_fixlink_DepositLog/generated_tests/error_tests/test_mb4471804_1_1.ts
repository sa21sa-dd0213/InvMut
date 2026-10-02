import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant test for logStartedLiquidation", function () {
  it("should emit StartedLiquidation event when called by approved logger", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve addr1 as a logger
    await instance.connect(owner).setApprovedLogger(addr1.address, true);

    // Get the current block timestamp before calling the function
    const block = await ethers.provider.getBlock("latest");
    const timestamp = block!.timestamp;

    // Call logStartedLiquidation and check for event emission
    await expect(instance.connect(addr1).logStartedLiquidation(true))
      .to.emit(instance, "StartedLiquidation")
      .withArgs(addr1.address, true, timestamp);
  });
});