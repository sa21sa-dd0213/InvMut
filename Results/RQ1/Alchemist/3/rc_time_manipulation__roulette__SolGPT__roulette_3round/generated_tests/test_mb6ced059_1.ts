import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mb6ced059 test", function () {
  it("should revert when sending 9 ether to original, but mutant would accept it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 9 ether to the contract
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("9")
    });

    // The original requires msg.value == 10 ether, so 9 ether should revert
    // The mutant requires msg.value + 1 == 10 ether, so 9 ether would pass (9+1==10)
    await expect(tx).to.be.reverted;
  });
});