import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - timestamp comparison", function () {
  it("should kill mutant md3aae15f by verifying that second call with same timestamp reverts", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call with exactly 10 ether - should succeed in original
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get the block timestamp of the first transaction
    const firstBlock = await ethers.provider.getBlock("latest");
    const firstTimestamp = firstBlock!.timestamp;

    // Mine a new block with the same timestamp (simulate rapid successive calls)
    await ethers.provider.send("evm_setNextBlockTimestamp", [firstTimestamp]);

    // Second call should revert because timestamp is not > pastBlockTime (it's equal)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});