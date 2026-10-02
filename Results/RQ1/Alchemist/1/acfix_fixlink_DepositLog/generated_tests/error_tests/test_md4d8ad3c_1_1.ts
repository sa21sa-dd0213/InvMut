import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant detection - logFraudDuringSetup", function () {
  it("should return true when called by an approved logger, but mutant returns false", async function () {
    const [owner, logger] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments as per original contract)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve the logger address
    await instance.connect(owner).setApprovedLogger(logger.address, true);

    // Verify the logger is approved
    expect(await instance.approvedToLog(logger.address)).to.equal(true);

    // Call logFraudDuringSetup from the approved logger - should return true in original
    const tx = await instance.connect(logger).logFraudDuringSetup();
    const receipt = await tx.wait();

    // Check that the transaction was successful (no revert)
    expect(receipt.status).to.equal(1);
    
    // Check the return value from the transaction
    const result = await instance.connect(logger).callStatic.logFraudDuringSetup();
    expect(result).to.equal(true);
  });
});