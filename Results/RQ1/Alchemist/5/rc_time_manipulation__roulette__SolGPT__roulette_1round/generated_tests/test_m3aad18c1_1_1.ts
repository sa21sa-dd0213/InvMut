import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - m3aad18c1", function () {
  it("should revert when sending value other than exactly 10 ether (mutant removed the require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 1 ether (not 10 ether) to the fallback function - should revert in original
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1"),
      })
    ).to.be.reverted;
  });
});