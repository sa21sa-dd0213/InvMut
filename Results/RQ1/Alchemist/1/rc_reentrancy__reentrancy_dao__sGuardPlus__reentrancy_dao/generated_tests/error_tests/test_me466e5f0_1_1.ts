import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test - me466e5f0", function () {
  it("should kill the mutant by calling withdrawAll() from address with zero credit and expecting revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has zero credit initially
    const balanceBefore = await ethers.provider.getBalance(instance.getAddress());
    
    // Attempt to withdraw with zero credit - original reverts, mutant does not
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;

    // Verify balance unchanged (should hold for original, but mutant might change it)
    const balanceAfter = await ethers.provider.getBalance(instance.getAddress());
    expect(balanceAfter).to.equal(balanceBefore);
  });
});