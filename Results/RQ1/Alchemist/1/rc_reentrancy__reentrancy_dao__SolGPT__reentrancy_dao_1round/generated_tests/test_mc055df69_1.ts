import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO - kill mutant mc055df69", function () {
  it("should kill the mutant by depositing 1 wei and verifying withdrawal fails", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositTx = await instance.connect(owner).deposit({ value: 1 });
    await depositTx.wait();

    // Try to withdraw all - on mutant, credit is 0, so withdrawal should do nothing
    const initialBalance = await ethers.provider.getBalance(owner.address);
    const withdrawTx = await instance.connect(owner).withdrawAll();
    await withdrawTx.wait();
    const finalBalance = await ethers.provider.getBalance(owner.address);

    // On original, 1 wei would be withdrawn (minus gas), but on mutant the 1 wei is stuck
    // Since gas costs are variable, check that the contract still holds the 1 wei
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(1);
  });
});