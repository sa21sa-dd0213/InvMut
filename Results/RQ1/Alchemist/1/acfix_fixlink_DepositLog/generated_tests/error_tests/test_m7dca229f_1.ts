import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant test - logExitedCourtesyCall", function () {
  it("should return true when called by an approved logger (kills mutant m7dca229f)", async function () {
    const [owner, logger] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed based on the provided contract)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve the logger address
    await instance.connect(owner).setApprovedLogger(logger.address, true);

    // Verify logger is approved
    expect(await instance.approvedLoggers(logger.address)).to.equal(true);

    // Call logExitedCourtesyCall from the approved logger
    const tx = await instance.connect(logger).logExitedCourtesyCall();
    const receipt = await tx.wait();

    // Check that the function returned true (original behavior)
    // In ethers v6, we can check the return value from the transaction
    const result = await instance.connect(logger).callStatic.logExitedCourtesyCall();
    expect(result).to.equal(true);

    // Also verify the event was emitted
    await expect(tx)
      .to.emit(instance, "ExitedCourtesyCall")
      .withArgs(logger.address, ethers.anyValue);
  });
});