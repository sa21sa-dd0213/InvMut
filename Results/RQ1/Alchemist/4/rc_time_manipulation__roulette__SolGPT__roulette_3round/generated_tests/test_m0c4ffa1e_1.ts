import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m0c4ffa1e", function () {
  it("should revert or keep balance when block.number % 15 != 0, but mutant transfers incorrectly", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // Fund contract with extra ether to have a non-zero balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("20")
    });

    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Mine blocks until we are on a block where block.number % 15 != 0
    while ((await ethers.provider.getBlock("latest")).number % 15 === 0) {
      await ethers.provider.send("evm_mine", []);
    }

    // Record the block number before the call
    const blockBefore = await ethers.provider.getBlock("latest");
    expect(blockBefore.number % 15).to.not.equal(0);

    // Send exactly 10 ether to trigger fallback
    await user.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());

    // In the original, no transfer should happen -> balance stays same
    // In the mutant (true condition), transfer happens -> balance decreases
    // We expect the original behavior: balance unchanged
    expect(finalBalance).to.equal(initialBalance);
  });
});