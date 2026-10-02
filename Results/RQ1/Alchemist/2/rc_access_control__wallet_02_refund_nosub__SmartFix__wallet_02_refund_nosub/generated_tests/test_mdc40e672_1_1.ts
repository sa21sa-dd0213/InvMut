import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test mdc40e672", function () {
  it("should revert when deposit is called with 0 value (original behavior) - kills mutant that changes assert condition", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes the assert condition so that deposit with 0 value no longer reverts
    // Original: assert(balances[msg.sender] + msg.value > balances[msg.sender]) - reverts on 0
    // Mutant: assert(balances[msg.sender] + msg.value + 1 > balances[msg.sender]) - passes on 0
    await expect(
      instance.connect(owner).deposit({ value: 0 })
    ).to.be.reverted;
  });
});