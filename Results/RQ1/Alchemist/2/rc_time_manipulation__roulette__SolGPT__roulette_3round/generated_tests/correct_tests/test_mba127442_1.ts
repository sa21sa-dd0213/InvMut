import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mba127442 test", function () {
  it("should revert when sending less than 10 ether to fallback (mutant uses <=)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // Attempt to send 5 ether (less than 10) - original requires exactly 10
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("5")
      })
    ).to.be.reverted;
  });
});