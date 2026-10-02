import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m4e2dc3a3 - Win event emission", function () {
  it("should emit Win event when player wins the game", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy with constructor arguments: whaleAddress, wagerLimit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(owner.address, betLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await (await instance.OpenToThePublic()).wait();
    
    // Set difficulty to ensure predictable win condition
    // winningNumber == difficulty / 2 -> we set difficulty = 2, so winningNumber must be 1
    await (await instance.AdjustDifficulty(2)).wait();
    
    // Player places a wager
    await (await instance.connect(player).wager({ value: betLimit })).wait();
    
    // Mine a block to ensure block.number > timestamps[player]
    await ethers.provider.send("evm_mine", []);
    
    // Play the game - this should result in a win
    const tx = await instance.connect(player).play();
    const receipt = await tx.wait();
    
    // Check that Win event was emitted
    await expect(tx).to.emit(instance, "Win");
  });
});