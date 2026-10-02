import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m277fac66 test", function () {
  it("should kill mutant by sending exactly 10 ether and expecting no revert", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // Send exactly 10 ether to trigger the fallback function
    // Original: require(msg.value == 10 ether) passes
    // Mutant: require(msg.value - 1 == 10 ether) fails because 10 - 1 != 10
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // If we reach here without revert, the mutant is killed
    // because the mutant would have reverted with this exact value
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(ethers.parseEther("10"));
  });
});