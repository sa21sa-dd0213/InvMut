import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mba127442 test", function () {
  it("should revert when sending less than 10 ether to fallback function", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 5 ether to fallback - should revert because original requires exactly 10 ether
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("5")
      })
    ).to.be.reverted;
  });
});