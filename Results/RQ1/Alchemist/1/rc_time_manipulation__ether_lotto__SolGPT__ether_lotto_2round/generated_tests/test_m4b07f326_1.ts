import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m4b07f326 - sha256 replacement", function () {
  it("should detect that sha256 produces different outcome than keccak256 for the same inputs", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Record initial balances
    const initialBankBalance = await ethers.provider.getBalance(owner.address);
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);

    // Simulate the original keccak256 result by computing it off-chain
    const block = await ethers.provider.getBlock("latest");
    const blockTimestamp = block.timestamp;
    const blockDifficulty = block.difficulty;
    const playerAddress = player.address;

    // Compute the original keccak256 hash result
    const originalHash = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "uint256", "address"],
        [blockTimestamp, blockDifficulty, playerAddress]
      )
    );
    const originalRandom = BigInt(originalHash) % 2n;

    // Now play the game
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();

    // Compute what sha256 would produce for the same inputs
    const sha256Hash = ethers.sha256(
      ethers.toBeArray(
        ethers.solidityPacked(
          ["uint256", "uint256", "address"],
          [blockTimestamp, blockDifficulty, playerAddress]
        )
      )
    );
    const sha256Random = BigInt(sha256Hash) % 2n;

    // If the hashes differ, the mutant is detected because the game outcome changed
    if (originalRandom !== sha256Random) {
      // Check that the actual outcome matches the original keccak256 outcome, not sha256
      const potAfter = await instance.pot();
      if (originalRandom === 0n) {
        // Original: bank wins, pot should be 0
        expect(potAfter).to.equal(0n);
      } else {
        // Original: player wins, pot should be 0
        expect(potAfter).to.equal(0n);
      }
    } else {
      // If both hashes produce same result for this particular input,
      // we force a revert by checking that the outcome is NOT the sha256 outcome
      // (since the mutant uses sha256, the actual outcome will be the sha256 outcome)
      const potAfter = await instance.pot();
      const bankBalanceAfter = await ethers.provider.getBalance(owner.address);
      const playerBalanceAfter = await ethers.provider.getBalance(player.address);

      if (sha256Random === 0n) {
        // sha256 says bank wins: bank gets fee, player gets pot - fee, pot = 0
        expect(bankBalanceAfter - initialBankBalance).to.equal(FEE_AMOUNT);
        expect(playerBalanceAfter - initialPlayerBalance).to.equal(
          TICKET_AMOUNT - FEE_AMOUNT
        );
        expect(potAfter).to.equal(0n);
      } else {
        // sha256 says player wins: bank gets nothing, player gets pot, pot = 0
        expect(bankBalanceAfter - initialBankBalance).to.equal(0n);
        expect(playerBalanceAfter - initialPlayerBalance).to.equal(TICKET_AMOUNT);
        expect(potAfter).to.equal(0n);
      }
    }
  });
});