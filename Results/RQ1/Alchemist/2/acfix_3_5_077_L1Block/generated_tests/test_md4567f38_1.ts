import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant kill test", function () {
  it("should revert when called from unauthorized address on original, but not on mutant", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositorAddress = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";
    const testValues = {
      _number: 1,
      _timestamp: 2,
      _basefee: ethers.parseEther("1"),
      _hash: ethers.hexlify(ethers.randomBytes(32)),
      _sequenceNumber: 3,
      _batcherHash: ethers.hexlify(ethers.randomBytes(32)),
      _l1FeeOverhead: ethers.parseEther("0.1"),
      _l1FeeScalar: ethers.parseEther("0.2")
    };

    // Attempt to call setL1BlockValues from an unauthorized address
    await expect(
      instance.connect(unauthorized).setL1BlockValues(
        testValues._number,
        testValues._timestamp,
        testValues._basefee,
        testValues._hash,
        testValues._sequenceNumber,
        testValues._batcherHash,
        testValues._l1FeeOverhead,
        testValues._l1FeeScalar
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");
  });
});