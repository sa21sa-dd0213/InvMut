import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog - kill mutant m30c13c1f", function () {
  it("should emit Created event when called by an approved logger", async function () {
    const [owner, approvedLogger] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for DepositLog)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First, approve the logger (only owner can do this)
    await instance.connect(owner).setApprovedLogger(approvedLogger.address, true);
    
    // Now call logCreated from the approved logger - should emit Created event
    const keepAddress = ethers.Wallet.createRandom().address;
    const tx = await instance.connect(approvedLogger).logCreated(keepAddress);
    const receipt = await tx.wait();
    
    // Check that the Created event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "Created")
      .withArgs(approvedLogger.address, keepAddress, receipt.block.timestamp);
  });
});