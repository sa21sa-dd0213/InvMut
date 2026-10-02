import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant md3aae15f detection", function () {
  it("should detect the mutant by sending two consecutive transactions and expecting the second to succeed (original) but revert (mutant)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First transaction: send 10 ether and record pastBlockTime
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Get the pastBlockTime after first transaction
    const pastBlockTime1 = await instance.pastBlockTime();

    // Mine a new block to ensure timestamp increases
    await ethers.provider.send("evm_mine", []);

    // Second transaction: should succeed in original (timestamp > pastBlockTime)
    // but should revert in mutant (timestamp < pastBlockTime is false)
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // In the mutant, this second transaction should revert because
    // block.timestamp will be >= pastBlockTime (cannot be < pastBlockTime)
    await expect(tx2).to.be.reverted;
  });
});