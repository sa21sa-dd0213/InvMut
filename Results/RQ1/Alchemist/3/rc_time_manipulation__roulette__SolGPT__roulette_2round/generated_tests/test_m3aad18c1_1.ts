import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m3aad18c1 - kill by sending wrong ether amount", function () {
  it("should revert when sending less than 10 ether on original, but mutant should not revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 1 ether (not 10) to the contract - original would revert, mutant will not
    const tx = addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Expect revert in original, but in mutant this transaction will succeed
    await expect(tx).to.be.reverted;
  });
});