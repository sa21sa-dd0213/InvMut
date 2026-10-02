import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - mde82fac5", function () {
  it("should revert when sending more than 10 ether (kills mutant that uses >= instead of ==)", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the contract (constructor is payable but takes no arguments)
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First send exactly 10 ether to set pastBlockTime
    await attacker.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Wait for next block
    await ethers.provider.send("evm_mine", []);

    // Now attempt to send 11 ether - this should revert on original but succeed on mutant
    await expect(
      attacker.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("11")
      })
    ).to.be.reverted;
  });
});