import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant detection - Deposit with non-zero value", function () {
  it("should kill the mutant by sending non-zero ether to Deposit and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 1 wei to Deposit - should succeed on original but revert on mutant
    const tx = await instance.Deposit({ value: 1 });
    await tx.wait();

    // If we reach here, the transaction succeeded (mutant killed - original behavior)
    const balance = await instance.balances(owner.address);
    expect(balance).to.equal(1);
  });
});