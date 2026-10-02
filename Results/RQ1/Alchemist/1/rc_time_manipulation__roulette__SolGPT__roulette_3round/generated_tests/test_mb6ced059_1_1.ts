import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mb6ced059 detection", function () {
  it("should detect mutant that changes msg.value comparison from == to msg.value+1 ==", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether - this should pass on original but fail on mutant
    // because mutant requires msg.value + 1 == 10 ether (i.e., msg.value == 10 ether - 1 wei)
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx).to.be.reverted;
  });
});