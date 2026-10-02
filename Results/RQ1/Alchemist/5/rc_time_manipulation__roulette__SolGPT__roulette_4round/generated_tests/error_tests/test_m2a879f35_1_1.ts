import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m2a879f35", function () {
  it("should revert when sending exactly 10 ether to the fallback function (mutant uses != instead of ==)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant requires msg.value != 10 ether, so sending exactly 10 ether should revert
    // The original requires msg.value == 10 ether, so sending exactly 10 ether would succeed
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx).to.be.reverted;
  });
});