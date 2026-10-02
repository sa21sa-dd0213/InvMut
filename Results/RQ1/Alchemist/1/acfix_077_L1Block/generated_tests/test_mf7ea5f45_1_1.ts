import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant mf7ea5f45 test", function () {
  it("should revert when called from depositor account due to mutated != check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositorAccount = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Impersonate the depositor account
    await ethers.provider.send("hardhat_impersonateAccount", [depositorAccount]);
    const depositorSigner = await ethers.getSigner(depositorAccount);

    // Fund the depositor account with some ETH for gas
    await owner.sendTransaction({
      to: depositorAccount,
      value: ethers.parseEther("1.0")
    });

    // This call should succeed in the original contract but fail in the mutant
    await expect(
      instance.connect(depositorSigner).setL1BlockValues(
        1,          // _number
        100,        // _timestamp
        ethers.parseEther("0.001"), // _basefee
        ethers.keccak256(ethers.toUtf8Bytes("test")), // _hash
        5,          // _sequenceNumber
        ethers.keccak256(ethers.toUtf8Bytes("batcher")), // _batcherHash
        ethers.parseEther("0.0001"), // _l1FeeOverhead
        ethers.parseEther("0.0001")  // _l1FeeScalar
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");
  });
});