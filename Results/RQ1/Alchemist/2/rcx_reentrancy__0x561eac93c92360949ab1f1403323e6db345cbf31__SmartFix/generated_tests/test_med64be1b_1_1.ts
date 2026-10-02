import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant med64be1b test", function () {
  it("should revert when user with balance equal to MinSum tries to collect (mutant uses > instead of >=)", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 1 ether
    await instance.SetMinSum(ethers.parseEther("1"));

    // Initialize the contract
    await instance.Initialized();

    // User deposits exactly 1 ether (equal to MinSum)
    await instance.connect(user).Deposit({ value: ethers.parseEther("1") });

    // User tries to collect 0.5 ether - should succeed on original (>=) but fail on mutant (>)
    await expect(
      instance.connect(user).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});