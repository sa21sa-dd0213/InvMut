import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant mf7ea5f45", function () {
  it("should allow depositor account to call setL1BlockValues", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the depositor account constant from the contract
    const DEPOSITOR_ACCOUNT = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Impersonate the depositor account
    await ethers.provider.send("hardhat_impersonateAccount", [DEPOSITOR_ACCOUNT]);
    const depositorSigner = await ethers.getSigner(DEPOSITOR_ACCOUNT);

    // Fund the depositor account so it can pay gas
    await owner.sendTransaction({
      to: DEPOSITOR_ACCOUNT,
      value: ethers.parseEther("1.0")
    });

    // Call setL1BlockValues from the depositor account - should succeed in original, fail in mutant
    const tx = await instance.connect(depositorSigner).setL1BlockValues(
      1,           // _number
      1234567890,  // _timestamp
      1000000000,  // _basefee
      ethers.hexlify(ethers.randomBytes(32)), // _hash
      0,           // _sequenceNumber
      ethers.hexlify(ethers.randomBytes(32)), // _batcherHash
      0,           // _l1FeeOverhead
      0            // _l1FeeScalar
    );
    await tx.wait();

    // Verify the values were set correctly (original behavior)
    expect(await instance.number()).to.equal(1);
    expect(await instance.timestamp()).to.equal(1234567890);

    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [DEPOSITOR_ACCOUNT]);
  });
});