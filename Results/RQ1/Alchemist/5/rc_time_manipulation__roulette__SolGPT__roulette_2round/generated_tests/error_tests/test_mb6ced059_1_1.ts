import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mb6ced059 test", function () {
  it("should revert when sending 9 ether to fallback (mutant accepts it, original reverts)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 9 ether - should revert in original but NOT in mutant
    await expect(
      owner.sendTransaction({
        to: instance.target,
        value: ethers.parseEther("9")
      })
    ).to.be.reverted;
  });
});