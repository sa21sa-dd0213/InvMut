import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection - m7e788696", function () {
  it("should revert when user with zero credit calls withdrawAll on original contract, but mutant allows it", async function () {
    const [owner, user] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // User has never deposited, so credit[user] = 0
    // On the original contract, the condition oCredit > 0 prevents the withdrawal
    // On the mutant, the condition is always true, so it will execute the withdrawal logic

    // We expect the call to revert on the original contract
    // If the mutant is deployed, it will not revert (killing the mutant)
    await expect(
      instance.connect(user).withdrawAll()
    ).to.be.revertedWith(""); // Empty string since original contract uses require without custom error message
  });
});