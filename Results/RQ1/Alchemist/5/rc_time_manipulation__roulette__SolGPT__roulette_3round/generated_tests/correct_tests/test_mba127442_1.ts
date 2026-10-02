import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - mba127442", function () {
  it("should revert when sending less than 10 ether to fallback (original behavior), but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 9.999 ether to the fallback function - should revert in original, pass in mutant
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("9.999")
      })
    ).to.be.reverted;
  });
});