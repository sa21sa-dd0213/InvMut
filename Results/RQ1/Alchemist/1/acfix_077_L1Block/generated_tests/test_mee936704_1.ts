import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant kill test", function () {
  it("should kill mutant mee936704 by calling setL1BlockValues from the fixed depositor address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The fixed depositor address from the original contract
    const DEPOSITOR_ACCOUNT = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Impersonate the fixed depositor address
    await ethers.provider.send("hardhat_impersonateAccount", [DEPOSITOR_ACCOUNT]);
    const depositorSigner = await ethers.getSigner(DEPOSITOR_ACCOUNT);

    // Fund the depositor account to pay for gas
    await owner.sendTransaction({
      to: DEPOSITOR_ACCOUNT,
      value: ethers.parseEther("1.0")
    });

    // This should succeed on the original but revert on the mutant
    // because the mutant sets DEPOSITOR_ACCOUNT = address(this)
    await expect(
      instance.connect(depositorSigner).setL1BlockValues(
        1,           // _number
        100,         // _timestamp
        ethers.parseEther("1"),  // _basefee
        ethers.hexlify(ethers.randomBytes(32)), // _hash
        1,           // _sequenceNumber
        ethers.hexlify(ethers.randomBytes(32)), // _batcherHash
        ethers.parseEther("0.1"), // _l1FeeOverhead
        ethers.parseEther("0.01") // _l1FeeScalar
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");

    // Clean up impersonation
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [DEPOSITOR_ACCOUNT]);
  });
});