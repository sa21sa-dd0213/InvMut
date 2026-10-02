import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant detection - m85507f83", function () {
  it("should return true when approved logger calls logGotRedemptionSignature, but mutant returns false", async function () {
    const [owner, approvedLogger] = await ethers.getSigners();
    
    // Deploy DepositLog - no constructor arguments needed based on contract code
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Approve the logger
    await instance.connect(owner).setApprovedLogger(approvedLogger.address, true);
    
    // Verify approved logger status
    const isApproved = await instance.approvedToLog(approvedLogger.address);
    expect(isApproved).to.equal(true);
    
    // Call logGotRedemptionSignature from the approved logger
    const digest = ethers.keccak256(ethers.toUtf8Bytes("testDigest"));
    const r = ethers.hexlify(ethers.randomBytes(32));
    const s = ethers.hexlify(ethers.randomBytes(32));
    
    const tx = await instance.connect(approvedLogger).logGotRedemptionSignature(digest, r, s);
    const receipt = await tx.wait();
    
    // The original returns true, the mutant returns false (default)
    // We check the return value via static call
    const returnValue = await instance.connect(approvedLogger).logGotRedemptionSignature.staticCall(digest, r, s);
    expect(returnValue).to.equal(true);
  });
});