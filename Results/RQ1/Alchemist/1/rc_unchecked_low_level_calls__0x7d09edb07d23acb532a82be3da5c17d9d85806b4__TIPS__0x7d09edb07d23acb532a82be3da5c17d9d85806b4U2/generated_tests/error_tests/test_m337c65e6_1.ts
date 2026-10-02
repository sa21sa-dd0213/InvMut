import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PoCGame mutant m337c65e6 - kill test", function () {
  it("should detect mutant that changes win condition from == to <=", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const difficulty = 10; // difficulty/2 = 5, so winningNumber must be exactly 5 to win

    // Deploy contract with constructor arguments: whale address, wager limit
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Owner opens contract to public
    await (await instance.connect(owner).OpenToThePublic()).wait();

    // Set difficulty to 10 so difficulty/2 = 5
    await (await instance.connect(owner).AdjustDifficulty(difficulty)).wait();

    // Player makes a wager
    await (await instance.connect(player).wager({ value: betLimit })).wait();

    // Mine a block to advance block.number so blockNumber < block.number
    await ethers.provider.send("evm_mine", []);

    // Now the winningNumber will be computed from blockhash of previous block
    // We cannot control the hash, but we can run multiple times if needed
    // Instead, we can pre-compute: deploy with difficulty=2, difficulty/2=1
    // winningNumber will be 1 or 2 (mod 2 + 1) so only 1 wins originally
    // Let's redeploy with difficulty=2 for deterministic test
    const Factory2 = await ethers.getContractFactory("PoCGame");
    const instance2 = await Factory2.deploy(whale.address, betLimit);
    await instance2.waitForDeployment();
    await (await instance2.connect(owner).OpenToThePublic()).wait();
    await (await instance2.connect(owner).AdjustDifficulty(2)).wait(); // difficulty/2 = 1

    // Player wagers
    await (await instance2.connect(player).wager({ value: betLimit })).wait();

    // Mine block
    await ethers.provider.send("evm_mine", []);

    // For difficulty=2, winningNumber = (hash % 2) + 1, so it's either 1 or 2
    // If hash % 2 == 0, winningNumber=1 (original win condition: ==1 => win)
    // If hash % 2 == 1, winningNumber=2 (original: !=1 => lose)
    // We need the case where original loses but mutant wins: winningNumber=2
    // Since we cannot control hash, we need to iterate until we get winningNumber=2

    // Actually, let's use difficulty=3 instead: difficulty/2 = 1 (integer division)
    // winningNumber = (hash % 3) + 1, range 1-3
    // Original wins only on 1; mutant wins on 1 (<=1)
    // So both agree on win when winningNumber=1
    // We need winningNumber=2 or 3 where original loses but mutant wins

    // Better approach: use difficulty=4, difficulty/2=2
    // winningNumber = (hash % 4) + 1, range 1-4
    // Original wins only on 2; mutant wins on 1 or 2 (<=2)
    // We need winningNumber=1 where original loses but mutant wins

    const Factory3 = await ethers.getContractFactory("PoCGame");
    const instance3 = await Factory3.deploy(whale.address, betLimit);
    await instance3.waitForDeployment();
    await (await instance3.connect(owner).OpenToThePublic()).wait();
    await (await instance3.connect(owner).AdjustDifficulty(4)).wait();

    // We'll loop until we get a block hash that produces winningNumber=1
    let found = false;
    let attempts = 0;
    while (!found && attempts < 20) {
      // Each iteration: new player, new wager, new block
      const tempPlayer = (await ethers.getSigners())[3 + attempts];
      await (await instance3.connect(tempPlayer).wager({ value: betLimit })).wait();
      await ethers.provider.send("evm_mine", []);

      // Compute expected winningNumber for this block
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber - 1);
      const blockHash = block.hash;
      const winningNumber = (BigInt(blockHash) % 4n) + 1n;

      if (winningNumber === 1n) {
        // This is the case: original loses (1 != 2), mutant wins (1 <= 2)
        found = true;
        
        // Attempt to play - expect revert on original (player has no wager anymore?)
        // Actually player still has wager because we haven't played yet
        // Let's play with this player
        const tx = instance3.connect(tempPlayer).play();
        
        // In the original contract, this would revert because winningNumber != 2
        // In the mutant, it would succeed and send payout
        // Since we're testing the mutant, we expect it to succeed (kill the mutant)
        // But we need to verify behavior - we expect success for the mutant
        await expect(tx).to.not.be.reverted;
        
        // Additional verification: check that balance decreased (payout happened)
        const balanceAfter = await ethers.provider.getBalance(instance3.target);
        expect(balanceAfter).to.be.lessThan(ethers.parseEther("1"));
      }
      attempts++;
    }
    expect(found).to.be.true;
  });
});