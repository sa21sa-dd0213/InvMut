import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant kill test - md1143db5", function () {
  it("should revert when setL1BlockValues is called by non-depositor (mutant removes require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The depositor account is a constant: 0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001
    const depositorAddress = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";
    
    // Attempt to call setL1BlockValues from an unauthorized address (addr1)
    // The original contract reverts, but the mutant (with require removed) would not
    await expect(
      instance.connect(addr1).setL1BlockValues(
        1,        // _number
        100,      // _timestamp
        ethers.parseEther("1"), // _basefee
        ethers.hexlify(ethers.randomBytes(32)), // _hash
        0,        // _sequenceNumber
        ethers.hexlify(ethers.randomBytes(32)), // _batcherHash
        0,        // _l1FeeOverhead
        0         // _l1FeeScalar
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");
  });
});