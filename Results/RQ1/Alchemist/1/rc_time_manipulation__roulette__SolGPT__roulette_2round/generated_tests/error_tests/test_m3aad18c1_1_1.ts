import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m3aad18c1 test", function () {
  it("should revert when sending 1 ether (not 10 ether) to fallback function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund contract with initial balance to avoid underflow issues
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Attempt to send 1 ether to fallback - should revert in original but not in mutant
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1")
      })
    ).to.be.reverted;
  });
});