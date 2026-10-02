import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - mba127442", function () {
  it("should revert when sending less than 10 ether to fallback function", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 9.999 ether (less than 10 ether) to the fallback function
    // Original contract requires exactly 10 ether, so it should revert
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("9.999")
      })
    ).to.be.reverted;
  });
});