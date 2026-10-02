import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should revert when user with zero credit calls withdrawAll (kills mutant that replaces oCredit > 0 with true)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner deposits 1 ETH
    const depositAmount = ethers.parseEther("1");
    await instance.connect(owner).deposit({ value: depositAmount });

    // addr1 has zero credit but calls withdrawAll
    // Original: does nothing (credit[addr1] == 0)
    // Mutant: enters if(true), subtracts 0 from balance, sets credit[addr1] = 0 (no-op),
    // then sends 1 ETH to addr1! This will drain owner's deposit.

    // Get balance before
    const balanceBefore = await ethers.provider.getBalance(instance.target);

    // addr1 calls withdrawAll
    await instance.connect(addr1).withdrawAll();

    // Get balance after
    const balanceAfter = await ethers.provider.getBalance(instance.target);

    // In the original, balanceAfter should equal balanceBefore (no withdrawal for zero credit)
    // In the mutant, balanceAfter should be less (stolen funds)
    expect(balanceAfter).to.equal(balanceBefore);
  });
});