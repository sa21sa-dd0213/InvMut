import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant detection", function () {
  it("should kill mutant m4f308734 by calling Deposit with 0 value and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt a deposit of 0 ether - should succeed on original but revert on mutant
    const tx = await instance.connect(owner).Deposit({ value: 0 });
    await expect(tx).to.not.be.reverted;
    
    // Additionally verify that the balance was not increased (since value was 0)
    const balance = await instance.balances(owner.address);
    expect(balance).to.equal(0);
  });
});