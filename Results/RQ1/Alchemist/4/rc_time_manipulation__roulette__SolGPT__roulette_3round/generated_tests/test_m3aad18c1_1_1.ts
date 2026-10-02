import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette - kill mutant m3aad18c1", function () {
  it("should revert when sending less than 10 ether to fallback (mutant removed the require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 1 ether (not 10) to fallback - should revert on original, succeed on mutant
    const tx = addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    await expect(tx).to.be.reverted;
  });
});