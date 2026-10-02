import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog - kill mutant m95607448 (RedemptionRequested event removal)", function () {
  let instance: any;
  let owner: any;
  let approvedLogger: any;
  let requester: any;

  beforeEach(async function () {
    [owner, approvedLogger, requester] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    instance = await Factory.deploy();
    await instance.waitForDeployment();

    await instance.connect(owner).setApprovedLogger(approvedLogger.address, true);
  });

  it("should emit RedemptionRequested event when called by approved logger", async function () {
    const digest = ethers.keccak256(ethers.toUtf8Bytes("testDigest"));
    const utxoSize = 1000;
    const redeemerOutputScript = ethers.toUtf8Bytes("testScript");
    const requestedFee = 500;
    const outpoint = ethers.toUtf8Bytes("testOutpoint");

    const tx = await instance.connect(approvedLogger).logRedemptionRequested(
      requester.address,
      digest,
      utxoSize,
      redeemerOutputScript,
      requestedFee,
      outpoint
    );

    await expect(tx)
      .to.emit(instance, "RedemptionRequested")
      .withArgs(
        approvedLogger.address,
        requester.address,
        digest,
        utxoSize,
        redeemerOutputScript,
        requestedFee,
        outpoint
      );
  });
});