import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection - mdbd4e99b", function () {
  it("should revert when withdrawing more than deposited due to credit inflation bug", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // User deposits exactly 1 wei
    const depositAmount = ethers.parseEther("0.000000000000000001"); // 1 wei
    await instance.connect(user).deposit({ value: depositAmount });

    // User tries to withdraw all - mutant will attempt to send depositAmount + 1 wei
    // but contract only holds depositAmount, so call should revert
    await expect(
      instance.connect(user).withdrawAll()
    ).to.be.reverted;
  });
});