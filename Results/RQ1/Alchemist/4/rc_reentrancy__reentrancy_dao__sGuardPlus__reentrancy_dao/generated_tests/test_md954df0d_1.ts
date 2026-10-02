import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - md954df0d", function () {
  it("should detect the mutant by verifying that a deposit followed by withdrawAll actually transfers funds", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // User deposits 1 ETH
    await instance.connect(user).deposit({ value: depositAmount });

    const balanceBefore = await ethers.provider.getBalance(user.address);

    // User calls withdrawAll
    const tx = await instance.connect(user).withdrawAll();
    await tx.wait();

    const balanceAfter = await ethers.provider.getBalance(user.address);

    // The original contract would transfer the deposit back, so balanceAfter > balanceBefore (minus gas)
    // The mutant (oCredit < 0) will never satisfy the condition, so no transfer occurs
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});