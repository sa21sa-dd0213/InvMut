import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant kill test - m3288be76", function () {
  it("should revert when called from original depositor address since mutant changed DEPOSITOR_ACCOUNT to address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy L1Block (constructor takes no arguments for Semver(1,0,0) inside constructor)
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original depositor address from the contract
    const originalDepositorAddress = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Impersonate the original depositor account
    await ethers.provider.send("hardhat_impersonateAccount", [originalDepositorAddress]);
    const depositorSigner = await ethers.getSigner(originalDepositorAddress);

    // Fund the depositor account so it can pay gas
    await owner.sendTransaction({
      to: originalDepositorAddress,
      value: ethers.parseEther("1.0")
    });

    // Prepare test values for setL1BlockValues
    const testNumber = 12345;
    const testTimestamp = 1000000;
    const testBasefee = ethers.parseEther("1.5");
    const testHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const testSequenceNumber = 1;
    const testBatcherHash = ethers.keccak256(ethers.toUtf8Bytes("batcher"));
    const testL1FeeOverhead = 1000;
    const testL1FeeScalar = 2000;

    // Attempt to call setL1BlockValues from the original depositor address
    // This should succeed on the original contract but revert on the mutant
    // because the mutant changed DEPOSITOR_ACCOUNT to address(0)
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
  });
});