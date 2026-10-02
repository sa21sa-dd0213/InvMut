import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m79c348ea test", function () {
  it("should revert second fallback call in same block due to timestamp check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with enough ether to satisfy the 10 ether requirement
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("20")
    });

    // First call: should succeed (block.timestamp > 0 initially)
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
      gasLimit: 100000
    });

    // Mine a block to ensure block.timestamp advances (required for second call to potentially revert)
    await ethers.provider.send("evm_mine", []);

    // Second call: should revert because block.timestamp is not > pastBlockTime
    // (pastBlockTime was set to block.timestamp by the contract, not block.prevrandao)
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10"),
        gasLimit: 100000
      })
    ).to.be.reverted;
  });
});