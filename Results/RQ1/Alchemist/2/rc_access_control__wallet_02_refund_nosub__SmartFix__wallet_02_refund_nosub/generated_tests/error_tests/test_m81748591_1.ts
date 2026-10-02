import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m81748591 - deposit assertion change", function () {
  it("should kill mutant by depositing exactly 1 wei and verifying balance update", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei - should succeed on original but revert on mutant
    // because mutant's assertion: balance + msg.value - 1 > balance becomes
    // balance + 1 - 1 > balance => balance > balance which is always false
    const tx = instance.connect(owner).deposit({ value: 1 });
    
    // On the original contract, this should succeed
    // On the mutant, this should revert due to the faulty assertion
    await expect(tx).to.not.be.reverted;
    
    // Verify balance was updated correctly
    // This check would fail on mutant since the transaction would have reverted
    const balance = await ethers.provider.getBalance(await instance.getAddress());
    expect(balance).to.equal(1);
  });
});