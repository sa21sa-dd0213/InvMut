import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m1bb503c1 test", function () {
  it("should kill mutant by depositing exactly 1 wei", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei - should pass on original but revert on mutant
    // because mutant assert becomes 0 + 1 - 1 > 0 which is false
    const tx = instance.connect(owner).deposit({ value: 1 });
    await expect(tx).to.be.reverted;
  });
});