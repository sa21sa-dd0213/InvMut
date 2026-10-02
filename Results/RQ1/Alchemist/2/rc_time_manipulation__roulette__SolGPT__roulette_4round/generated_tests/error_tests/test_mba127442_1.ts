import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Roulette mutant test - mba127442", function () {
  it("should revert when sending less than exactly 10 ether (kills mutant with <=)", async function () {
    const [owner, sender] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 9 ether to the contract - should revert in original (requires == 10 ether)
    // but would pass in mutant (allows <= 10 ether)
    await expect(
      sender.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("9")
      })
    ).to.be.reverted;
  });
});