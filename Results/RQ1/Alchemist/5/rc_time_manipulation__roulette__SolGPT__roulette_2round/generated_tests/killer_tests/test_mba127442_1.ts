import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mba127442 - kill with less than 10 ether", function () {
  it("should revert when sending less than 10 ether (original requires exactly 10)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 5 ether to the fallback function - original requires exactly 10
    // Original: require(msg.value == 10 ether) → reverts
    // Mutant:   require(msg.value <= 10 ether) → accepts
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("5")
      })
    ).to.be.reverted;
  });
});