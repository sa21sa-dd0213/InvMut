import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant m3288be76 test", function () {
  it("should kill mutant by calling setL1BlockValues from the original depositor account and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original depositor account address
    const ORIGINAL_DEPOSITOR = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Impersonate the original depositor account
    await ethers.provider.send("hardhat_impersonateAccount", [ORIGINAL_DEPOSITOR]);
    const depositorSigner = await ethers.getSigner(ORIGINAL_DEPOSITOR);

    // Fund the depositor account with some ETH for gas
    await owner.sendTransaction({
      to: ORIGINAL_DEPOSITOR,
      value: ethers.parseEther("1.0")
    });

    // Call setL1BlockValues from the original depositor - should succeed on original but fail on mutant
    // because mutant changed DEPOSITOR_ACCOUNT to address(0)
    const tx = instance.connect(depositorSigner).setL1BlockValues(
      1,           // _number
      2,           // _timestamp
      ethers.parseEther("100"), // _basefee
      ethers.keccak256(ethers.toUtf8Bytes("test")), // _hash
      3,           // _sequenceNumber
      ethers.keccak256(ethers.toUtf8Bytes("batcher")), // _batcherHash
      ethers.parseEther("0.001"), // _l1FeeOverhead
      ethers.parseEther("0.01")   // _l1FeeScalar
    );

    // On the original contract, this should succeed. On the mutant, it should revert
    // because the onlyDepositor modifier checks msg.sender == address(0)
    await expect(tx).to.not.be.reverted;

    // Clean up - stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [ORIGINAL_DEPOSITOR]);
  });
});