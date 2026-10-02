import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m79c348ea", function () {
  it("should detect mutant that uses block.prevrandao instead of block.timestamp", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ether for the first call
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // First call: should succeed (block.prevrandao > pastBlockTime initially 0)
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Wait for at least one new block to ensure a different prevrandao
    await ethers.provider.send("evm_mine", []);

    // Second call in a new block: in the original, block.timestamp would be > pastBlockTime
    // In the mutant, block.prevrandao might be <= previous prevrandao, causing revert
    const tx = addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The mutant will revert because prevrandao is not guaranteed to be greater than the previous value
    await expect(tx).to.be.reverted;
  });
});