import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m430ce10b test", function () {
  it("should kill mutant by calling play() exactly one block after wager()", async function () {
    const [owner, player] = await ethers.getSigners();

    // Deploy with constructor arguments: whale address and bet limit
    const betLimit = ethers.parseEther("1.0");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(player.address, betLimit);
    await instance.waitForDeployment();

    // Owner opens to public
    await (await instance.connect(owner).OpenToThePublic()).wait();

    // Set difficulty to a known value so we can compute winning conditions if needed
    await (await instance.connect(owner).AdjustDifficulty(10)).wait();

    // Player makes a wager in block N
    const txWager = await instance.connect(player).wager({ value: betLimit });
    const receiptWager = await txWager.wait();
    const wagerBlockNumber = receiptWager.blockNumber;

    // Mine one additional block to be in block N+1
    await ethers.provider.send("evm_mine", []);

    // Verify we are now in block N+1
    const currentBlock = await ethers.provider.getBlockNumber();
    expect(currentBlock).to.equal(wagerBlockNumber + 1);

    // Attempt to play - this should pass on original (blockNumber < block.number)
    // but should fail/revert on mutant (blockNumber < block.number-1 is false when blockNumber == block.number-1)
    await expect(
      instance.connect(player).play()
    ).to.be.reverted;
  });
});