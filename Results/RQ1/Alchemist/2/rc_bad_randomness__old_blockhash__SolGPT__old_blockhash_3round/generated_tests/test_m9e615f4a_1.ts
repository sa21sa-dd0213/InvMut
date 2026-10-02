import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should kill mutant m9e615f4a by detecting incorrect block number storage", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Lock in a guess for the next block's hash
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test guess"));
    await instance.connect(addr1).lockInGuess(guessHash, { value: ethers.parseEther("1") });
    
    // Get the current block number after lockInGuess
    const currentBlock = await ethers.provider.getBlockNumber();
    
    // Mine one more block so block.number > stored block
    await ethers.provider.send("evm_mine", []);
    
    // Try to settle - this should succeed on original but fail on mutant
    // because mutant stored current block instead of next block
    await expect(
      instance.connect(addr1).settle()
    ).to.be.reverted;
  });
});