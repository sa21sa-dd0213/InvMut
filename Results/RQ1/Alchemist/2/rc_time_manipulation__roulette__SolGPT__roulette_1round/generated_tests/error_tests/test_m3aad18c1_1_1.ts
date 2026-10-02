import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when msg.value is not exactly 10 ether (kills mutant that removes the require check)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // Send 1 ether (not 10) to the fallback function - should revert in original but not in mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1")
      })
    ).to.be.reverted;
  });
});