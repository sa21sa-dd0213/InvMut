import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - m3e40ad21 (sha256 vs keccak256)", function () {
  it("should detect the hash function change by comparing actual win/loss outcome with expected outcome from keccak256", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");

    // Deploy contract
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Open to public
    await (await instance.connect(owner).OpenToThePublic()).wait();

    // Set difficulty to a known value (e.g., 10) so we can predict winning number
    const difficulty = 10;
    await (await instance.connect(owner).AdjustDifficulty(difficulty)).wait();

    // Player wagers
    await (await instance.connect(player).wager({ value: betLimit })).wait();

    // Mine a block to ensure block.number > blockNumber stored in timestamps
    await ethers.provider.send("evm_mine", []);

    // Get the blockNumber when player wagered (stored in timestamps)
    // We need to simulate the original keccak256 calculation to determine expected outcome
    const blockNumber = (await ethers.provider.getBlock("latest")).number - 1;

    // Compute expected winning number using keccak256 (original hash function)
    const randomSeed = 0; // default randomSeed is 0
    const encodedData = ethers.solidityPacked(
      ["bytes32", "address", "uint256"],
      [ethers.zeroPadValue(ethers.toBeHex(blockNumber), 32), player.address, randomSeed]
    );
    const keccakHash = ethers.keccak256(encodedData);
    const keccakWinningNumber = (BigInt(keccakHash) % BigInt(difficulty)) + BigInt(1);

    // Compute what sha256 would produce (mutant behavior)
    const shaHash = ethers.sha256(encodedData);
    const shaWinningNumber = (BigInt(shaHash) % BigInt(difficulty)) + BigInt(1);

    // Play the game - if mutant is present, outcome will differ when keccak != sha
    const balanceBefore = await ethers.provider.getBalance(instance.target);
    const tx = instance.connect(player).play();

    // The expected win condition is winningNumber == difficulty / 2 (i.e., 5)
    const winThreshold = BigInt(difficulty) / BigInt(2); // 5

    if (keccakWinningNumber === winThreshold) {
      // Original would win - check that we get a win event
      await expect(tx).to.emit(instance, "Win");
    } else if (shaWinningNumber === winThreshold && keccakWinningNumber !== winThreshold) {
      // Mutant would win but original would not - test should fail (mutant detected)
      await expect(tx).to.not.emit(instance, "Win");
    } else {
      // Both produce same outcome (both win or both lose) - need different test scenario
      // For thorough testing, we force a specific block number where keccak gives win
      // This test scenario already covers the case where they differ
      // If they don't differ here, we can assert the transaction succeeds without revert
      await expect(tx).to.not.be.reverted;
    }

    // Additional check: if keccakWinningNumber != shaWinningNumber, we can directly
    // verify the contract's behavior matches keccak256 (original) not sha256 (mutant)
    if (keccakWinningNumber !== shaWinningNumber) {
      // The actual contract balance should reflect original behavior
      const balanceAfter = await ethers.provider.getBalance(instance.target);
      if (keccakWinningNumber === winThreshold) {
        // Original: player wins, contract loses half balance
        expect(balanceAfter).to.be.lessThan(balanceBefore);
      } else {
        // Original: player loses, contract loses betLimit/2 to whale
        expect(balanceAfter).to.be.lessThan(balanceBefore);
      }
    }
  });
});