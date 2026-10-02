import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant m09b3d467 - logRedemptionRequested return value", function () {
  it("should return true when called by an approved logger", async function () {
    const [owner, logger] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Approve the logger
    await instance.connect(owner).setApprovedLogger(logger.address, true);
    
    // Prepare test parameters
    const requester = ethers.ZeroAddress;
    const digest = ethers.ZeroHash;
    const utxoSize = 1000;
    const redeemerOutputScript = "0x00";
    const requestedFee = 500;
    const outpoint = "0x00";
    
    // Call logRedemptionRequested from the approved logger
    const tx = await instance.connect(logger).logRedemptionRequested(
      requester,
      digest,
      utxoSize,
      redeemerOutputScript,
      requestedFee,
      outpoint
    );
    
    // Wait for transaction to be mined
    await tx.wait();
    
    // Verify the RedemptionRequested event was emitted
    await expect(tx)
      .to.emit(instance, "RedemptionRequested")
      .withArgs(logger.address, requester, digest, utxoSize, redeemerOutputScript, requestedFee, outpoint);
    
    // Get the return value from the transaction using static call
    const returnData = await ethers.provider.call({
      to: await instance.getAddress(),
      from: logger.address,
      data: instance.interface.encodeFunctionData("logRedemptionRequested", [
        requester,
        digest,
        utxoSize,
        redeemerOutputScript,
        requestedFee,
        outpoint
      ])
    });
    
    const decodedReturn = ethers.AbiCoder.defaultAbiCoder().decode(["bool"], returnData);
    
    // The original returns true, the mutant returns false
    expect(decodedReturn[0]).to.equal(true);
  });
});