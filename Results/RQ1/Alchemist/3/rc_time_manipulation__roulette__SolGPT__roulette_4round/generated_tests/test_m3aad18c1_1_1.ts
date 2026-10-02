import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m3aad18c1", function () {
  it("should revert when sending less than 10 ether to fallback function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 1 ether (not 10) to the fallback function - should revert on original, pass on mutant
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1")
      })
    ).to.be.reverted;
  });
});