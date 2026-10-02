import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant m6f3402b9 test", function () {
  it("should detect the mutant by depositing 1 wei and checking balance equals 1 wei", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial deposit of exactly 1 wei
    const tx = await owner.sendTransaction({
      to: instance.target,
      value: 1n // 1 wei
    });
    await tx.wait();

    // Check balance - original would be 1, mutant would be 0
    const balance = await instance.balances(owner.address);
    expect(balance).to.equal(1n);
  });
});