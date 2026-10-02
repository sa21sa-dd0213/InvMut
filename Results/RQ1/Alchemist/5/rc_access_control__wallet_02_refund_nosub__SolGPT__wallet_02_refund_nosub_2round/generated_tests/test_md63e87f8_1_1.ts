import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - deposit assertion", function () {
  it("should revert when depositing any positive amount due to mutant assertion bug", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes the assertion to: balances[msg.sender] - msg.value > balances[msg.sender]
    // For any positive deposit amount, this assertion will always be false (e.g., 0 - 1 > 0 is false)
    // Therefore, any deposit call should revert
    await expect(
      instance.connect(owner).deposit({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});