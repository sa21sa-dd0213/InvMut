import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant test - onlyDepositor modifier removal", function () {
  it("should revert when called from unauthorized address on original contract, but succeed on mutant", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy L1Block (constructor takes no arguments in the actual contract)
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test parameters
    const _number = 1;
    const _timestamp = 1000;
    const _basefee = ethers.parseEther("0.1");
    const _hash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const _sequenceNumber = 5;
    const _batcherHash = ethers.keccak256(ethers.toUtf8Bytes("batch"));
    const _l1FeeOverhead = 100;
    const _l1FeeScalar = 200;

    // Try calling from unauthorized address - should revert on original, pass on mutant
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