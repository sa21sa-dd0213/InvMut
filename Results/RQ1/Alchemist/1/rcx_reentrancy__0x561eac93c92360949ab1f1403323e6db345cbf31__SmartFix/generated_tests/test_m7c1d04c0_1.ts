import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant m7c1d04c0 test", function () {
  it("should revert Deposit when sending positive amount due to mutated <= condition", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, set MinSum and initialize the contract so that other functions work
    await instance.SetMinSum(1);
    await instance.Initialized();

    // The mutant changes require to (balances[msg.sender] + msg.value) <= balances[msg.sender]
    // This is only true when msg.value is 0. Sending any positive amount should revert.
    const depositAmount = ethers.parseEther("1");
    await expect(
      instance.connect(owner).Deposit({ value: depositAmount })
    ).to.be.reverted;
  });
});