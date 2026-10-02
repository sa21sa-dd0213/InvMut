import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - m67b0c41a", function () {
  it("should detect mutant that changes difficulty / 2 to difficulty + 2 in winning condition", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy with whale address and bet limit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(owner.address, betLimit);
    await instance.waitForDeployment();

    // Open the contract to the public
    await (await instance.OpenToThePublic()).wait();

    // Set difficulty to an even number (e.g., 10)
    const difficulty = 10;
    await (await instance.AdjustDifficulty(difficulty)).wait();

    // Player makes a wager
    const wagerTx = await instance.connect(player).wager({ value: betLimit });
    await wagerTx.wait();

    // Mine a block to advance block.number so timestamps[player] < block.number
    await ethers.provider.send("evm_mine", []);

    // Now play - in original contract there is a chance to win (1/difficulty)
    // In mutant, winningNumber == difficulty + 2 can never happen because
    // winningNumber is modulo difficulty (range 1 to difficulty)
    // So player will always lose in mutant, never emit Win event
    
    // Check that Win event is NOT emitted (mutant kills the win condition)
    await expect(instance.connect(player).play()).to.not.emit(instance, "Win");
    
    // Additionally verify Lose event is emitted (always loses in mutant)
    await expect(instance.connect(player).play()).to.emit(instance, "Lose");
  });
});