import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant md3aae15f detection", function () {
  it("should detect mutant that changed > to < in timestamp check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ether for the first call
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // First call: succeeds in original (timestamp > pastBlockTime is true)
    // In mutant: timestamp < pastBlockTime would be false initially (pastBlockTime = 0)
    // so first call succeeds in both cases
    const tx1 = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Wait for next block to ensure timestamp increases
    await ethers.provider.send("evm_mine", []);

    // Second call with increased timestamp
    // Original: block.timestamp > pastBlockTime => true (succeeds)
    // Mutant: block.timestamp < pastBlockTime => false (reverts because timestamp is now greater)
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.not.be.reverted;
  });
});