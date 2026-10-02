import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - mba127442", function () {
  it("should revert when sending less than 10 ether to fallback function (kills mutant with <=)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 9 ether (less than 10) to the fallback function - should revert in original
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("9")
    });

    await expect(tx).to.be.reverted;
  });
});