import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - mba127442", function () {
  it("should revert when sending less than 10 ether (mutant accepts <= 10 ether)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 5 ether to trigger fallback - original requires exactly 10 ether
    // Mutant would accept this value, but original should revert
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("5")
      })
    ).to.be.reverted;
  });
});