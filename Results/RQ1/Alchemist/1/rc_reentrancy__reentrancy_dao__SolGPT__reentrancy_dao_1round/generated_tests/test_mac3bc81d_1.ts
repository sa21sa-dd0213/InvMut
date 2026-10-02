import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should kill mutant mac3bc81d by detecting that withdrawAll does not execute when credit > 0", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 ether
    const depositAmount = ethers.parseEther("1");
    await instance.connect(owner).deposit({ value: depositAmount });

    // Get initial balance of owner
    const initialBalance = await ethers.provider.getBalance(owner.address);

    // Call withdrawAll
    const tx = await instance.connect(owner).withdrawAll();
    const receipt = await tx.wait();

    // Check that the owner's credit is now 0 (should fail on mutant)
    const creditAfter = await instance.credit(owner.address);
    expect(creditAfter).to.equal(0);

    // Check that the owner actually received the ether
    const finalBalance = await ethers.provider.getBalance(owner.address);
    // Account for gas costs - final balance should be greater than initial minus gas
    expect(finalBalance).to.be.gt(initialBalance - depositAmount);
  });
});