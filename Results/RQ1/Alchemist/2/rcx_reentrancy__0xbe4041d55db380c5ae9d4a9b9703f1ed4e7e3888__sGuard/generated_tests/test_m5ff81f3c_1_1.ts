import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m5ff81f3c test", function () {
  it("should revert when balance equals MinSum (mutant uses > instead of >=)", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 1 ether
    await instance.SetMinSum(ethers.parseEther("1"));
    // Initialize the contract
    await instance.Initialized();

    // User deposits exactly 1 ether (balance == MinSum)
    await instance.connect(user).Put(0, { value: ethers.parseEther("1") });

    // Advance time past unlockTime (which was set to block.timestamp + 0)
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    // Try to collect exactly 1 ether - should succeed on original, fail on mutant
    await expect(
      instance.connect(user).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});