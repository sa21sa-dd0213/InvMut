import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mb6ced059 detection test", function () {
  it("should kill mutant by sending exactly 10 ether and expecting success, while mutant expects 9 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to trigger the fallback
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // The transaction should succeed (not revert) in the original
    // The mutant will revert because it expects msg.value + 1 == 10, i.e., 9 ether
    // If the test reaches here without revert, the mutant is killed
    // (since the mutant would have reverted on 10 ether)
  });
});