import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection test", function () {
  it("should revert when calling setL1BlockValues from the original depositor address if DEPOSITOR_ACCOUNT is mutated to address(0)", async function () {
    // Get signers
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (constructor takes no arguments for L1Block)
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original depositor account address
    const depositorAddress = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Impersonate the depositor account (since we can't control its private key)
    await ethers.provider.send("hardhat_impersonateAccount", [depositorAddress]);
    const depositorSigner = await ethers.getSigner(depositorAddress);

    // Fund the depositor account with some ETH for gas
    await owner.sendTransaction({
      to: depositorAddress,
      value: ethers.parseEther("1.0")
    });

    // Call setL1BlockValues from the depositor account
    const tx = instance.connect(depositorSigner).setL1BlockValues(
      1,          // _number
      12345678,   // _timestamp
      ethers.parseEther("100"), // _basefee
      ethers.keccak256(ethers.toUtf8Bytes("test")), // _hash
      1,          // _sequenceNumber
      ethers.keccak256(ethers.toUtf8Bytes("batcher")), // _batcherHash
      ethers.parseEther("0.001"), // _l1FeeOverhead
      ethers.parseEther("0.01")   // _l1FeeScalar
    );

    // In the original contract this should succeed, in the mutant it should revert
    // because DEPOSITOR_ACCOUNT is changed to address(0)
    await expect(tx).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");

    // Clean up impersonation
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [depositorAddress]);
  });
});