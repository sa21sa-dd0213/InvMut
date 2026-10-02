import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant test - md1143db5", function () {
  it("should revert when setL1BlockValues is called by unauthorized address", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const _number = 1;
    const _timestamp = 2;
    const _basefee = ethers.parseEther("0.01");
    const _hash = ethers.hexlify(ethers.randomBytes(32));
    const _sequenceNumber = 3;
    const _batcherHash = ethers.hexlify(ethers.randomBytes(32));
    const _l1FeeOverhead = 1000;
    const _l1FeeScalar = 2000;

    // Attempt to call from unauthorized address - should revert in original, but succeed in mutant
    await expect(
      instance.connect(unauthorized).setL1BlockValues(
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