import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m1bb503c1 - deposit with msg.value = 1", function () {
  it("should revert on mutant when depositing exactly 1 wei due to faulty assertion", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit exactly 1 wei from addr1
    // Original: assertion passes (balances[addr1] + 1 > balances[addr1])
    // Mutant: assertion fails (balances[addr1] + 1 - 1 > balances[addr1] is false)
    await expect(
      instance.connect(addr1).deposit({ value: 1 })
    ).to.be.reverted;
  });
});