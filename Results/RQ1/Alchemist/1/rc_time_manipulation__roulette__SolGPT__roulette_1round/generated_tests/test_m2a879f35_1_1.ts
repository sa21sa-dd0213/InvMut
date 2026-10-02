import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m2a879f35", function () {
  it("should revert when sending exactly 10 ether due to mutant != operator", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changed require(msg.value == 10 ether) to require(msg.value != 10 ether)
    // So sending exactly 10 ether should now revert (the opposite of original behavior)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});