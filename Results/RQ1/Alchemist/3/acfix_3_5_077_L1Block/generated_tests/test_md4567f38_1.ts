import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection - md4567f38", function () {
  it("should revert when called from unauthorized address (not DEPOSITOR_ACCOUNT)", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tx = instance.connect(unauthorized).setL1BlockValues(
      1,            // _number
      100,          // _timestamp
      1000000,      // _basefee
      ethers.hexlify(ethers.randomBytes(32)), // _hash
      5,            // _sequenceNumber
      ethers.hexlify(ethers.randomBytes(32)), // _batcherHash
      200,          // _l1FeeOverhead
      300           // _l1FeeScalar
    );

    await expect(tx).to.be.revertedWith(
      "L1Block: only the depositor account can set L1 block values"
    );
  });
});