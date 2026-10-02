import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection", function () {
  it("should kill mutant m3288be76 by calling setL1BlockValues from the original DEPOSITOR_ACCOUNT address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original DEPOSITOR_ACCOUNT constant address
    const DEPOSITOR_ACCOUNT = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Impersonate the depositor account (needs to be funded or use hardhat_setBalance)
    await ethers.provider.send("hardhat_setBalance", [
      DEPOSITOR_ACCOUNT,
      "0x1000000000000000000",
    ]);
    const depositorSigner = await ethers.getImpersonatedSigner(DEPOSITOR_ACCOUNT);

    // Prepare parameters for setL1BlockValues
    const number = 1;
    const timestamp = 2;
    const basefee = ethers.parseEther("0.1");
    const hash = ethers.hexlify(ethers.randomBytes(32));
    const sequenceNumber = 3;
    const batcherHash = ethers.hexlify(ethers.randomBytes(32));
    const l1FeeOverhead = 1000;
    const l1FeeScalar = 2000;

    // This call should succeed on original (depositor address matches constant)
    // On the mutant, DEPOSITOR_ACCOUNT is address(0), so this test would still succeed
    // but the mutant is killed because the constant value is wrong for external expectations
    await expect(
      instance.connect(depositorSigner).setL1BlockValues(
        number,
        timestamp,
        basefee,
        hash,
        sequenceNumber,
        batcherHash,
        l1FeeOverhead,
        l1FeeScalar
      )
    ).to.not.be.reverted;

    // Additional assertion: verify that the constant was changed to address(0) in mutant
    // This directly checks the mutant's change
    const constantValue = await instance.DEPOSITOR_ACCOUNT();
    expect(constantValue).to.equal(DEPOSITOR_ACCOUNT);
  });
});