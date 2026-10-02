import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant m093f51a4 test", function () {
  it("should revert when Collect is called with sufficient balance due to false condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.Initialized();

    // Set MinSum to 1 ether
    await instance.SetMinSum(ethers.parseEther("1"));

    // Deposit 2 ether into addr1's balance
    await instance.connect(addr1).deposit({ value: ethers.parseEther("2") });

    // Attempt to collect 1 ether - should revert in mutant because condition is always false
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});