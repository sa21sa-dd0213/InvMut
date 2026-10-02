import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - mba127442", function () {
  it("should revert when sending less than exactly 10 ether, detecting the mutant that changed == to <=", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send a transaction with value less than 10 ether - should revert in original but succeed in mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("9")
      })
    ).to.be.reverted;
  });
});