import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - mdc364064", function () {
  it("should detect that blockhash is replaced with zero, causing deterministic winning numbers regardless of block context", async function () {
    const [owner, player1, player2] = await ethers.getSigners();
    const whaleAddress = owner.address;
    const wagerLimit = ethers.parseEther("1");

    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Open to public
    await (await instance.connect(owner).OpenToThePublic()).wait();

    // Set difficulty to ensure predictable winning condition
    // difficulty = 4 means winningNumber == 2 wins (since difficulty/2 = 2)
    await (await instance.connect(owner).AdjustDifficulty(4)).wait();

    // Player1 wagers in block N
    await (await instance.connect(player1).wager({ value: wagerLimit })).wait();

    // Player2 wagers in block N+1 (different block hash)
    await (await instance.connect(player2).wager({ value: wagerLimit })).wait();

    // Mine a block so both can play
    await ethers.provider.send("evm_mine", []);

    // Both players play - with the mutant, both will get the same winning number
    // because blockhash(blockNumber) is replaced with 0
    // In the original, they would get different numbers due to different block hashes

    // Get initial balances to detect transfers
    const whaleBalanceBefore = await ethers.provider.getBalance(whaleAddress);
    const player1BalanceBefore = await ethers.provider.getBalance(player1.address);
    const player2BalanceBefore = await ethers.provider.getBalance(player2.address);

    // Play for player1
    const tx1 = await instance.connect(player1).play();
    const receipt1 = await tx1.wait();

    // Play for player2
    const tx2 = await instance.connect(player2).play();
    const receipt2 = await tx2.wait();

    // With difficulty=4 and blockhash replaced with 0:
    // winningNumber = uint256(keccak256(abi.encodePacked(0, player1, randomSeed))) % 4 + 1
    // This is deterministic and will produce the same result for both players
    // In the original, different block hashes would produce different results

    // Check if both players had the same outcome by comparing balance changes
    const player1BalanceAfter = await ethers.provider.getBalance(player1.address);
    const player2BalanceAfter = await ethers.provider.getBalance(player2.address);

    const player1Change = player1BalanceAfter - player1BalanceBefore;
    const player2Change = player2BalanceAfter - player2BalanceBefore;

    // In the original contract, different block hashes would likely produce different outcomes
    // In the mutant, both get the same deterministic outcome
    // The test kills the mutant by verifying that the behavior is deterministic when it shouldn't be

    // Get the contract balance to check if the same amount was transferred to whale
    const whaleBalanceAfter = await ethers.provider.getBalance(whaleAddress);
    const whaleChange = whaleBalanceAfter - whaleBalanceBefore;

    // With deterministic outcome, either both win (and get payout) or both lose (and whale gets loss amount)
    // If both win, they each get half the contract balance
    // If both lose, whale gets betLimit/2 twice
    // Either way, the whale change should be either 0 (if both win) or 2 * (betLimit/2) (if both lose)
    // This deterministic behavior reveals the mutant

    // The key assertion: in the mutant, both players will have the SAME outcome
    // In the original, they would likely have different outcomes due to different block hashes
    expect(player1Change).to.equal(player2Change, "Both players should have identical outcomes in the mutant, but original would differ");
  });
});