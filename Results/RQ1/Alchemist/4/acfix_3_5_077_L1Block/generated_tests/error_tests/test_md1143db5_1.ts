import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection - onlyDepositor modifier", function () {
  it("should revert when non-depositor calls setL1BlockValues on original contract, but not on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy(); // no constructor arguments needed (constructor takes none)
    await instance.waitForDeployment();

    const depositorAccount = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Attempt to call setL1BlockValues from addr1 (not the depositor)
    await expect(
      instance.connect(addr1).setL1BlockValues(
        1,           // _number
        1234567890,  // _timestamp
        ethers.parseEther("1"), // _basefee
        ethers.hexlify(ethers.randomBytes(32)), // _hash
        0,           // _sequenceNumber
        ethers.hexlify(ethers.randomBytes(32)), // _batcherHash
        0,           // _l1FeeOverhead
        0            // _l1FeeScalar
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");
  });
});