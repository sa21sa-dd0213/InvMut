import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection test", function () {
  it("should revert when sending value other than 10 ether (mutant removal of require check)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 1 ether instead of the required 10 ether - should revert in original but pass in mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1")
      })
    ).to.be.reverted;
  });
});