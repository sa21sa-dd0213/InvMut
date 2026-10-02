import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should detect mutant where balance += msg.value - 1 instead of balance += msg.value", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositAmount = 1;
    const tx = await instance.connect(owner).deposit({ value: depositAmount });
    await tx.wait();

    // Check the balance variable - should be 1 if original, 0 if mutant
    const balance = await instance.balance();
    expect(balance).to.equal(depositAmount);
  });
});