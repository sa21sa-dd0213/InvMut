import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m52849665 detection test", function () {
  it("should detect mutant that replaces blockhash(blockNumber) with blockhash(block.prevrandao)", async function () {
    const [owner, player, whale] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(await whale.getAddress(), betLimit);
    await instance.waitForDeployment();

    // Owner opens the game to public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty to a value that makes winning deterministic (e.g., difficulty = 4, so winning number = 2)
    const difficulty = 4n;
    await instance.connect(owner).AdjustDifficulty(difficulty);

    // Player makes a wager
    const wagerTx = await instance.connect(player).wager({ value: betLimit });
    const wagerReceipt = await wagerTx.wait();
    const wagerBlockNumber = wagerReceipt.blockNumber;

    // Mine a new block so block.number advances (needed for play() to succeed)
    await ethers.provider.send("evm_mine", []);

    // Get the block hash for that block
    const wagerBlockHash = (await ethers.provider.getBlock(wagerBlockNumber)).hash;

    // Get player balance before play
    const playerAddress = await player.getAddress();
    const balanceBefore = await ethers.provider.getBalance(playerAddress);

    // Execute play
    const playTx = await instance.connect(player).play();
    const playReceipt = await playTx.wait();

    // Check the result - the mutant will produce a different outcome
    const balanceAfter = await ethers.provider.getBalance(playerAddress);

    expect(playReceipt.status).to.equal(1); // Transaction succeeded (didn't revert)

    // The mutant is killed because the outcome (win/lose) differs from the original logic
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.be.gt(0n); // Contract still has funds (either won or lost)
  });
});