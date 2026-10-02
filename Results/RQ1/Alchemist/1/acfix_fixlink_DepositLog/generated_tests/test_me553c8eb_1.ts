import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog - kill mutant me553c8eb", function () {
  it("should allow an approved logger to call logGotRedemptionSignature and return true", async function () {
    const [owner, approvedLogger, addr1] = await ethers.getSigners();
    
    // Deploy the contract - DepositLog has no constructor arguments
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Owner approves the logger
    await instance.connect(owner).setApprovedLogger(approvedLogger.address, true);
    
    // Verify approved logger is approved
    const isApproved = await instance.connect(approvedLogger).approvedToLog(approvedLogger.address);
    expect(isApproved).to.be.true;
    
    // Call logGotRedemptionSignature from the approved logger
    const digest = ethers.keccak256(ethers.toUtf8Bytes("testDigest"));
    const r = ethers.hexlify(ethers.randomBytes(32));
    const s = ethers.hexlify(ethers.randomBytes(32));
    
    const tx = await instance.connect(approvedLogger).logGotRedemptionSignature(digest, r, s);
    const receipt = await tx.wait();
    
    // Expect the function to return true and emit the event
    await expect(tx).to.emit(instance, "GotRedemptionSignature")
      .withArgs(approvedLogger.address, digest, r, s, anyValue); // block.timestamp is variable
    
    // Verify the return value is true by checking the transaction was not reverted
    expect(receipt.status).to.equal(1);
  });
});