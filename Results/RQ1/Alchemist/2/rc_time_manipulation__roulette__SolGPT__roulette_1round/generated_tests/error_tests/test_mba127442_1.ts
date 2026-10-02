import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Roulette mutant test - mba127442", function () {
  it("should revert when sending 9 ether (less than 10 ether) in original, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // Send 9 ether - original requires exactly 10 ether, so it should revert
    // Mutant allows <= 10 ether, so it would NOT revert (killing the mutant)
    await expect(
      owner.sendTransaction({
        to: instance.target,
        value: ethers.parseEther("9")
      })
    ).to.be.reverted;
  });
});