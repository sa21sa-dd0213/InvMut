import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test - me466e5f0", function () {
  it("should revert or not change state when user with zero credit calls withdrawAll", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, have owner deposit some ETH so balance > 0
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(owner).deposit({ value: depositAmount });

    // Now addr1 (who has zero credit) tries to withdrawAll
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    const creditBefore = await instance.credit(addr1.address);

    await instance.connect(addr1).withdrawAll();

    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    const creditAfter = await instance.credit(addr1.address);

    // On the original contract, balance and credit should remain unchanged
    // On the mutant, balance might change (subtract 0) and credit set to 0 (still 0)
    // But the key invariant: a user with zero credit should not trigger any state change
    expect(balanceAfter).to.equal(balanceBefore);
    expect(creditAfter).to.equal(creditBefore);
  });
});