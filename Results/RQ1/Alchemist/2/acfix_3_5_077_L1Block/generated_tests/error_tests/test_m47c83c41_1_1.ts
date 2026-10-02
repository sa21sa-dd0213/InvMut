import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant kill test - m47c83c41", function () {
  it("should revert when depositor calls setL1BlockValues after mutant changes == to !=", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const DEPOSITOR_ACCOUNT = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Impersonate the depositor account
    await ethers.provider.send("hardhat_impersonateAccount", [DEPOSITOR_ACCOUNT]);
    const depositorSigner = await ethers.getSigner(DEPOSITOR_ACCOUNT);

    // Fund the depositor account so it can pay gas
    await owner.sendTransaction({
      to: DEPOSITOR_ACCOUNT,
      value: ethers.parseEther("1.0")
    });

    // Prepare valid parameters for setL1BlockValues
    const _number = 1;
    const _timestamp = 1234567890;
    const _basefee = ethers.parseEther("0.01");
    const _hash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const _sequenceNumber = 1;
    const _batcherHash = ethers.keccak256(ethers.toUtf8Bytes("batcher"));
    const _l1FeeOverhead = 1000;
    const _l1FeeScalar = 2000;

    // This call should succeed in the original contract (depositor is allowed)
    // but should revert in the mutant because the modifier now uses !=
    await expect(
      instance.connect(depositorSigner).setL1BlockValues(
        _number,
        _timestamp,
        _basefee,
        _hash,
        _sequenceNumber,
        _batcherHash,
        _l1FeeOverhead,
        _l1FeeScalar
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");
  });
});