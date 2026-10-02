import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection test", function () {
  it("should revert when sending more than 10 ether (mutant accepts >= 10 ether)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 11 ether to the fallback function - should revert in original but succeed in mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("11")
      })
    ).to.be.reverted;
  });
});