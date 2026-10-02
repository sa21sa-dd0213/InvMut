import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant kill test - m1bb503c1", function () {
  it("should allow deposit of exactly 1 wei (mutant assertion fails on 1 wei)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei - should succeed on original, fail on mutant
    const tx = await instance.connect(owner).deposit({ value: 1 });
    await tx.wait();

    // Verify balance is updated correctly
    expect(await instance.connect(owner).balances(owner.address)).to.equal(1);
  });
});