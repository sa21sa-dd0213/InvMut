import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette - kill mutant mba127442 (msg.value <= 10 ether)", function () {
  it("should revert when sending less than 10 ether, killing the mutant that uses <= instead of ==", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to send 5 ether (less than 10 ether) to the fallback
    // Original requires exactly 10 ether, so this should revert
    // Mutant accepts any value <= 10 ether, so it would NOT revert
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("5")
      })
    ).to.be.reverted;
  });
});