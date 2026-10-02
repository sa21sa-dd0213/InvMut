import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mba127442 - kill by sending less than 10 ether", function () {
  it("should revert when sending 9 ether to the contract (original requires exactly 10 ether)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 9 ether (less than 10) - should revert in original, but pass in mutant
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("9")
      })
    ).to.be.reverted;
  });
});