import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection", function () {
  it("should revert when unauthorized address calls setL1BlockValues (detects removed require)", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy L1Block - no constructor arguments needed since it's Semver(1,0,0)
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Attempt to call setL1BlockValues from an unauthorized address
    await expect(
      instance.connect(unauthorized).setL1BlockValues(
        1,          // _number
        100,        // _timestamp
        ethers.parseEther("1"), // _basefee
        ethers.hexlify(ethers.randomBytes(32)), // _hash
        1,          // _sequenceNumber
        ethers.hexlify(ethers.randomBytes(32)), // _batcherHash
        100,        // _l1FeeOverhead
        200         // _l1FeeScalar
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");
  });
});