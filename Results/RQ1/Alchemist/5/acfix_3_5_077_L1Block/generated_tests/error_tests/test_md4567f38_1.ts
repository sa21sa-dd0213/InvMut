import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant test - onlyDepositor modifier removal", function () {
  it("should revert when called from unauthorized address in original, but succeed in mutant", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call setL1BlockValues from an unauthorized address
    const tx = instance.connect(unauthorized).setL1BlockValues(
      1,           // _number
      1234567890,  // _timestamp
      ethers.parseEther("100"), // _basefee
      ethers.hexlify(ethers.randomBytes(32)), // _hash
      0,           // _sequenceNumber
      ethers.hexlify(ethers.randomBytes(32)), // _batcherHash
      1000,        // _l1FeeOverhead
      2000         // _l1FeeScalar
    );

    // In the original contract, this should revert due to the onlyDepositor modifier.
    // In the mutant, the modifier is removed, so it will succeed instead of reverting.
    await expect(tx).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");
  });
});