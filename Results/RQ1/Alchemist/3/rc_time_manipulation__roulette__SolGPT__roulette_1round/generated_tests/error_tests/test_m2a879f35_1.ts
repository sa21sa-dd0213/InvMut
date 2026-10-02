import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m2a879f35 test", function () {
  it("should revert when sending exactly 10 ether to fallback (mutant kills original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to the fallback function
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // In the original contract this would succeed, but the mutant requires msg.value != 10 ether,
    // so sending exactly 10 ether should revert
    await expect(tx).to.be.reverted;
  });
});