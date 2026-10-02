import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - mba127442", function () {
  it("should revert when sending exactly 9 ether (kills mutant that changed == to <=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance to ensure transfer works later if needed
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Set pastBlockTime to allow the transaction to proceed
    // Send a first transaction with exactly 10 ether to update pastBlockTime
    await instance.connect(addr1).fallback({ value: ethers.parseEther("10") });

    // Now send 9 ether - this should revert in original (requires == 10 ether)
    // but would pass in mutant (requires <= 10 ether)
    await expect(
      instance.connect(addr1).fallback({ value: ethers.parseEther("9") })
    ).to.be.reverted;
  });
});