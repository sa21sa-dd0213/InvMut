import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - mde82fac5", function () {
  it("should revert when sending more than exactly 10 ether (mutant accepts >= 10 ether)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial ether to allow balance transfers
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Send 11 ether to the fallback - original requires == 10 ether, so should revert
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("11")
      })
    ).to.be.reverted;
  });
});