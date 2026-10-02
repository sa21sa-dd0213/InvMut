import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - m54aa401a", function () {
  it("should succeed on deposit with positive msg.value in original, but fail on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 wei - should succeed in original, but mutant's assertion will always fail
    const tx = instance.connect(owner).deposit({ value: 1 });
    await expect(tx).to.not.be.reverted;
    
    // Verify balance increased
    const balance = await instance.balances(owner.address);
    expect(balance).to.equal(1);
  });
});