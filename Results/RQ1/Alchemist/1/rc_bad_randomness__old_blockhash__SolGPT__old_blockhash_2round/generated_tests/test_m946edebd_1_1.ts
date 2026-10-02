import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should detect mutant m946edebd by checking payout on correct guess", async function () {
    const [owner, player] = await ethers.getSigners();

    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Get current block number
    const currentBlock = await ethers.provider.getBlock("latest");
    const targetBlockNumber = currentBlock.number + 1;

    // Lock in guess for the next block
    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(player).lockInGuess(dummyHash, { value: ethers.parseEther("1") });

    // Mine a block to advance past the target block
    await ethers.provider.send("evm_mine", []);

    // Now get the actual block hash of the target block
    const targetBlock = await ethers.provider.getBlock(targetBlockNumber);
    const actualBlockHash = targetBlock.hash;

    // Get player balance before settlement
    const balanceBefore = await ethers.provider.getBalance(player.address);

    // Settle - since we locked in with wrong hash, original contract would not pay
    // But mutant would pay because guess != answer
    await instance.connect(player).settle();

    // Get player balance after settlement
    const balanceAfter = await ethers.provider.getBalance(player.address);

    // In the original contract, this should NOT increase balance (wrong guess)
    // In the mutant, this SHOULD increase balance (because != condition triggers payout)
    // Since we locked in with wrong hash, the mutant pays out 2 ether
    expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("2"));
  });
});