import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - mba127442", function () {
  it("should revert when sending less than 10 ether (original behavior) but mutant accepts it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send less than 10 ether - should revert on original, pass on mutant
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    await expect(tx).to.be.reverted;
  });
});