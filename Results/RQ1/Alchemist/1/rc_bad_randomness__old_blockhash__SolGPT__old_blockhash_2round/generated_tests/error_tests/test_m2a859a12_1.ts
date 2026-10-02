import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should kill mutant m2a859a12 by exploiting block.number * 1 behavior", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a guess for the current block hash (which is 0x0 for the current block)
    const currentBlockNumber = await ethers.provider.getBlockNumber();
    const answer = ethers.keccak256(ethers.solidityPacked(["bytes32"], [ethers.ZeroHash]));
    
    // Attacker locks in guess with 1 ether
    await instance.connect(attacker).lockInGuess(answer, { value: ethers.parseEther("1") });
    
    // Get the block after lockInGuess to determine the stored target block
    const blockAfterLock = await ethers.provider.getBlockNumber();
    
    // Mine a new block so block.number > stored target block
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to settle - should succeed on mutant (target = current block = 0x0 hash)
    // but would fail on original because original sets target = block.number + 1
    await instance.connect(attacker).settle();
    
    // Verify attacker received 2 ether (settlement succeeded)
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(ethers.parseEther("0"));
  });
});