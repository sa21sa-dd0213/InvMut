import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m9e615f4a test", function () {
  it("should kill the mutant by proving the stored block is current block instead of next block", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Player locks in a guess with 1 ether
    // The guess doesn't matter - we're testing that the stored block is wrong
    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(player).lockInGuess(dummyHash, { value: ethers.parseEther("1") });

    // Mine one block to advance past the stored block (in original contract)
    await ethers.provider.send("evm_mine", []);

    // Now call settle() - in original, this would use blockhash(block.number + 1)
    // In mutant, this uses blockhash(block.number) which is always 0
    // The transfer should revert because answer will be 0 in mutant
    await expect(
      instance.connect(player).settle()
    ).to.be.reverted;

    // Additional check: player should still have their ether (not transferred)
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(ethers.parseEther("2")); // 1 from deploy + 1 from lockInGuess
  });
});