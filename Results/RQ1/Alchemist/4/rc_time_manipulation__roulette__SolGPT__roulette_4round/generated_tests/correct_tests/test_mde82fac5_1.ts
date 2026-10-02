import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - mde82fac5", function () {
  it("should revert when sending more than 10 ether to kill the mutant that changed == to >=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether first to pass the initial require and set pastBlockTime
    const tx1 = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Advance time to allow next transaction
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    // Try sending more than 10 ether - should revert on original, pass on mutant
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10.001")
      })
    ).to.be.reverted;
  });
});