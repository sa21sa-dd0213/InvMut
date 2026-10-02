import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant kill test - m08f4014a", function () {
  it("should revert when balance equals MinSum due to > replacement in Collect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 100 wei
    await instance.SetMinSum(100);
    // Initialize the contract
    await instance.Initialized();

    // Deposit exactly 100 wei from addr1
    const depositTx = await instance.connect(addr1).Deposit({ value: 100 });
    await depositTx.wait();

    // Attempt to collect exactly 100 wei - should fail on mutant (needs > not >=)
    await expect(
      instance.connect(addr1).Collect(100)
    ).to.be.reverted;
  });
});