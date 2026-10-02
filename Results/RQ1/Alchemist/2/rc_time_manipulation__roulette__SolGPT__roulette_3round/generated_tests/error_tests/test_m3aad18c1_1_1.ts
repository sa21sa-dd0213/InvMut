import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m3aad18c1 - require(msg.value == 10 ether) removed", function () {
  it("should revert when sending less than 10 ether to fallback, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 1 ether (not 10) to the fallback function - should revert on original, but mutant accepts it
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1")
      })
    ).to.be.reverted;
  });
});