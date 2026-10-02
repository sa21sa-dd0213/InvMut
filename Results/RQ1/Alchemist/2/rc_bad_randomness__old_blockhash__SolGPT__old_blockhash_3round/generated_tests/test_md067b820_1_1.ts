import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge - kill mutant md067b820", function () {
  it("should fail to win with max bytes32 guess on original but pass on mutant", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Player locks in guess with the maximum possible bytes32 value
    const maxBytes32 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    const lockTx = await instance.connect(player).lockInGuess(maxBytes32, {
      value: ethers.parseEther("1")
    });
    await lockTx.wait();
    
    // Mine blocks to advance past the target block
    const targetBlock = (await ethers.provider.getBlock("latest"))!.number + 1;
    while ((await ethers.provider.getBlock("latest"))!.number <= targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Settle the guess - should revert because max value != blockhash
    await expect(
      instance.connect(player).settle()
    ).to.be.reverted;
  });
});