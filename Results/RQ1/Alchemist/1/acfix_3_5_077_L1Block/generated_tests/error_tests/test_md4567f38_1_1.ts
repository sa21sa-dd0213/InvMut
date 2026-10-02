import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant test - onlyDepositor modifier removed", function () {
  it("should revert when called from unauthorized address on original but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Use an unauthorized address (not the DEPOSITOR_ACCOUNT)
    const unauthorized = addr1;

    // Parameters for setL1BlockValues (arbitrary but valid)
    const _number = 1;
    const _timestamp = 100;
    const _basefee = ethers.parseEther("1");
    const _hash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const _sequenceNumber = 5;
    const _batcherHash = ethers.keccak256(ethers.toUtf8Bytes("batch"));
    const _l1FeeOverhead = 1000;
    const _l1FeeScalar = 2000;

    // Attempt to call from unauthorized address - should revert on original
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