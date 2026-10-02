import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection - m3288be76", function () {
  it("should revert when calling setL1BlockValues from the original depositor account because mutant changed DEPOSITOR_ACCOUNT to address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original depositor account address from the contract
    const depositorAccount = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Impersonate the depositor account to send a transaction as that address
    await ethers.provider.send("hardhat_impersonateAccount", [depositorAccount]);
    const depositorSigner = await ethers.getSigner(depositorAccount);

    // Fund the depositor account so it can pay gas
    await owner.sendTransaction({
      to: depositorAccount,
      value: ethers.parseEther("1.0")
    });

    // Attempt to call setL1BlockValues from the original depositor address
    // In the mutant, this should revert because msg.sender (depositorAccount) != address(0)
    await expect(
      instance.connect(depositorSigner).setL1BlockValues(
        1,          // _number
        1000,       // _timestamp
        1000000,    // _basefee
        ethers.hexlify(ethers.randomBytes(32)), // _hash
        5,          // _sequenceNumber
        ethers.hexlify(ethers.randomBytes(32)), // _batcherHash
        200,        // _l1FeeOverhead
        300         // _l1FeeScalar
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");

    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [depositorAccount]);
  });
});