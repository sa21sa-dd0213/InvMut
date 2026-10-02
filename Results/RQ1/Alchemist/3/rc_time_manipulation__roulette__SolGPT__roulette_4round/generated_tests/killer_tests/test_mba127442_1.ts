import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mba127442 - kill test", function () {
  it("should revert when sending 9 ether (less than 10) - kills mutant that uses <= instead of ==", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 9 ether to the contract - original requires exactly 10, so this should revert
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("9")
      })
    ).to.be.reverted;
  });
});