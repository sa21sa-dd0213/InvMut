import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant ma70b3a93 test", function () {
  it("should return false when unauthorized caller calls logRedemptionRequested", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for DepositLog)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call logRedemptionRequested from an unauthorized address
    const result = await instance.connect(unauthorized).logRedemptionRequested(
      ethers.ZeroAddress,   // _requester
      ethers.ZeroHash,      // _digest
      0,                    // _utxoSize
      "0x00",               // _redeemerOutputScript
      0,                    // _requestedFee
      "0x00"                // _outpoint
    );

    // In the original contract, unauthorized callers get false; mutant returns true
    expect(result).to.equal(false);
  });
});