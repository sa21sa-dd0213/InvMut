import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant mf7ea5f45 test", function () {
  it("should succeed when called by depositor account (original behavior) and fail when called by anyone else", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the depositor account constant from the contract
    const DEPOSITOR_ACCOUNT = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Impersonate the depositor account using hardhat_setBalance and hardhat_impersonateAccount
    await ethers.provider.send("hardhat_setBalance", [DEPOSITOR_ACCOUNT, "0x100000000000000000"]);
    await ethers.provider.send("hardhat_impersonateAccount", [DEPOSITOR_ACCOUNT]);
    const depositorSigner = await ethers.getSigner(DEPOSITOR_ACCOUNT);

    // Test 1: Call from depositor account should succeed
    await expect(
      instance.connect(depositorSigner).setL1BlockValues(
        1, 2, ethers.parseEther("1"), ethers.encodeBytes32String("hash"),
        3, ethers.encodeBytes32String("batcher"), ethers.parseEther("2"), ethers.parseEther("3")
      )
    ).to.not.be.reverted;

    // Test 2: Call from non-depositor account should revert
    await expect(
      instance.connect(addr1).setL1BlockValues(
        1, 2, ethers.parseEther("1"), ethers.encodeBytes32String("hash"),
        3, ethers.encodeBytes32String("batcher"), ethers.parseEther("2"), ethers.parseEther("3")
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");
  });
});