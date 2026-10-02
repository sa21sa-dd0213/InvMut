import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - mb6ced059", function () {
  it("should revert when sending exactly 10 ether to the mutant (msg.value+1 == 10 ether)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether - should fail in mutant because msg.value+1 becomes 11 ether
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});