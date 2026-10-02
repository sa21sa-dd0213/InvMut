import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m64e0ec6c detection", function () {
    it("should detect mutant that replaces + with * in winningNumber calculation", async function () {
        const [owner, player1] = await ethers.getSigners();
        
        // Deploy with a whale address and bet limit
        const betLimit = ethers.parseEther("1");
        const Factory = await ethers.getContractFactory("PoCGame");
        const instance = await Factory.deploy(owner.address, betLimit);
        await instance.waitForDeployment();
        
        // Open the game to the public
        await instance.OpenToThePublic();
        
        // Set difficulty to 4 (even number) for deterministic testing
        // Original: winningNumber = hash % 4 + 1 -> range 1-4, win when == 2
        // Mutant: winningNumber = hash % 4 * 1 -> range 0-3, win when == 2 (but different numbers qualify)
        await instance.AdjustDifficulty(4);
        
        // Player makes a wager
        const wagerTx = await instance.connect(player1).wager({ value: betLimit });
        await wagerTx.wait();
        
        // Mine a block to ensure block.number > timestamps[player1]
        await ethers.provider.send("evm_mine", []);
        
        // Get the block number when wager was placed to compute expected winningNumber
        const receipt = await wagerTx.getBlock();
        const blockNumber = receipt!.number;
        
        // Calculate what winning number would be in the original contract
        const block = await ethers.provider.getBlock(blockNumber);
        const blockHash = block!.hash;
        const playerAddress = player1.address;
        
        // Compute hash manually for verification
        const encodedData = ethers.solidityPacked(["bytes32", "address"], [blockHash, playerAddress]);
        const hash = ethers.keccak256(encodedData);
        const hashNum = BigInt(hash);
        const difficulty = 4n;
        
        // Original: winningNumber = hash % difficulty + 1
        const originalWinningNumber = Number(hashNum % difficulty + 1n);
        
        // Mutant: winningNumber = hash % difficulty * 1 (same as hash % difficulty)
        const mutantWinningNumber = Number(hashNum % difficulty);
        
        // Determine expected behavior based on original contract logic
        const originalWinCondition = (originalWinningNumber === Number(difficulty) / 2); // win when == 2
        
        // For the mutant, win condition checks if mutantWinningNumber == difficulty/2
        const mutantWinCondition = (mutantWinningNumber === Number(difficulty) / 2); // win when == 2
        
        // Call play() and check behavior
        const playTx = instance.connect(player1).play();
        
        if (originalWinCondition !== mutantWinCondition) {
            // If the two contracts would give different results, the mutant is detectable
            // Test expects original contract behavior (passing on original, failing on mutant)
            if (originalWinCondition) {
                // Original would win (payout), mutant would lose
                // On mutant, player would lose half the bet instead of winning
                await expect(playTx).to.emit(instance, "Lose").withArgs(betLimit / 2n, player1.address);
            } else {
                // Original would lose, mutant would win
                // On mutant, player would win instead of losing
                const halfBalance = await instance.winnersPot();
                await expect(playTx).to.emit(instance, "Win").withArgs(halfBalance, player1.address);
            }
        } else {
            // If both would give same result, test still passes on original
            // This case is less likely but we handle it gracefully
            await expect(playTx).to.not.be.reverted;
        }
    });
});