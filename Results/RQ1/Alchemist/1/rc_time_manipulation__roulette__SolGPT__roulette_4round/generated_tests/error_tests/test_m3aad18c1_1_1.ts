import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m3aad18c1 - remove msg.value == 10 ether check", function () {
  it("should revert when sending 1 ether to fallback (mutant removed the require)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract requires exactly 10 ether; sending 1 ether should revert
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1"),
      })
    ).to.be.reverted;
  });
});