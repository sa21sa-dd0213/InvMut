import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog - kill mutant m89614410 (missing event emission in logExitedCourtesyCall)", function () {
  it("should emit ExitedCourtesyCall when logExitedCourtesyCall is called by an approved logger", async function () {
    const [owner, approvedLogger] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve the logger
    await instance.connect(owner).setApprovedLogger(approvedLogger.address, true);

    // Verify the logger is approved
    expect(await instance.connect(approvedLogger).approvedToLog(approvedLogger.address)).to.equal(true);

    // Call logExitedCourtesyCall and expect the event to be emitted
    const tx = await instance.connect(approvedLogger).logExitedCourtesyCall();
    const receipt = await tx.wait();

    // Get the block timestamp after the transaction is mined
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    
    // Check that the ExitedCourtesyCall event was emitted with the correct parameters
    await expect(tx)
      .to.emit(instance, "ExitedCourtesyCall")
      .withArgs(approvedLogger.address, block.timestamp);
  });
});