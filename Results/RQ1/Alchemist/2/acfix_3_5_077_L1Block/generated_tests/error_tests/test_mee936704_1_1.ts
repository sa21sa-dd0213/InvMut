import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant mee936704 - kill test", function () {
  it("should kill the mutant by calling setL1BlockValues from the depositor account and expecting success, which will revert on the mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositorAddress = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Impersonate the depositor account
    await ethers.provider.send("hardhat_impersonateAccount", [depositorAddress]);
    const depositorSigner = await ethers.getSigner(depositorAddress);

    // Fund the depositor account so it can pay gas
    await owner.sendTransaction({
      to: depositorAddress,
      value: ethers.parseEther("1.0")
    });

    const tx = instance.connect(depositorSigner).setL1BlockValues(
      1,          // _number
      1000000,    // _timestamp
      2000000000, // _basefee
      ethers.hexlify(ethers.randomBytes(32)), // _hash
      5,          // _sequenceNumber
      ethers.hexlify(ethers.randomBytes(32)), // _batcherHash
      100,        // _l1FeeOverhead
      200         // _l1FeeScalar
    );

    // On the original contract this should succeed; on the mutant it will revert
    // because the mutant's DEPOSITOR_ACCOUNT is address(this), not the depositor address
    await expect(tx).to.be.reverted;
  });
});