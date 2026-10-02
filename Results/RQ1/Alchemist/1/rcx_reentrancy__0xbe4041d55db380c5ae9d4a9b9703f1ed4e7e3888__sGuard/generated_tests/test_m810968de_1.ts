import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant detection", function () {
  it("should detect mutant that subtracts 1 from msg.value in Put", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 so balance >= MinSum is always true
    await instance.SetMinSum(0);
    // Initialize the contract
    await instance.Initialized();

    const depositAmount = ethers.parseEther("1.0");
    const lockTime = 0; // No lock time

    // Call Put with 1 ether
    const tx = await instance.connect(addr1).Put(lockTime, { value: depositAmount });
    await tx.wait();

    // Try to collect the full deposited amount
    // On original: should succeed (balance = 1 ether >= 1 ether)
    // On mutant: should revert (balance = 1 ether - 1 wei < 1 ether)
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});