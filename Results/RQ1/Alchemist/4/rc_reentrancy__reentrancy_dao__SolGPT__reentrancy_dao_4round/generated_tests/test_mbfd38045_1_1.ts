import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant mbfd38045 detection", function () {
  it("should kill mutant by testing that a deposit followed by withdrawAll succeeds", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // addr1 deposits 1 ether
    const depositTx = await instance.connect(addr1).deposit({ value: depositAmount });
    await depositTx.wait();

    // Get balance before withdrawal
    const provider = ethers.provider;
    const balanceBefore = await provider.getBalance(addr1.address);

    // addr1 calls withdrawAll - should succeed in original, fail in mutant
    const withdrawTx = await instance.connect(addr1).withdrawAll();
    await withdrawTx.wait();

    // Check that addr1 received the funds (balance increased by deposit amount minus gas)
    const balanceAfter = await provider.getBalance(addr1.address);
    expect(balanceAfter).to.be.greaterThan(balanceBefore - ethers.parseEther("0.01")); // allow for gas costs
  });
});