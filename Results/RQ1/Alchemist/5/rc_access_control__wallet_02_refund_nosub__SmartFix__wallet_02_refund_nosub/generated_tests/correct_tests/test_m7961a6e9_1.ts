import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - deposit assertion change", function () {
  it("should detect mutant by calling deposit with a positive amount and expecting no revert on original, but revert on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit a small positive amount - on original contract this succeeds
    // On mutant, the assert(balances[msg.sender] + msg.value < balances[msg.sender])
    // will fail because sum > original balance (no overflow possible in Solidity 0.8+)
    await expect(
      instance.connect(owner).deposit({ value: ethers.parseEther("1") })
    ).to.not.be.reverted;
  });
});