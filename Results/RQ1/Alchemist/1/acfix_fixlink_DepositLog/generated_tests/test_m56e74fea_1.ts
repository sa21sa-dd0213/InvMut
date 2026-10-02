import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant m56e74fea test", function () {
  it("should emit Funded event when logFunded is called by approved logger", async function () {
    const [owner, logger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner approves the logger
    await instance.connect(owner).setApprovedLogger(logger.address, true);

    // Call logFunded from approved logger and check for event emission
    const tx = await instance.connect(logger).logFunded();
    const receipt = await tx.wait();

    // Assert that the Funded event was emitted
    expect(receipt).to.emit(instance, "Funded").withArgs(logger.address, anyValue);
  });
});