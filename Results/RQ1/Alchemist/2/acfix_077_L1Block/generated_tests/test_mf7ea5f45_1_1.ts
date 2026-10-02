import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection - mf7ea5f45", function () {
  it("should revert when called from the authorized depositor account (mutant inverts access control)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (constructor takes no arguments for L1Block)
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the depositor account address from the contract constant
    const DEPOSITOR_ACCOUNT = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Impersonate the depositor account
    await ethers.provider.send("hardhat_impersonateAccount", [DEPOSITOR_ACCOUNT]);
    const depositorSigner = await ethers.getSigner(DEPOSITOR_ACCOUNT);

    // Fund the depositor account with some ETH for gas
    await owner.sendTransaction({
      to: DEPOSITOR_ACCOUNT,
      value: ethers.parseEther("1.0")
    });

    // Call setL1BlockValues from the authorized depositor account
    // In the original contract this should succeed, but the mutant will revert
    const tx = instance.connect(depositorSigner).setL1BlockValues(
      1,           // _number
      1000000,     // _timestamp
      ethers.parseEther("100"), // _basefee
      ethers.hexlify(ethers.randomBytes(32)), // _hash
      0,           // _sequenceNumber
      ethers.hexlify(ethers.randomBytes(32)), // _batcherHash
      0,           // _l1FeeOverhead
      0            // _l1FeeScalar
    );

    // The mutant will revert because it uses != instead of ==
    await expect(tx).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");

    // Clean up: stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [DEPOSITOR_ACCOUNT]);
  });
});