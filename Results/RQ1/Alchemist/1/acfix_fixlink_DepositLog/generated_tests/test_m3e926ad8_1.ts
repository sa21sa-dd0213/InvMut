import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant detection - m3e926ad8", function () {
  it("should return true for approved logger calling logRedemptionRequested", async function () {
    const [owner, approvedLogger] = await ethers.getSigners();
    
    // Deploy DepositLog (no constructor arguments)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve the logger
    await instance.connect(owner).setApprovedLogger(approvedLogger.address, true);

    // Call logRedemptionRequested from the approved logger
    const tx = await instance.connect(approvedLogger).logRedemptionRequested(
      ethers.ZeroAddress,   // _requester
      ethers.ZeroHash,      // _digest
      0,                    // _utxoSize
      "0x",                 // _redeemerOutputScript
      0,                    // _requestedFee
      "0x"                  // _outpoint
    );

    // Assert that the transaction succeeds and returns true
    const receipt = await tx.wait();
    expect(receipt).to.not.be.undefined;
    
    // The mutant returns false, so we expect the call to revert or return false
    // We can check the return value by calling the function statically
    const result = await instance.connect(approvedLogger).logRedemptionRequested.staticCall(
      ethers.ZeroAddress,
      ethers.ZeroHash,
      0,
      "0x",
      0,
      "0x"
    );
    expect(result).to.equal(true);
  });
});