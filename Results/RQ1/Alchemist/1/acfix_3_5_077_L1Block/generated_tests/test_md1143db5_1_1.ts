import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant kill test - md1143db5", function () {
  it("should revert when setL1BlockValues is called from unauthorized address (mutant removes require check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy L1Block (constructor takes no arguments for Semver)
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setL1BlockValues from an unauthorized address (addr1)
    // Original contract reverts because msg.sender != DEPOSITOR_ACCOUNT
    // Mutant removes the require, so it would not revert
    await expect(
      instance.connect(addr1).setL1BlockValues(
        1,          // _number
        100,        // _timestamp
        ethers.parseEther("1"), // _basefee
        ethers.keccak256(ethers.toUtf8Bytes("test")), // _hash
        1,          // _sequenceNumber
        ethers.keccak256(ethers.toUtf8Bytes("batcher")), // _batcherHash
        1000,       // _l1FeeOverhead
        2000        // _l1FeeScalar
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");
  });
});