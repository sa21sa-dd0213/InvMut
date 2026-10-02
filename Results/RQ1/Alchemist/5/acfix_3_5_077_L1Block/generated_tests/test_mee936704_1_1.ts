import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant kill test - mee936704", function () {
  it("should revert when calling setL1BlockValues from the hardcoded depositor address (mutant changed DEPOSITOR_ACCOUNT to address(this))", async function () {
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the hardcoded depositor address from the original contract
    const DEPOSITOR_ACCOUNT = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Impersonate the depositor account to send a transaction as that address
    await ethers.provider.send("hardhat_impersonateAccount", [DEPOSITOR_ACCOUNT]);
    const depositorSigner = await ethers.getSigner(DEPOSITOR_ACCOUNT);

    // Prepare test values for setL1BlockValues
    const testNumber = 1;
    const testTimestamp = 1000;
    const testBasefee = ethers.parseEther("0.01");
    const testHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const testSequenceNumber = 0;
    const testBatcherHash = ethers.keccak256(ethers.toUtf8Bytes("batcher"));
    const testL1FeeOverhead = 100;
    const testL1FeeScalar = 200;

    // Attempt to call setL1BlockValues from the depositor address
    // In the original contract this would succeed, but in the mutant it should revert
    // because DEPOSITOR_ACCOUNT is now address(this), not the hardcoded address
    await expect(
      instance.connect(depositorSigner).setL1BlockValues(
        testNumber,
        testTimestamp,
        testBasefee,
        testHash,
        testSequenceNumber,
        testBatcherHash,
        testL1FeeOverhead,
        testL1FeeScalar
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");

    // Clean up: stop impersonating the account
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [DEPOSITOR_ACCOUNT]);
  });
});