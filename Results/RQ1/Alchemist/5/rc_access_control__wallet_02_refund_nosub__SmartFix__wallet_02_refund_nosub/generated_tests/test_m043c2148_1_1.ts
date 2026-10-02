import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - m043c2148", function () {
  it("should kill mutant by calling deposit with value=1 when balance is 0 (assertion fails in mutant)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit with value=1 when balance is 0
    // Original: assert(0 + 1 > 0) => passes
    // Mutant: assert(0 * 1 > 0) => fails (0 > 0 is false)
    const tx = instance.connect(owner).deposit({ value: ethers.parseEther("1") });
    await expect(tx).to.not.be.reverted;
  });
});