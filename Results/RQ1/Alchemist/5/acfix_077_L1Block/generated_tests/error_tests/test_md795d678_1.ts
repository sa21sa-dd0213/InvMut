import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant md795d678 - access control test", function () {
  it("should revert when non-depositor calls setL1BlockValues, but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed - Semver constructor is called internally)
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the depositor account address from the contract
    const depositorAccount = await instance.depositorAccount();
    
    // Use a non-depositor account to call setL1BlockValues
    const nonDepositor = addr1;
    
    // Prepare test values
    const _number = 1;
    const _timestamp = 1000;
    const _basefee = ethers.parseEther("1");
    const _hash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const _sequenceNumber = 1;
    const _batcherHash = ethers.keccak256(ethers.toUtf8Bytes("batcher"));
    const _l1FeeOverhead = 100;
    const _l1FeeScalar = 200;

    // The original contract should revert when called from non-depositor
    // The mutant removes the require statement, so this call would succeed instead of reverting
    await expect(
      instance.connect(nonDepositor).setL1BlockValues(
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