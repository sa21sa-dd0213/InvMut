import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant kill test - md795d678", function () {
  it("should revert when called from unauthorized address (non-depositor)", async function () {
    const [owner, unauthorizedUser] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify the depositorAccount is not the unauthorized user
    const depositorAccount = await instance.depositorAccount();
    expect(depositorAccount).to.not.equal(unauthorizedUser.address);

    // Attempt to call setL1BlockValues from an unauthorized address
    // The original contract should revert; the mutant (without require) would not
    await expect(
      instance.connect(unauthorizedUser).setL1BlockValues(
        1,          // _number
        1000000,    // _timestamp
        1000000,    // _basefee
        ethers.hexlify(ethers.randomBytes(32)), // _hash
        1,          // _sequenceNumber
        ethers.hexlify(ethers.randomBytes(32)), // _batcherHash
        100,        // _l1FeeOverhead
        200         // _l1FeeScalar
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");
  });
});