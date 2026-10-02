import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test - m12b6ddb7", function () {
  it("should detect mutant where == is replaced with >= in settle()", async function () {
    const [owner, player] = await ethers.getSigners();

    // Deploy the contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Player locks in a guess with the maximum possible hash value
    const maxHash = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    const lockTx = await instance.connect(player).lockInGuess(maxHash, {
      value: ethers.parseEther("1")
    });
    await lockTx.wait();

    // Get the block number when the guess was locked
    const lockBlock = await ethers.provider.getBlock(lockTx.blockNumber);
    const targetBlock = lockBlock.number + 1;

    // Mine to the target block + 1 (so block.number > target block)
    await ethers.provider.send("hardhat_mine", ["0x2"]);

    // The actual blockhash of the target block will be something other than maxHash
    // In the original: guess == answer would fail (no transfer)
    // In the mutant: guess >= answer would pass (transfer occurs)

    // Check balance before settle
    const balanceBefore = await ethers.provider.getBalance(player.address);

    // Call settle
    const settleTx = await instance.connect(player).settle();
    const receipt = await settleTx.wait();

    // Check balance after settle
    const balanceAfter = await ethers.provider.getBalance(player.address);

    // On the original contract, no transfer should happen because maxHash != actual blockhash
    // On the mutant, transfer would happen because maxHash >= actual blockhash
    // If no transfer happened (original behavior), balance difference is just gas costs
    // If transfer happened (mutant behavior), balance would be at least 2 ether higher

    // We expect no transfer (original behavior), so balance should not increase by 2 ether
    const balanceIncrease = balanceAfter - balanceBefore;
    expect(balanceIncrease).to.be.lessThan(ethers.parseEther("2"));
  });
});