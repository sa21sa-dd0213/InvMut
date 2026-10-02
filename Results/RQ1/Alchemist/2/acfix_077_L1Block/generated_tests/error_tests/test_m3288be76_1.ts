import { expect } from "chai";
import { ethers } } from "hardhat";

describe("L1Block mutant test - DEPOSITOR_ACCOUNT changed to address(0)", function () {
  it("should revert when called from the original depositor address (0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001) after mutant changes constant to address(0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original depositor address
    const originalDepositor = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Impersonate the original depositor address
    await ethers.provider.send("hardhat_impersonateAccount", [originalDepositor]);
    const depositorSigner = await ethers.getSigner(originalDepositor);

    // Fund the depositor account to pay gas
    await owner.sendTransaction({
      to: originalDepositor,
      value: ethers.parseEther("1.0")
    });

    // Test parameters
    const number = 1;
    const timestamp = 2;
    const basefee = 3;
    const hash = ethers.hexlify(ethers.randomBytes(32));
    const sequenceNumber = 4;
    const batcherHash = ethers.hexlify(ethers.randomBytes(32));
    const l1FeeOverhead = 5;
    const l1FeeScalar = 6;

    // In the original contract, this call should succeed (msg.sender == DEPOSITOR_ACCOUNT)
    // In the mutant, DEPOSITOR_ACCOUNT is address(0), so this call should revert
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
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");
  });
});