import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m709a52a2 detection", function () {
  it("should kill the mutant by detecting the block.number+1 change in wager function", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    
    // Deploy with whale address and bet limit
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();
    
    // Owner opens the contract to public
    await (await instance.connect(owner).OpenToThePublic()).wait();
    
    // Set difficulty to a value that makes the game playable (e.g., 10)
    await (await instance.connect(owner).AdjustDifficulty(10)).wait();
    
    // Player places a wager in block N
    const wagerTx = await instance.connect(player).wager({ value: betLimit });
    const wagerReceipt = await wagerTx.wait();
    const wagerBlockNumber = wagerReceipt.blockNumber;
    
    // Mine a new block to move to block N+1
    await ethers.provider.send("evm_mine", []);
    
    // In the original contract, calling play() in block N+1 should succeed
    // In the mutant, timestamps[player] = block.number+1 from wager block,
    // so in block N+1, blockNumber (which is N+1) is NOT < block.number (N+1)
    // causing a revert, thus killing the mutant
    await expect(
      instance.connect(player).play()
    ).to.not.be.reverted;
  });
});