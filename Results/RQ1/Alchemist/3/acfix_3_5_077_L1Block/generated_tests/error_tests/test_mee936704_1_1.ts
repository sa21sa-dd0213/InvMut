import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection - DEPOSITOR_ACCOUNT changed to address(this)", function () {
  it("should revert when called from contract itself on original but succeed on mutant", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy L1Block (constructor has no arguments)
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the contract address
    const contractAddress = await instance.getAddress();

    // Prepare parameters for setL1BlockValues
    const _number = 1;
    const _timestamp = 1000;
    const _basefee = ethers.parseEther("1");
    const _hash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const _sequenceNumber = 1;
    const _batcherHash = ethers.keccak256(ethers.toUtf8Bytes("batcher"));
    const _l1FeeOverhead = 100;
    const _l1FeeScalar = 200;

    // Create a self-calling mechanism
    const SelfCallFactory = await ethers.getContractFactory("SelfCaller");
    const selfCaller = await SelfCallFactory.deploy(contractAddress);
    await selfCaller.waitForDeployment();

    // Now call selfCaller.triggerSelfCall() which will make L1Block call itself
    await expect(
      selfCaller.triggerSelfCall(
        _number,
        _timestamp,
        _basefee,
        _hash,
        _sequenceNumber,
        _batcherHash,
        _l1FeeOverhead,
        _l1FeeScalar
      )
    ).to.not.be.reverted; // This should pass on mutant but fail on original
  });
});