import { expect } from "chai";
import { ethers } } from "hardhat";

describe("L1Block mutant test - m47c83c41", function () {
  it("should revert when called from depositor account if mutant is present", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const DEPOSITOR_ACCOUNT = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Impersonate the depositor account
    await ethers.provider.send("hardhat_impersonateAccount", [DEPOSITOR_ACCOUNT]);
    const depositorSigner = await ethers.getSigner(DEPOSITOR_ACCOUNT);

    // Fund the depositor account so it can pay gas
    await owner.sendTransaction({
      to: DEPOSITOR_ACCOUNT,
      value: ethers.parseEther("1.0")
    });

    // Call setL1BlockValues from the depositor account
    // This should revert in the mutant because of the inverted require condition
    await expect(
      instance.connect(depositorSigner).setL1BlockValues(
        1,           // _number
        12345678,    // _timestamp
        ethers.parseEther("100"), // _basefee
        ethers.hexlify(ethers.randomBytes(32)), // _hash
        0,           // _sequenceNumber
        ethers.hexlify(ethers.randomBytes(32)), // _batcherHash
        ethers.parseEther("1"),  // _l1FeeOverhead
        ethers.parseEther("0.1") // _l1FeeScalar
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");

    // Stop impersonation
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [DEPOSITOR_ACCOUNT]);
  });
});