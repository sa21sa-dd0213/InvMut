import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant kill test", function () {
  it("should kill mutant mc1f84c66 by locking in a correct guess and expecting transfer", async function () {
    const [owner, player] = await ethers.getSigners();

    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const contract = await Factory.deploy({ value: ethers.parseEther("1") });
    await contract.waitForDeployment();

    // Player locks in a guess with 1 ether
    // We'll use a dummy hash since we don't know the future blockhash yet
    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await contract.connect(player).lockInGuess(dummyHash, { value: ethers.parseEther("1") });

    // Advance to the next block to satisfy the settlement condition
    await ethers.provider.send("evm_mine", []);

    // Get the actual blockhash of the block where the guess was locked
    // The lockInGuess stores block.number + 1, so we need to get that block's hash
    const filter = contract.filters.LockInGuess();
    const events = await contract.queryFilter(filter, -1, "latest");
    const guessBlock = events[0].args.block;

    // Mine until we pass the guess block
    const currentBlock = await ethers.provider.getBlockNumber();
    while (currentBlock <= guessBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Now we can compute the correct answer
    const answer = ethers.keccak256(
      ethers.toBeArray(await ethers.provider.getStorage(await contract.getAddress(), guessBlock))
    );

    // Player locks in a NEW guess with the correct answer
    await contract.connect(player).lockInGuess(answer, { value: ethers.parseEther("1") });

    // Advance past the guess block
    const newGuessBlock = (await contract.guesses(player.address)).block;
    const newCurrentBlock = await ethers.provider.getBlockNumber();
    while (newCurrentBlock <= newGuessBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Get player balance before settlement
    const balanceBefore = await ethers.provider.getBalance(player.address);

    // Settle - in original contract this should succeed, in mutant it should fail
    const tx = await contract.connect(player).settle();
    const receipt = await tx.wait();

    // Check that player received 2 ether (original behavior)
    const balanceAfter = await ethers.provider.getBalance(player.address);
    expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("2"));
  });
});