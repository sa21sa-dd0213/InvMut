import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant mb13e6b90 - kill with winning number equals difficulty/2", function () {
  it("should pay out when winningNumber == difficulty/2, but mutant would lose", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Owner opens to public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty to 10 (so difficulty/2 = 5)
    await instance.connect(owner).AdjustDifficulty(10);

    // Player wagers exactly betLimit
    await instance.connect(player).wager({ value: betLimit });

    // Record the block number of the wager
    const wagerBlock = await ethers.provider.getBlockNumber();

    // Advance at least one block so block.number > wagerBlock
    await ethers.provider.send("evm_mine", []);

    // Compute what winningNumber would be: keccak256(blockhash(wagerBlock), player) % 10 + 1
    // We need to force winningNumber == 5 (difficulty/2). We can't control blockhash directly,
    // so we mine blocks until we get the desired result.
    let found = false;
    let attempts = 0;
    const maxAttempts = 100;
    let currentWagerBlock = wagerBlock;
    
    while (!found && attempts < maxAttempts) {
      // Get the blockhash of the wager block
      const block = await ethers.provider.getBlock(currentWagerBlock);
      const blockHash = block!.hash;
      const encoded = ethers.solidityPacked(
        ["bytes32", "address"],
        [blockHash, player.address]
      );
      const hash = ethers.keccak256(encoded);
      const winningNumber = (BigInt(hash) % 10n) + 1n;

      if (winningNumber === 5n) {
        found = true;
        break;
      } else {
        // Mine another block and try again (wager again to get new block)
        await ethers.provider.send("evm_mine", []);
        // Need to wager again because timestamps[player] was set to previous block
        await instance.connect(player).wager({ value: betLimit });
        // Update wagerBlock to new block
        currentWagerBlock = await ethers.provider.getBlockNumber();
        // Advance one more block
        await ethers.provider.send("evm_mine", []);
        attempts++;
      }
    }
    expect(found).to.be.true;

    // Now play - should trigger win in original, but mutant would lose
    const balanceBefore = await ethers.provider.getBalance(player.address);
    const contractBalanceBefore = await ethers.provider.getBalance(
      instance.target
    );

    const tx = await instance.connect(player).play();
    const receipt = await tx.wait();

    // In original: player should receive half contract balance
    const expectedWin = contractBalanceBefore / 2n;
    const balanceAfter = await ethers.provider.getBalance(player.address);
    const contractBalanceAfter = await ethers.provider.getBalance(
      instance.target
    );

    // Original would emit Win event with expectedWin
    // Mutant would emit Lose event and send betLimit/2 to whale
    // So we check player didn't lose money (mutant would reduce player balance by gas only)
    // In original, player gains expectedWin - gas; in mutant, player just loses gas
    // Better: check Win event was emitted
    const winEvents = await instance.queryFilter(
      instance.filters.Win(),
      receipt!.blockNumber,
      receipt!.blockNumber
    );

    // Original should have a Win event; mutant would not
    expect(winEvents.length).to.equal(1);
    expect(winEvents[0].args.amount).to.equal(expectedWin);
    expect(winEvents[0].args.paidTo).to.equal(player.address);

    // Also verify no Lose event emitted
    const loseEvents = await instance.queryFilter(
      instance.filters.Lose(),
      receipt!.blockNumber,
      receipt!.blockNumber
    );
    expect(loseEvents.length).to.equal(0);
  });
});